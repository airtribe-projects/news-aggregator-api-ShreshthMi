const cache = require('./cache');

const providers = {
    gnews: require('./providers/gnews'),
};

function getProvider() {
    const name = process.env.NEWS_PROVIDER || 'gnews';
    const provider = providers[name];
    if (!provider) {
        throw new Error(`Unknown news provider: ${name}`);
    }
    return provider;
}

function buildQuery(preferences) {
    if (!Array.isArray(preferences) || preferences.length === 0) {
        return 'news';
    }
    return preferences.join(' OR ');
}

function cacheKeyFor(preferences) {
    const provider = getProvider();
    const sorted = Array.isArray(preferences) ? [...preferences].sort() : [];
    return `${provider.name}:${buildQuery(sorted)}`;
}

async function fetchNews(preferences) {
    const provider = getProvider();
    const apiKey = process.env.NEWS_API_KEY;
    const query = buildQuery(preferences);
    const cacheKey = cacheKeyFor(preferences);
    const ttl = Number(process.env.NEWS_CACHE_TTL_SECONDS) || 600;

    const cached = cache.get(cacheKey);
    if (cached) return cached;

    if (!apiKey) {
        console.warn(`[news] ${provider.name} API key is not configured; returning empty results`);
        return [];
    }

    try {
        const articles = await provider.fetch(query, apiKey);
        cache.set(cacheKey, articles, ttl);
        return articles;
    } catch (err) {
        const wrapped = new Error(`Upstream news provider failed: ${err.message}`);
        wrapped.status = 502;
        throw wrapped;
    }
}

function invalidatePreferences(preferences) {
    cache.delete(cacheKeyFor(preferences));
}

module.exports = { fetchNews, invalidatePreferences };
