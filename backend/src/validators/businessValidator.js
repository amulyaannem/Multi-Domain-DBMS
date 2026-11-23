const { z } = require("zod");

const createBusinessSchema = z.object({
    business_name: z.string()
        .trim()
        .min(2)
        .max(150),

    business_type_id: z.coerce.number()
        .int()
        .positive(),

    currency_code: z.string()
        .trim()
        .length(3)
        .transform(value => value.toUpperCase())
        .default("INR"),
});

module.exports = {
    createBusinessSchema,
};