const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userStore = require('../store/userStore');

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const jwtSecret = () => process.env.JWT_SECRET || 'dev-fallback-secret-change-me';
const jwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '1h';

async function signup(req, res, next) {
    try {
        const { name, email, password, preferences } = req.body || {};

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required' });
        }
        if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: 'A valid email is required' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (userStore.findByEmail(email)) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = userStore.create({
            name,
            email,
            passwordHash,
            preferences: Array.isArray(preferences) ? preferences : [],
        });

        return res.status(200).json({
            message: 'Signup successful',
            user: { name: user.name, email: user.email, preferences: user.preferences },
        });
    } catch (err) {
        return next(err);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const user = userStore.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ email: user.email }, jwtSecret(), { expiresIn: jwtExpiresIn() });
        return res.status(200).json({ token });
    } catch (err) {
        return next(err);
    }
}

async function getPreferences(req, res, next) {
    try {
        const user = userStore.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ preferences: user.preferences });
    } catch (err) {
        return next(err);
    }
}

async function updatePreferences(req, res, next) {
    try {
        const { preferences } = req.body || {};
        if (!Array.isArray(preferences) || !preferences.every((p) => typeof p === 'string')) {
            return res.status(400).json({ error: 'preferences must be an array of strings' });
        }
        const user = userStore.updatePreferences(req.user.email, preferences);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ preferences: user.preferences });
    } catch (err) {
        return next(err);
    }
}

module.exports = { signup, login, getPreferences, updatePreferences };
