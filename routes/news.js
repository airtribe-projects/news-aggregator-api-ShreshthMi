const express = require('express');
const newsController = require('../controllers/newsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Specific paths first so they don't get shadowed by /:id/...
router.get('/read', requireAuth, newsController.getRead);
router.get('/favorites', requireAuth, newsController.getFavorites);
router.get('/search/:keyword', requireAuth, newsController.searchNews);

router.get('/', requireAuth, newsController.getNews);

router.post('/:id/read', requireAuth, newsController.markRead);
router.post('/:id/favorite', requireAuth, newsController.markFavorite);

module.exports = router;
