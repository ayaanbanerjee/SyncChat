const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');

// Get or create a direct conversation between two users
const getOrCreateDirect = async (userId, targetUserId) => {
  if (userId.toString() === targetUserId.toString()) {
    const error = new Error('Cannot start a conversation with yourself.');
    error.statusCode = 400;
    throw error;
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check if a direct conversation already exists between these two users
  let conversation = await Conversation.findOne({
    type: 'direct',
    members: { $all: [userId, targetUserId], $size: 2 },
  }).populate('members', 'name username avatar lastSeen');

  if (!conversation) {
    conversation = await Conversation.create({
      type: 'direct',
      members: [userId, targetUserId],
    });
    conversation = await conversation.populate('members', 'name username avatar lastSeen');
  }

  return conversation;
};

// Create a group conversation
const createGroup = async (userId, { name, memberIds, groupImage }) => {
  if (!name || !name.trim()) {
    const error = new Error('Group name is required.');
    error.statusCode = 400;
    throw error;
  }

  // Deduplicate and always include the creator
  const uniqueMembers = [...new Set([userId.toString(), ...memberIds.map(String)])];

  const conversation = await Conversation.create({
    type: 'group',
    name: name.trim(),
    groupImage: groupImage || '',
    createdBy: userId,
    admins: [userId],
    members: uniqueMembers,
  });

  return conversation.populate('members', 'name username avatar lastSeen');
};

// Get all conversations for a user, sorted by most recent message
const getUserConversations = async (userId) => {
  return Conversation.find({ members: userId })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate('members', 'name username avatar lastSeen')
    .populate({
      path: 'lastMessage',
      select: 'text type sender createdAt isDeleted',
      populate: { path: 'sender', select: 'name username' },
    });
};

const getConversationById = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({ _id: conversationId, members: userId })
    .populate('members', 'name username avatar lastSeen')
    .populate('admins', 'name username avatar');

  if (!conversation) {
    const error = new Error('Conversation not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  return conversation;
};

// Group management
const addMembers = async (conversationId, requesterId, newMemberIds) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') {
    const error = new Error('Group not found.'); error.statusCode = 404; throw error;
  }
  if (!conversation.admins.map(String).includes(requesterId.toString())) {
    const error = new Error('Only admins can add members.'); error.statusCode = 403; throw error;
  }
  const toAdd = newMemberIds.filter((id) => !conversation.members.map(String).includes(id.toString()));
  conversation.members.push(...toAdd);
  await conversation.save();
  return conversation.populate('members', 'name username avatar lastSeen');
};

const removeMember = async (conversationId, requesterId, targetUserId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') {
    const error = new Error('Group not found.'); error.statusCode = 404; throw error;
  }
  const isAdmin = conversation.admins.map(String).includes(requesterId.toString());
  const isSelf = requesterId.toString() === targetUserId.toString();
  if (!isAdmin && !isSelf) {
    const error = new Error('Not authorized.'); error.statusCode = 403; throw error;
  }
  conversation.members = conversation.members.filter((m) => m.toString() !== targetUserId.toString());
  conversation.admins = conversation.admins.filter((a) => a.toString() !== targetUserId.toString());
  await conversation.save();
  return conversation.populate('members', 'name username avatar lastSeen');
};

const assignAdmin = async (conversationId, requesterId, targetUserId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') {
    const error = new Error('Group not found.'); error.statusCode = 404; throw error;
  }
  if (!conversation.admins.map(String).includes(requesterId.toString())) {
    const error = new Error('Only admins can assign admins.'); error.statusCode = 403; throw error;
  }
  if (!conversation.admins.map(String).includes(targetUserId.toString())) {
    conversation.admins.push(targetUserId);
    await conversation.save();
  }
  return conversation;
};

const removeAdmin = async (conversationId, requesterId, targetUserId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') {
    const error = new Error('Group not found.'); error.statusCode = 404; throw error;
  }
  if (!conversation.admins.map(String).includes(requesterId.toString())) {
    const error = new Error('Only admins can remove admins.'); error.statusCode = 403; throw error;
  }
  conversation.admins = conversation.admins.filter((a) => a.toString() !== targetUserId.toString());
  await conversation.save();
  return conversation;
};

const updateGroup = async (conversationId, requesterId, updates) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') {
    const error = new Error('Group not found.'); error.statusCode = 404; throw error;
  }
  if (!conversation.admins.map(String).includes(requesterId.toString())) {
    const error = new Error('Only admins can update group info.'); error.statusCode = 403; throw error;
  }
  if (updates.name) conversation.name = updates.name.trim();
  if (updates.groupImage !== undefined) conversation.groupImage = updates.groupImage;
  await conversation.save();
  return conversation.populate('members', 'name username avatar lastSeen');
};

const deleteGroup = async (conversationId, requesterId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') {
    const error = new Error('Group not found.'); error.statusCode = 404; throw error;
  }
  if (!conversation.admins.map(String).includes(requesterId.toString())) {
    const error = new Error('Only admins can delete the group.'); error.statusCode = 403; throw error;
  }
  await Message.deleteMany({ conversationId });
  await conversation.deleteOne();
};

module.exports = {
  getOrCreateDirect,
  createGroup,
  getUserConversations,
  getConversationById,
  addMembers,
  removeMember,
  assignAdmin,
  removeAdmin,
  updateGroup,
  deleteGroup,
};
