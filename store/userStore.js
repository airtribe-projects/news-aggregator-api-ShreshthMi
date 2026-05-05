const users = new Map();

function findByEmail(email) {
    return users.get(email.toLowerCase()) || null;
}

function create({ name, email, passwordHash, preferences = [] }) {
    const key = email.toLowerCase();
    const user = {
        name,
        email: key,
        passwordHash,
        preferences,
        readArticles: new Set(),
        favoriteArticles: new Set(),
    };
    users.set(key, user);
    return user;
}

function updatePreferences(email, preferences) {
    const user = findByEmail(email);
    if (!user) return null;
    user.preferences = preferences;
    return user;
}

function markRead(email, articleId) {
    const user = findByEmail(email);
    if (!user) return null;
    user.readArticles.add(articleId);
    return user;
}

function markFavorite(email, articleId) {
    const user = findByEmail(email);
    if (!user) return null;
    user.favoriteArticles.add(articleId);
    return user;
}

function allUsers() {
    return Array.from(users.values());
}

module.exports = {
    findByEmail,
    create,
    updatePreferences,
    markRead,
    markFavorite,
    allUsers,
};
