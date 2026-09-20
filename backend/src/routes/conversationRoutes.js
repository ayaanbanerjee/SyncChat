const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getConversations, getConversation, startDirect, createGroup,
  updateGroup, deleteGroup, addMembers, removeMember, assignAdmin, removeAdmin,
} = require('../controllers/conversationController');

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.get('/:id', getConversation);
router.post('/direct', startDirect);
router.post('/group', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/members', addMembers);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/admins/:userId', assignAdmin);
router.delete('/:id/admins/:userId', removeAdmin);

module.exports = router;
