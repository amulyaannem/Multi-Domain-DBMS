const service = require("../services/productService");

async function create(req, res, next) {
    try {
        const product = await service.createProduct(
            req.business.business_id,
            req.body
        );

        res.status(201).json({
            success: true,
            product,
        });
    } catch (error) {
        next(error);
    }
}

async function list(req, res, next) {
    try {
        const products = await service.getProducts(
            req.business.business_id
        );

        res.json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        next(error);
    }
}

async function get(req, res, next) {
    try {
        const product = await service.getProduct(
            req.business.business_id,
            req.params.id
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.json({ success: true, product });
    } catch (error) {
        next(error);
    }
}

async function update(req, res, next) {
    try {
        const product = await service.updateProduct(
            req.business.business_id,
            req.params.id,
            req.body
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.json({ success: true, product });
    } catch (error) {
        next(error);
    }
}

async function remove(req, res, next) {
    try {
        const deleted = await service.deleteProduct(
            req.business.business_id,
            req.params.id
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        next(error);
    }
}

async function inventory(req, res, next) {
    try {
        const rows = await service.getInventory(
            req.business.business_id
        );

        res.json({ success: true, inventory: rows });
    } catch (error) {
        next(error);
    }
}

async function updateInventory(req, res, next) {
    try {
        const row = await service.updateInventory(
            req.business.business_id,
            req.params.productId,
            req.body
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: "Inventory record not found",
            });
        }

        res.json({ success: true, inventory: row });
    } catch (error) {
        next(error);
    }
}

async function lowStock(req, res, next) {
    try {
        const rows = await service.getLowStock(
            req.business.business_id
        );

        res.json({
            success: true,
            count: rows.length,
            items: rows,
        });
    } catch (error) {
        next(error);
    }
}

async function listVariants(req, res, next) {
    try {
        const variants = await service.listVariants(req.business.business_id, req.params.productId);
        res.json({ success: true, variants });
    } catch (error) { next(error); }
}

async function createVariant(req, res, next) {
    try {
        const variant = await service.createVariant(req.business.business_id, req.params.productId, req.body);
        res.status(201).json({ success: true, variant });
    } catch (error) { next(error); }
}

async function updateVariant(req, res, next) {
    try {
        const variant = await service.updateVariant(req.business.business_id, req.params.variantId, req.body);
        if (!variant) return res.status(404).json({ success: false, message: "Variant not found" });
        res.json({ success: true, variant });
    } catch (error) { next(error); }
}

module.exports = {
    create,
    list,
    get,
    update,
    remove,
    inventory,
    updateInventory,
    lowStock,
    listVariants,
    createVariant,
    updateVariant,
};