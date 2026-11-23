const pool = require("../config/db");

function requireBusinessAccess(requiredModule = null, roles = ["owner", "manager", "staff"]) {
    return async (req, res, next) => {
        try {
            const businessId = req.params.businessId;
            const userId = req.user.user_id;

            if (!/^[1-9]\d*$/.test(String(businessId))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid business ID",
                });
            }

            const result = await pool.query(
                `SELECT
                bm.member_role,
                b.business_type_id
                 FROM business_member bm
                 JOIN business b
                   ON b.business_id = bm.business_id
                 WHERE bm.business_id = $1
                   AND bm.user_id = $2`,
                [businessId, userId]
            );

            if (result.rowCount === 0) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this business",
                });
            }

            const memberRole = result.rows[0].member_role;

            if (!roles.includes(memberRole)) {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permissions",
                });
            }

            if (requiredModule) {
                const moduleResult = await pool.query(
                    `SELECT bm.enabled
                     FROM business_module bm
                     JOIN module m ON m.module_id = bm.module_id
                     WHERE bm.business_id = $1
                       AND m.module_key = $2`,
                    [businessId, requiredModule]
                );

                if (
                    moduleResult.rowCount === 0 ||
                    !moduleResult.rows[0].enabled
                ) {
                    return res.status(403).json({
                        success: false,
                        message: "This module is not enabled for this business",
                    });
                }
            }

            req.business = {
                business_id: String(businessId),
                business_type_id: result.rows[0].business_type_id,
                member_role: memberRole,
            };

            next();

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Business authorization failed",
            });
        }
    };
}

module.exports = requireBusinessAccess;