const cds = require('@sap/cds');
const bcrypt = require('bcryptjs');
const { NAMESPACE, PASSWORD_REGEX, BCRYPT_SALT_ROUNDS } = require('./constants');

async function register(req) {
    const { Users } = cds.entities(NAMESPACE);
    const { email, password } = req.data;

    if (!email || !password) {
        return req.error(400, 'Email and password are required.');
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
    const { email, password } = req.data;

    if (!email || !password) {
        return req.error(400, 'Email and password are required.');
    }

    const user = await SELECT.one.from(Users).where({ email });
    // Keep the same error response for unknown users and incorrect passwords.
    if (!user) {
        return req.error(400, 'Invalid email or password.');
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        return req.error(400, 'Invalid email or password.');
    }

    return { success: true, message: 'Login successful.', email };
}

module.exports = { register, login };
