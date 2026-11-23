const { z } = require("zod");

const updateAccountSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be supplied" });

const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(72),
  new_password: z.string().min(8).max(72),
});

const updateBusinessSchema = z.object({
  business_name: z.string().trim().min(2).max(150).optional(),
  currency_code: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be supplied" });

const updateModuleSchema = z.object({ enabled: z.boolean() });

const updateMemberRoleSchema = z.object({
  member_role: z.enum(["manager", "staff"]),
});

module.exports = { updateAccountSchema, changePasswordSchema, updateBusinessSchema, updateModuleSchema, updateMemberRoleSchema };
