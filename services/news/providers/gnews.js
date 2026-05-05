const axios = require('axios');

async function fetchArticles(query, apiKey) {
    const response = await axios.get('https://gnews.io/api/v4/search', {
        params: {
            q: query,
            token: apiKey,
            lang: 'en',
            max: 10,
        },
    });
    const articles = Array.isArray(response.data.articles) ? response.data.articles : [];
    return articles.map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source && a.source.name,
        publishedAt: a.publishedAt,
    }));
}

module.exports = { name: 'gnews', fetch: fetchArticles };
