const express = require('express');
const multer = require('multer');
const { searchUsers, getUserProfile, updateProfile, uploadAvatar } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// multer: store file in memory, validate type and size
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed for avatars.'));
  },
});

router.get('/search', protect, searchUsers);
// /me routes MUST come before /:username — otherwise Express matches 'me' as a username
router.put('/me/profile', protect, updateProfile);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);
router.get('/:username', protect, getUserProfile);

module.exports = router;
