
const express = require("express");
const router = express.Router({mergeParams: true});

const authenticateToken = require("../middleware/authMiddleware");
const requireBusinessAccess = require("../middleware/businessAccess");
const validate = require("../middleware/validate");

const controller = require("../controllers/customerController");

const {
  createCustomerSchema,
  updateCustomerSchema
} = require("../validators/customerValidator");

router.use(authenticateToken);

router.post(
  "/",
  requireBusinessAccess("customers", ["owner", "manager"]),
  validate(createCustomerSchema),
  controller.create
);

router.get(
  "/",
  requireBusinessAccess("customers"),
  controller.list
);

router.get(
  "/:id",
  requireBusinessAccess("customers"),
  controller.get
);

router.put(
  "/:id",
  requireBusinessAccess("customers", ["owner", "manager"]),
  validate(updateCustomerSchema),
  controller.update
);

router.delete(
  "/:id",
  requireBusinessAccess("customers", ["owner", "manager"]),
  controller.remove
);

module.exports = router;
