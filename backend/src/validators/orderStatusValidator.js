
const { z } = require("zod");

const updateOrderStatusSchema = z.object({
  order_status: z.enum([
    "processing",
    "completed",
    "cancelled"
  ])
});

const updatePaymentStatusSchema = z.object({
  payment_status: z.enum([
    "pending",
    "paid",
    "partially_paid",
    "refunded"
  ])
});

const updateDeliveryStatusSchema = z.object({
  delivery_status: z.enum([
    "not_required",
    "pending",
    "preparing",
    "dispatched",
    "delivered",
    "cancelled"
  ])
});

module.exports = {
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  updateDeliveryStatusSchema
};
