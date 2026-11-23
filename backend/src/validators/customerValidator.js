
const { z } = require("zod");

const createCustomerSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(25).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  address: z.string().trim().nullable().optional()
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = {
  createCustomerSchema,
  updateCustomerSchema
};
