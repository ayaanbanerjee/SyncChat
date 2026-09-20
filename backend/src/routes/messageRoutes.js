const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMessages, sendMessage, sendFile, editMessage, deleteMessage, searchMessages, upload } = require('../controllers/messageController');

const router = express.Router();

router.use(protect);

router.get('/search', searchMessages);
router.get('/:conversationId', getMessages);
router.post('/:conversationId', sendMessage);
router.post('/:conversationId/file', upload.single('file'), sendFile);
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);

module.exports = router;
