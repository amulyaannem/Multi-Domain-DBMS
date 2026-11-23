const express = require("express");

const router = express.Router();

const businessController = require("../controllers/businessController");

const authenticateToken = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const {
    createBusinessSchema,
} = require("../validators/businessValidator");
const {
    updateBusinessSchema,
    updateModuleSchema,
    updateMemberRoleSchema,
} = require("../validators/settingsValidator");

// All business routes require authentication
router.use(authenticateToken);

router.post(
    "/",
    validate(createBusinessSchema),
    businessController.registerBusiness
);

router.get(
    "/",
    businessController.getBusinesses
);

router.get("/:businessId", businessController.getBusiness);
router.patch("/:businessId", validate(updateBusinessSchema), businessController.updateBusiness);
router.get("/:businessId/modules", businessController.getModules);
router.patch("/:businessId/modules/:moduleId", validate(updateModuleSchema), businessController.updateModule);
router.get("/:businessId/members", businessController.getMembers);
router.patch("/:businessId/members/:membershipId", validate(updateMemberRoleSchema), businessController.updateMember);
router.delete("/:businessId/members/:membershipId", businessController.removeMember);

module.exports = router;