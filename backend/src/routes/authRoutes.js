const express = require('express');
const { register, login, guestLogin, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
