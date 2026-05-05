const userStore = require('../store/userStore');
const articleStore = require('../store/articleStore');
const newsService = require('../services/news');

async function getNews(req, res, next) {
    try {
        const user = userStore.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const articles = await newsService.fetchNews(user.preferences);
        const enriched = articles.map((a) => articleStore.register(a));
        return res.status(200).json({ news: enriched });
    } catch (err) {
        return next(err);
    }
}

async function markRead(req, res, next) {
    try {
        const { id } = req.params;
        const article = articleStore.get(id);
        if (!article) {
            return res.status(404).json({
                error: 'Article not found. Call GET /news first so the article store is populated.',
            });
        }
        userStore.markRead(req.user.email, id);
        return res.status(200).json({ message: 'Article marked as read', article });
    } catch (err) {
        return next(err);
    }
}

async function markFavorite(req, res, next) {
    try {
        const { id } = req.params;
        const article = articleStore.get(id);
        if (!article) {
            return res.status(404).json({
                error: 'Article not found. Call GET /news first so the article store is populated.',
            });
        }
        userStore.markFavorite(req.user.email, id);
        return res.status(200).json({ message: 'Article marked as favorite', article });
    } catch (err) {
        return next(err);
    }
}

async function searchNews(req, res, next) {
    try {
        const keyword = (req.params.keyword || '').trim();
        if (!keyword) {
            return res.status(400).json({ error: 'Search keyword is required' });
        }
        const articles = await newsService.fetchNews([keyword]);
        const enriched = articles.map((a) => articleStore.register(a));
        return res.status(200).json({ news: enriched });
    } catch (err) {
        return next(err);
    }
}

async function getRead(req, res, next) {
    try {
        const user = userStore.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const articles = Array.from(user.readArticles)
            .map((id) => articleStore.get(id))
            .filter(Boolean);
        return res.status(200).json({ read: articles });
    } catch (err) {
        return next(err);
    }
}

async function getFavorites(req, res, next) {
    try {
        const user = userStore.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const articles = Array.from(user.favoriteArticles)
            .map((id) => articleStore.get(id))
            .filter(Boolean);
        return res.status(200).json({ favorites: articles });
    } catch (err) {
        return next(err);
    }
}

module.exports = { getNews, searchNews, markRead, markFavorite, getRead, getFavorites };
