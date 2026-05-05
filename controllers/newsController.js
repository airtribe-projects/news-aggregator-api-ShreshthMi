const userStore = require('../store/userStore');
const newsService = require('../services/news');

async function getNews(req, res, next) {
    try {
        const user = userStore.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const news = await newsService.fetchNews(user.preferences);
        return res.status(200).json({ news });
    } catch (err) {
        return next(err);
    }
}

module.exports = { getNews };
