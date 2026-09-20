const messageService = require('../services/messageService');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('File type not allowed.'));
  },
});

const getMessages = async (req, res, next) => {
  try {
    const { cursor } = req.query;
    const { messages, hasMore } = await messageService.getMessages(req.params.conversationId, req.user._id, cursor);
    return res.status(200).json({ success: true, messages, hasMore });
  } catch (error) {
    return next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { text, replyTo } = req.body;
    const message = await messageService.sendMessage({
      conversationId: req.params.conversationId,
      senderId: req.user._id,
      text,
      type: 'text',
      replyTo,
    });
    // Emit via socket (io is attached to app)
    const io = req.app.get('io');
    if (io) io.to(req.params.conversationId).emit('message:new', message);
    return res.status(201).json({ success: true, message });
  } catch (error) {
    return next(error);
  }
};

const sendFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const fileData = await messageService.uploadFile(
      req.user._id, req.file.buffer, req.file.mimetype, req.file.originalname
    );
    const type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';

    const message = await messageService.sendMessage({
      conversationId: req.params.conversationId,
      senderId: req.user._id,
      type,
      fileData,
    });

    const io = req.app.get('io');
    if (io) io.to(req.params.conversationId).emit('message:new', message);
    return res.status(201).json({ success: true, message });
  } catch (error) {
    return next(error);
  }
};

const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required.' });
    const message = await messageService.editMessage(req.params.messageId, req.user._id, text);
    const io = req.app.get('io');
    if (io) io.to(message.conversationId.toString()).emit('message:edited', message);
    return res.status(200).json({ success: true, message });
  } catch (error) {
    return next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const message = await messageService.deleteMessage(req.params.messageId, req.user._id);
    const io = req.app.get('io');
    if (io) io.to(message.conversationId.toString()).emit('message:deleted', { messageId: message._id, conversationId: message.conversationId });
    return res.status(200).json({ success: true, message: 'Message deleted.' });
  } catch (error) {
    return next(error);
  }
};

const searchMessages = async (req, res, next) => {
  try {
    const { q } = req.query;
    const messages = await messageService.searchMessages(q, req.user._id);
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMessages, sendMessage, sendFile, editMessage, deleteMessage, searchMessages, upload };
