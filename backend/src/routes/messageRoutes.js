const express = require('express');
const { getMessages, createMessage, healthCheck } = require('../controllers/messageController');
const { getOnlineUsers } = require('../controllers/userController');

const router = express.Router();

router.get('/messages', getMessages);
router.post('/messages', createMessage);
router.get('/users/online', getOnlineUsers);
router.get('/health', healthCheck);

module.exports = router;
