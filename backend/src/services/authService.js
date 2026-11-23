const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 12;

async function registerUser({ full_name, email, password }) {
    const normalizedEmail = email.toLowerCase();

    const existing = await pool.query(
        `SELECT user_id FROM app_user WHERE email = $1`,
        [normalizedEmail]
    );

    if (existing.rows.length > 0) {
        throw new Error("EMAIL_EXISTS");
    }

    const passwordHash = await bcrypt.hash(
        password,
        SALT_ROUNDS
    );

    const result = await pool.query(
        `INSERT INTO app_user
            (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING user_id, full_name, email, created_at`,
        [full_name, normalizedEmail, passwordHash]
    );

    return result.rows[0];
}

async function loginUser({ email, password }) {
    const normalizedEmail = email.toLowerCase();

    const result = await pool.query(
        `SELECT user_id, full_name, email, password_hash, is_active
         FROM app_user
         WHERE email = $1`,
        [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatch) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d",
        }
    );

    return {
        user: {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
        },
        token,
    };
}

async function updateAccount(userId, data) {
    const fields = [];
    const values = [userId];
    if (Object.hasOwn(data, "full_name")) {
        values.push(data.full_name);
        fields.push(`full_name=$${values.length}`);
    }
    if (!fields.length) {
        const current = await pool.query(
            `SELECT user_id,full_name,email,created_at FROM app_user WHERE user_id=$1 AND is_active=TRUE`,
            [userId]
        );
        return current.rows[0] || null;
    }
    fields.push(`updated_at=CURRENT_TIMESTAMP`);
    const result = await pool.query(
        `UPDATE app_user SET ${fields.join(", ")} WHERE user_id=$1 AND is_active=TRUE
     RETURNING user_id,full_name,email,created_at,updated_at`,
        values
    );
    return result.rows[0] || null;
}

async function changePassword(userId, currentPassword, newPassword) {
    const result = await pool.query(
        `SELECT password_hash,is_active FROM app_user WHERE user_id=$1`,
        [userId]
    );
    if (!result.rowCount || !result.rows[0].is_active) {
        const error = new Error("INVALID_CREDENTIALS");
        error.statusCode = 401;
        throw error;
    }
    const matches = await bcrypt.compare(
        currentPassword,
        result.rows[0].password_hash
    );
    if (!matches) {
        const error = new Error("INVALID_CREDENTIALS");
        error.statusCode = 401;
        throw error;
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(
        `UPDATE app_user SET password_hash=$2,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1`,
        [userId, passwordHash]
    );
    return true;
}

module.exports = {
    registerUser,
    loginUser,
    updateAccount,
    changePassword,
};