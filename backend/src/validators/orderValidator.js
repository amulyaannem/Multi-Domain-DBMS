
const { z } = require("zod");

const createOrderSchema = z.object({
  customer_id: z.coerce.number().int().positive().nullable().optional(),

  items: z.array(
    z.object({
      product_id: z.coerce.number().int().positive(),
      variant_id: z.coerce.number().int().positive().nullable().optional(),
      quantity: z.coerce.number().positive().max(100000)
    })
  ).min(1).max(100),

  payment_method: z.string().trim().max(30).nullable().optional()
});

module.exports = { createOrderSchema };
