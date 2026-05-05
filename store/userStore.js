const users = new Map();

function findByEmail(email) {
    return users.get(email.toLowerCase()) || null;
}

function create({ name, email, passwordHash, preferences = [] }) {
    const key = email.toLowerCase();
    const user = { name, email: key, passwordHash, preferences };
    users.set(key, user);
    return user;
}

function updatePreferences(email, preferences) {
    const user = findByEmail(email);
    if (!user) return null;
    user.preferences = preferences;
    return user;
}

module.exports = { findByEmail, create, updatePreferences };
