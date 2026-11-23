
const express = require("express");
const router = express.Router({ mergeParams: true });

const authenticateToken = require("../middleware/authMiddleware");
const requireBusinessAccess = require("../middleware/businessAccess");
const validate = require("../middleware/validate");
const controller = require("../controllers/orderController");   

const {
  updatePaymentStatusSchema,
  updateDeliveryStatusSchema
} = require("../validators/orderStatusValidator");
const { createOrderSchema } = require("../validators/orderValidator");
const { updateOrderStatusSchema } = require("../validators/orderStatusValidator");

router.use(authenticateToken);

router.post(
  "/",
  requireBusinessAccess("orders", ["owner", "manager"]),
  validate(createOrderSchema),
  controller.create
);

router.get(
  "/",
  requireBusinessAccess("orders"),
  controller.list
);

router.patch(
  "/:orderId/place",
  requireBusinessAccess("orders", ["owner", "manager"]),
  controller.place
);

router.patch(
  "/:orderId/status",
  requireBusinessAccess("orders", ["owner", "manager"]),
  validate(updateOrderStatusSchema),
  controller.updateStatus
);

router.patch(
  "/:orderId/payment",
  requireBusinessAccess("orders", ["owner", "manager"]),
  validate(updatePaymentStatusSchema),
  controller.updatePayment
);

router.patch(
  "/:orderId/delivery",
  requireBusinessAccess("orders", ["owner", "manager"]),
  validate(updateDeliveryStatusSchema),
  controller.updateDelivery
);

router.get(
  "/:orderId",
  requireBusinessAccess("orders"),
  controller.get
);

module.exports = router;
