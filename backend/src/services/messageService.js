const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const PAGE_SIZE = 30;

// Load messages with cursor-based pagination (older messages on scroll up)
const getMessages = async (conversationId, userId, cursor) => {
  const conversation = await Conversation.findOne({ _id: conversationId, members: userId });
  if (!conversation) {
    const error = new Error('Conversation not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const query = { conversationId, isDeleted: false };
  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE + 1)
    .populate('sender', 'name username avatar')
    .populate({ path: 'replyTo', select: 'text sender type', populate: { path: 'sender', select: 'name username' } });

  const hasMore = messages.length > PAGE_SIZE;
  if (hasMore) messages.pop();

  return { messages: messages.reverse(), hasMore };
};

const sendMessage = async ({ conversationId, senderId, text, type = 'text', replyTo, fileData }) => {
  const conversation = await Conversation.findOne({ _id: conversationId, members: senderId });
  if (!conversation) {
    const error = new Error('Conversation not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const messageData = { conversationId, sender: senderId, type, replyTo: replyTo || null };

  if (type === 'text') {
    if (!text || !text.trim()) {
      const error = new Error('Message text is required.'); error.statusCode = 400; throw error;
    }
    messageData.text = text.trim();
  } else {
    Object.assign(messageData, fileData);
  }

  const message = await Message.create(messageData);

  // Update conversation's last message pointer
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastMessageAt: message.createdAt,
  });

  return message.populate([
    { path: 'sender', select: 'name username avatar' },
    { path: 'replyTo', select: 'text sender type', populate: { path: 'sender', select: 'name username' } },
  ]);
};

const uploadFile = (senderId, fileBuffer, mimeType, originalName) => {
  return new Promise((resolve, reject) => {
    const isImage = mimeType.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'syncchat/files', resource_type: resourceType, use_filename: true, unique_filename: true },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          fileUrl: result.secure_url,
          fileName: originalName,
          fileSize: result.bytes,
          mimeType,
        });
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

const editMessage = async (messageId, userId, newText) => {
  const message = await Message.findOne({ _id: messageId, sender: userId, type: 'text', isDeleted: false });
  if (!message) {
    const error = new Error('Message not found or not editable.'); error.statusCode = 404; throw error;
  }
  message.text = newText.trim();
  message.isEdited = true;
  await message.save();
  return message.populate('sender', 'name username avatar');
};

const deleteMessage = async (messageId, userId) => {
  const message = await Message.findOne({ _id: messageId, sender: userId });
  if (!message) {
    const error = new Error('Message not found.'); error.statusCode = 404; throw error;
  }
  message.isDeleted = true;
  message.text = '';
  await message.save();
  return message;
};

const markDelivered = async (messageId, userId) => {
  return Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { deliveredTo: userId } },
    { new: true }
  );
};

const markRead = async (conversationId, userId) => {
  await Message.updateMany(
    { conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
};

const searchMessages = async (query, userId) => {
  if (!query || query.trim().length < 2) return [];

  // Only search in conversations the user is a member of
  const conversations = await Conversation.find({ members: userId }).select('_id');
  const conversationIds = conversations.map((c) => c._id);

  return Message.find({
    conversationId: { $in: conversationIds },
    isDeleted: false,
    $text: { $search: query.trim() },
  })
    .select('text conversationId sender createdAt')
    .populate('sender', 'name username avatar')
    .sort({ score: { $meta: 'textScore' } })
    .limit(30);
};

module.exports = { getMessages, sendMessage, uploadFile, editMessage, deleteMessage, markDelivered, markRead, searchMessages };
