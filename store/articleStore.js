const crypto = require('crypto');

const articles = new Map();

function idFor(article) {
    return crypto.createHash('sha1').update(article.url).digest('hex').slice(0, 12);
}

function register(article) {
    if (!article || !article.url) return article;
    const id = idFor(article);
    const enriched = { ...article, id };
    articles.set(id, enriched);
    return enriched;
}

function get(id) {
    return articles.get(id) || null;
}

module.exports = { register, get };
