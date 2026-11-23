const express = require("express");
const router = express.Router({ mergeParams: true });   

const controller = require("../controllers/productController");

const authenticateToken = require("../middleware/authMiddleware");
const requireBusinessAccess = require("../middleware/businessAccess");
const validate = require("../middleware/validate");

const {
    createProductSchema,
    updateProductSchema,
    updateInventorySchema,
    variantSchema,
    updateVariantSchema,
} = require("../validators/productValidator");

// All routes require authentication and business membership
router.use(authenticateToken);
router.use(requireBusinessAccess());

// Inventory routes
router.get(
    "/inventory/all",
    requireBusinessAccess("inventory"),
    controller.inventory
);

router.get(
    "/inventory/low-stock",
    requireBusinessAccess("inventory"),
    controller.lowStock
);

router.put(
    "/inventory/:productId",
    requireBusinessAccess("inventory", ["owner", "manager"]),
    validate(updateInventorySchema),
    controller.updateInventory
);

// Product variant routes
router.get(
    "/:productId/variants",
    requireBusinessAccess("inventory"),
    controller.listVariants
);

router.post(
    "/:productId/variants",
    requireBusinessAccess("inventory", ["owner", "manager"]),
    validate(variantSchema),
    controller.createVariant
);

router.put(
    "/variants/:variantId",
    requireBusinessAccess("inventory", ["owner", "manager"]),
    validate(updateVariantSchema),
    controller.updateVariant
);

// Product routes
router.post(
    "/",
    requireBusinessAccess("inventory", ["owner", "manager"]),
    validate(createProductSchema),
    controller.create
);

router.get(
    "/",
    requireBusinessAccess("inventory"),
    controller.list
);

router.get(
    "/:id",
    requireBusinessAccess("inventory"),
    controller.get
);

router.put(
    "/:id",
    requireBusinessAccess("inventory", ["owner", "manager"]),
    validate(updateProductSchema),
    controller.update
);

router.delete(
    "/:id",
    requireBusinessAccess("inventory", ["owner", "manager"]),
    controller.remove
);

module.exports = router;