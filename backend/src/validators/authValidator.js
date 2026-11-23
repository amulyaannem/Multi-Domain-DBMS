const { z } = require("zod");

const registerSchema = z.object({
    full_name: z.string()
        .trim()
        .min(2)
        .max(120),

    email: z.string()
        .trim()
        .email()
        .max(255),

    password: z.string()
        .min(8)
        .max(72),
});

const loginSchema = z.object({
    email: z.string()
        .trim()
        .email(),

    password: z.string()
        .min(1)
        .max(72),
});

module.exports = {
    registerSchema,
    loginSchema,
};