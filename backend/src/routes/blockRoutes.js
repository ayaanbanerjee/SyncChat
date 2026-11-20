const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { blockUser, unblockUser, getBlockedUsers } = require('../controllers/blockController');

const router = express.Router();
router.use(protect);

router.get('/', getBlockedUsers);
router.post('/:userId', blockUser);
router.delete('/:userId', unblockUser);

module.exports = router;
