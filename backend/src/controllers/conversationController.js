const conversationService = require('../services/conversationService');

const getConversations = async (req, res, next) => {
  try {
    const conversations = await conversationService.getUserConversations(req.user._id);
    return res.status(200).json({ success: true, conversations });
  } catch (error) {
    return next(error);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const conversation = await conversationService.getConversationById(req.params.id, req.user._id);
    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const startDirect = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId is required.' });
    const conversation = await conversationService.getOrCreateDirect(req.user._id, targetUserId);
    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const { name, memberIds = [] } = req.body;
    const conversation = await conversationService.createGroup(req.user._id, { name, memberIds });
    return res.status(201).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const conversation = await conversationService.updateGroup(req.params.id, req.user._id, req.body);
    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    await conversationService.deleteGroup(req.params.id, req.user._id);
    return res.status(200).json({ success: true, message: 'Group deleted.' });
  } catch (error) {
    return next(error);
  }
};

const addMembers = async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    const conversation = await conversationService.addMembers(req.params.id, req.user._id, memberIds || []);
    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const conversation = await conversationService.removeMember(req.params.id, req.user._id, req.params.userId);
    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const assignAdmin = async (req, res, next) => {
  try {
    const conversation = await conversationService.assignAdmin(req.params.id, req.user._id, req.params.userId);
    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

const removeAdmin = async (req, res, next) => {
  try {
    const conversation = await conversationService.removeAdmin(req.params.id, req.user._id, req.params.userId);
    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getConversations, getConversation, startDirect, createGroup,
  updateGroup, deleteGroup, addMembers, removeMember, assignAdmin, removeAdmin,
};
