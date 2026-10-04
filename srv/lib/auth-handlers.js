const cds = require('@sap/cds');
const bcrypt = require('bcryptjs');
const { NAMESPACE, PASSWORD_REGEX, BCRYPT_SALT_ROUNDS, EMAIL_REGEX } = require('./constants');

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

async function register(req) {
    const { Users } = cds.entities(NAMESPACE);
    const email = normalizeEmail(req.data.email);
    const { password } = req.data;

    if (!email || !password) {
        return req.error(400, 'Email and password are required.');
    }

    if (!EMAIL_REGEX.test(email)) {
        return req.error(400, 'Please provide a valid email address.');
    }

    if (!PASSWORD_REGEX.test(password)) {
        return req.error(
            400,
            'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a digit, and a special character.'
        );
    }

    const existing = await SELECT.one.from(Users).where({ email });
    if (existing) {
        return req.error(409, 'This email address is already registered.');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await INSERT.into(Users).entries({ email, passwordHash });

    return { success: true, message: 'Registration successful.', email };
}

async function login(req) {
    const { Users } = cds.entities(NAMESPACE);
    const email = normalizeEmail(req.data.email);
    const { password } = req.data;

    if (!email || !password) {
        return req.error(400, 'Email and password are required.');
    }

    // Fall back to the raw value so accounts created before normalization can still log in.
    const user = await SELECT.one.from(Users).where({ email })
        || await SELECT.one.from(Users).where({ email: req.data.email });
    // Keep the same error response for unknown users and incorrect passwords.
    if (!user) {
        return req.error(400, 'Invalid email or password.');
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        return req.error(400, 'Invalid email or password.');
    }

    return { success: true, message: 'Login successful.', email: user.email };
}

module.exports = { register, login, normalizeEmail };
