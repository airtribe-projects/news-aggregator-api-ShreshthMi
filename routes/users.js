const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', userController.signup);
router.post('/login', userController.login);

router.get('/preferences', requireAuth, userController.getPreferences);
router.put('/preferences', requireAuth, userController.updatePreferences);

module.exports = router;
