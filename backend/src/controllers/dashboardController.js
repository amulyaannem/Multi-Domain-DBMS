const dashboardService = require("../services/dashboardService");

exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await dashboardService.getDashboard(
      req.business.business_id
    );

    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    next(error);
  }
};

exports.getBusinessAnalytics = async (req, res, next) => {
     console.log("ANALYTICS DEBUG:", {
        businessId: req.business.business_id,
        businessTypeId: req.business.business_type_id
    });
  try {
    const result = await dashboardService.getBusinessAnalytics(
      req.business.business_id,
      req.business.business_type_id
    );

    res.json({
      success: true,
      analytics: result
    });
  } catch (error) {
    next(error);
  }
};