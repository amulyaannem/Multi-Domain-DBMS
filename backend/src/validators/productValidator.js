const { z } = require("zod");

const createProductSchema = z.object({
    product_name: z.string().trim().min(2).max(150),
    category: z.string().trim().max(80).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    unit_price: z.coerce.number().min(0),
    cost_price: z.coerce.number().min(0).nullable().optional(),
    initial_stock: z.coerce.number().min(0).default(0),
    reorder_level: z.coerce.number().min(0).default(0),
});

const updateProductSchema = z.object({
    product_name: z.string().trim().min(2).max(150).optional(),
    category: z.string().trim().max(80).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    unit_price: z.coerce.number().min(0).optional(),
    cost_price: z.coerce.number().min(0).nullable().optional(),
    is_active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be supplied",
});

const updateInventorySchema = z.object({
    quantity: z.coerce.number().min(0),
    reorder_level: z.coerce.number().min(0),
});

const variantSchema = z.object({
    sku: z.string().trim().max(80).nullable().optional(),
    size_label: z.string().trim().max(40).nullable().optional(),
    color: z.string().trim().max(50).nullable().optional(),
    material: z.string().trim().max(80).nullable().optional(),
    additional_price: z.coerce.number().min(0).default(0),
    variant_quantity: z.coerce.number().min(0).default(0),
});

const updateVariantSchema = z.object({
    sku: z.string().trim().max(80).nullable().optional(),
    size_label: z.string().trim().max(40).nullable().optional(),
    color: z.string().trim().max(50).nullable().optional(),
    material: z.string().trim().max(80).nullable().optional(),
    additional_price: z.coerce.number().min(0).optional(),
    variant_quantity: z.coerce.number().min(0).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be supplied" });

module.exports = {
    createProductSchema,
    updateProductSchema,
    updateInventorySchema,
    variantSchema,
    updateVariantSchema,
};