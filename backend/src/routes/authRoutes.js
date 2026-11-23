const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validate = require("../middleware/validate");
const authenticateToken = require("../middleware/authMiddleware");
const {
    registerSchema,
    loginSchema,
} = require("../validators/authValidator");
const { updateAccountSchema, changePasswordSchema } = require("../validators/settingsValidator");

router.post(
    "/register",
    validate(registerSchema),
    authController.register
);

router.post(
    "/login",
    validate(loginSchema),
    authController.login
);

router.get(
    "/me",
    authenticateToken,
    authController.getMe
);

router.patch(
    "/me",
    authenticateToken,
    validate(updateAccountSchema),
    authController.updateMe
);

router.patch(
    "/password",
    authenticateToken,
    validate(changePasswordSchema),
    authController.changePassword
);

module.exports = router;