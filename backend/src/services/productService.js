const pool = require("../config/db");

async function createProduct(businessId, data) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const productResult = await client.query(
            `INSERT INTO product
                (business_id, product_name, category, description,
                 unit_price, cost_price)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                businessId,
                data.product_name,
                data.category ?? null,
                data.description ?? null,
                data.unit_price,
                data.cost_price ?? null,
            ]
        );

        const product = productResult.rows[0];

        await client.query(
            `INSERT INTO inventory
                (business_id, product_id, quantity, reorder_level)
             VALUES ($1, $2, $3, $4)`,
            [
                businessId,
                product.product_id,
                data.initial_stock,
                data.reorder_level,
            ]
        );

        await client.query("COMMIT");

        return product;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

async function getProducts(businessId) {
    const result = await pool.query(
        `SELECT
            p.*,
            COALESCE(i.quantity, 0) AS current_stock,
            COALESCE(i.reorder_level, 0) AS reorder_level
         FROM product p
         LEFT JOIN inventory i
           ON i.business_id = p.business_id
          AND i.product_id = p.product_id
         WHERE p.business_id = $1
         ORDER BY p.product_id DESC`,
        [businessId]
    );

    return result.rows;
}

async function getProduct(businessId, productId) {
    const result = await pool.query(
        `SELECT
            p.*,
            i.quantity AS current_stock,
            i.reorder_level
         FROM product p
         LEFT JOIN inventory i
           ON i.business_id = p.business_id
          AND i.product_id = p.product_id
         WHERE p.business_id = $1
           AND p.product_id = $2`,
        [businessId, productId]
    );

    return result.rows[0] || null;
}

async function updateProduct(businessId, productId, data) {
    const fields = {
        product_name: data.product_name,
        category: data.category,
        description: data.description,
        unit_price: data.unit_price,
        cost_price: data.cost_price,
        is_active: data.is_active,
    };

    const updates = Object.entries(fields)
        .filter(([key]) => Object.hasOwn(data, key));

    const values = [
        businessId,
        productId,
        ...updates.map(([, value]) => value),
    ];

    const setClause = updates
        .map(([key], index) => `${key} = $${index + 3}`)
        .join(", ");

    const result = await pool.query(
        `UPDATE product
         SET ${setClause}
         WHERE business_id = $1
           AND product_id = $2
         RETURNING *`,
        values
    );

    return result.rows[0] || null;
}

async function deleteProduct(businessId, productId) {
    const result = await pool.query(
        `DELETE FROM product
         WHERE business_id = $1
           AND product_id = $2
         RETURNING product_id`,
        [businessId, productId]
    );

    return result.rowCount > 0;
}

async function getInventory(businessId) {
    const result = await pool.query(
        `SELECT
            p.product_id,
            p.product_name,
            p.category,
            i.quantity,
            i.reorder_level,
            i.updated_at
         FROM inventory i
         JOIN product p
           ON p.business_id = i.business_id
          AND p.product_id = i.product_id
         WHERE i.business_id = $1
         ORDER BY p.product_name`,
        [businessId]
    );

    return result.rows;
}

async function updateInventory(businessId, productId, data) {
    const result = await pool.query(
        `UPDATE inventory
         SET quantity = $3,
             reorder_level = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE business_id = $1
           AND product_id = $2
         RETURNING *`,
        [
            businessId,
            productId,
            data.quantity,
            data.reorder_level,
        ]
    );

    return result.rows[0] || null;
}

async function getLowStock(businessId) {
    const result = await pool.query(
        `SELECT
            p.product_id,
            p.product_name,
            i.quantity,
            i.reorder_level
         FROM inventory i
         JOIN product p
           ON p.business_id = i.business_id
          AND p.product_id = i.product_id
         WHERE i.business_id = $1
           AND i.quantity <= i.reorder_level
         ORDER BY i.quantity ASC`,
        [businessId]
    );

    return result.rows;
}

async function listVariants(businessId, productId) {
    const result = await pool.query(
        `SELECT variant_id, business_id, product_id, sku, size_label, color,
                material, additional_price, variant_quantity
         FROM product_variant
         WHERE business_id = $1 AND product_id = $2
         ORDER BY variant_id`,
        [businessId, productId]
    );
    return result.rows;
}

async function createVariant(businessId, productId, data) {
    const result = await pool.query(
        `INSERT INTO product_variant
            (business_id, product_id, sku, size_label, color, material,
             additional_price, variant_quantity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [businessId, productId, data.sku ?? null, data.size_label ?? null,
         data.color ?? null, data.material ?? null,
         data.additional_price ?? 0, data.variant_quantity ?? 0]
    );
    return result.rows[0];
}

async function updateVariant(businessId, variantId, data) {
    const allowed = ["sku", "size_label", "color", "material", "additional_price", "variant_quantity"];
    const fields = Object.keys(data).filter((key) => allowed.includes(key));
    if (!fields.length) {
        const result = await pool.query(
            `SELECT * FROM product_variant WHERE business_id=$1 AND variant_id=$2`,
            [businessId, variantId]
        );
        return result.rows[0] || null;
    }
    const values = [businessId, variantId];
    const assignments = fields.map((field, index) => {
        values.push(data[field] ?? null);
        return `${field}=$${index + 3}`;
    });
    const result = await pool.query(
        `UPDATE product_variant SET ${assignments.join(", ")}
         WHERE business_id=$1 AND variant_id=$2
         RETURNING *`,
        values
    );
    return result.rows[0] || null;
}

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getInventory,
    updateInventory,
    getLowStock,
    listVariants,
    createVariant,
    updateVariant,
};