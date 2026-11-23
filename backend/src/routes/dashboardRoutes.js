const express = require("express");
const router = express.Router({ mergeParams: true });

const authenticateToken = require("../middleware/authMiddleware");
const requireBusinessAccess = require("../middleware/businessAccess");
const controller = require("../controllers/dashboardController");

router.use(authenticateToken);

router.get(
  "/",
  requireBusinessAccess("orders"),
  controller.getDashboard
);

router.get(
  "/analytics",
  requireBusinessAccess("orders"),
  controller.getBusinessAnalytics
);

module.exports = router;