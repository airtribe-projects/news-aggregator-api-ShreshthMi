const express = require('express');
const newsController = require('../controllers/newsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, newsController.getNews);

module.exports = router;
