const cache = require('./cache');
const userStore = require('../../store/userStore');

const providers = {
    gnews: require('./providers/gnews'),
};

let refreshTimer = null;

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

async function refreshAll() {
    const seen = new Set();
    let refreshed = 0;
    for (const user of userStore.allUsers()) {
        const key = cacheKeyFor(user.preferences);
        if (seen.has(key)) continue;
        seen.add(key);
        cache.delete(key);
        try {
            await fetchNews(user.preferences);
            refreshed += 1;
        } catch (err) {
            console.warn(`[refresh] failed for ${key}: ${err.message}`);
        }
    }
    console.log(`[refresh] refreshed ${refreshed} cache entr${refreshed === 1 ? 'y' : 'ies'}`);
    return refreshed;
}

function startPeriodicRefresh(intervalMs = 5 * 60 * 1000) {
    if (refreshTimer) return;
    refreshTimer = setInterval(() => {
        refreshAll().catch((err) => console.error('[refresh] error:', err));
    }, intervalMs);
}

function stopPeriodicRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

module.exports = {
    fetchNews,
    invalidatePreferences,
    refreshAll,
    startPeriodicRefresh,
    stopPeriodicRefresh,
};
