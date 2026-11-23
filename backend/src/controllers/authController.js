const authService = require("../services/authService");

async function register(req, res) {
    try {
        const user = await authService.registerUser(req.body);

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user,
        });

    } catch (error) {
        if (error.message === "EMAIL_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Could not create account",
        });
    }
}

async function login(req, res) {
    try {
        const result = await authService.loginUser(req.body);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            ...result,
        });

    } catch (error) {
        if (error.message === "INVALID_CREDENTIALS") {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
}

async function getMe(req, res) {
    try {
        const pool = require("../config/db");

        const result = await pool.query(
            `SELECT user_id, full_name, email, created_at
             FROM app_user
             WHERE user_id = $1
               AND is_active = TRUE`,
            [req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User account is inactive or unavailable",
            });
        }

        return res.json({
            success: true,
            user: result.rows[0],
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve user",
        });
    }
}

async function updateMe(req, res, next) {
    try {
        const user = await authService.updateAccount(req.user.user_id, req.body);
        if (!user) return res.status(404).json({ success:false, message:"User not found" });
        res.json({ success:true, user });
    } catch (error) { next(error); }
}

async function changePassword(req, res, next) {
    try {
        await authService.changePassword(req.user.user_id, req.body.current_password, req.body.new_password);
        res.json({ success:true, message:"Password changed successfully" });
    } catch (error) {
        if (error.message === "INVALID_CREDENTIALS") return res.status(401).json({ success:false, message:"Current password is incorrect" });
        next(error);
    }
}

module.exports = {
    register,
    login,
    getMe,
    updateMe,
    changePassword,
};