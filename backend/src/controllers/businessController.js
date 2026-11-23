const businessService = require("../services/businessService");

async function registerBusiness(req, res) {
    try {
        const result = await businessService.registerBusiness(
            req.user.user_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Business registered successfully",
            ...result,
        });

    } catch (error) {
        if (error.message === "BUSINESS_TYPE_NOT_FOUND") {
            return res.status(400).json({
                success: false,
                message: "Invalid business type",
            });
        }

        if (error.message === "NO_DEFAULT_MODULES") {
            return res.status(409).json({
                success: false,
                message: "No default modules configured for this business type",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Could not register business",
        });
    }
}

async function getBusinesses(req, res) {
    try {
        const businesses = await businessService.getUserBusinesses(
            req.user.user_id
        );

        return res.json({
            success: true,
            count: businesses.length,
            businesses,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve businesses",
        });
    }
}

async function getBusiness(req, res, next) {
    try {
        const business = await businessService.getBusinessById(req.user.user_id, req.params.businessId);
        if (!business) return res.status(404).json({ success:false, message:"Business not found" });
        res.json({ success:true, business });
    } catch (error) { next(error); }
}

async function updateBusiness(req, res, next) {
    try {
        const business = await businessService.updateBusiness(req.user.user_id, req.params.businessId, req.body);
        if (!business) return res.status(404).json({ success:false, message:"Business not found" });
        res.json({ success:true, business });
    } catch (error) { next(error); }
}

async function getModules(req, res, next) {
    try {
        const business = await businessService.getBusinessById(req.user.user_id, req.params.businessId);
        if (!business) return res.status(404).json({ success:false, message:"Business not found" });
        const modules = await businessService.getBusinessModules(req.params.businessId);
        res.json({ success:true, modules });
    } catch (error) { next(error); }
}

async function updateModule(req, res, next) {
    try {
        const module = await businessService.setBusinessModule(req.user.user_id, req.params.businessId, req.params.moduleId, req.body.enabled);
        if (!module) return res.status(404).json({ success:false, message:"Module not found" });
        res.json({ success:true, module });
    } catch (error) { next(error); }
}

async function getMembers(req, res, next) {
    try {
        const members = await businessService.getBusinessMembers(req.user.user_id, req.params.businessId);
        if (members === null) return res.status(404).json({ success:false, message:"Business not found" });
        res.json({ success:true, members });
    } catch (error) { next(error); }
}

async function updateMember(req, res, next) {
    try {
        const member = await businessService.updateBusinessMember(req.user.user_id, req.params.businessId, req.params.membershipId, req.body.member_role);
        if (!member) return res.status(404).json({ success:false, message:"Member not found" });
        res.json({ success:true, member });
    } catch (error) { next(error); }
}

async function removeMember(req, res, next) {
    try {
        const member = await businessService.removeBusinessMember(req.user.user_id, req.params.businessId, req.params.membershipId);
        if (!member) return res.status(404).json({ success:false, message:"Member not found" });
        res.json({ success:true, message:"Member removed", member });
    } catch (error) { next(error); }
}

module.exports = {
    registerBusiness,
    getBusinesses,
    getBusiness,
    updateBusiness,
    getModules,
    updateModule,
    getMembers,
    updateMember,
    removeMember,
};