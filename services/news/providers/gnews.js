async function fetchArticles(query, apiKey) {
    const url = new URL('https://gnews.io/api/v4/search');
    url.searchParams.set('q', query);
    url.searchParams.set('token', apiKey);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('max', '10');

    const response = await globalThis.fetch(url.toString());
    if (!response.ok) {
        throw new Error(`GNews returned ${response.status}`);
    }
    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    return articles.map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source && a.source.name,
        publishedAt: a.publishedAt,
    }));
}

module.exports = { name: 'gnews', fetch: fetchArticles };
