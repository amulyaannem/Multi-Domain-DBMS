const pool = require("../config/db");

async function getDashboard(businessId) {
  const [
    summaryResult,
    monthlyResult,
    bestSellingResult,
    lowStockResult,
    recentOrdersResult,
    inventoryResult
  ] = await Promise.all([

    // Order and payment summary
    pool.query(
      `SELECT
         COUNT(*)::int AS total_orders,
         COUNT(*) FILTER (
           WHERE order_status = 'completed'
         )::int AS completed_orders,
         COUNT(*) FILTER (
           WHERE order_status IN ('placed', 'processing')
         )::int AS active_orders,
         COALESCE(SUM(total_amount), 0)::numeric(14,2)
           AS total_order_value,
         COALESCE(SUM(total_amount) FILTER (
           WHERE payment_status = 'paid'
         ), 0)::numeric(14,2) AS collected_amount
       FROM v_order_totals
       WHERE business_id = $1
         AND order_status <> 'cancelled'`,
      [businessId]
    ),

    // Last six months of order value
    pool.query(
      `SELECT TO_CHAR(sales_month, 'YYYY-MM-DD') AS sales_month,
        revenue,
        order_count
       FROM v_monthly_sales
       WHERE business_id = $1
       ORDER BY sales_month DESC
       LIMIT 6`,
      [businessId]
    ),

    // Best-selling products from completed orders
    pool.query(
      `SELECT
         p.product_id,
         p.product_name,
         SUM(od.quantity_ordered)::numeric(12,3) AS units_sold,
         SUM(od.line_total)::numeric(14,2) AS sales_value
       FROM order_details od
       JOIN orders o
         ON o.business_id = od.business_id
        AND o.order_id = od.order_id
       JOIN product p
         ON p.business_id = od.business_id
        AND p.product_id = od.product_id
       WHERE od.business_id = $1
         AND o.order_status = 'completed'
       GROUP BY p.product_id, p.product_name
       ORDER BY units_sold DESC
       LIMIT 5`,
      [businessId]
    ),

    pool.query(
        `SELECT
     p.product_id,
     p.product_name,
     SUM(stock.quantity)::numeric(12,3) AS quantity,
     MAX(stock.reorder_level)::numeric(12,3) AS reorder_level
        FROM product p
        JOIN (
     SELECT
       i.business_id,
       i.product_id,
       i.quantity,
       i.reorder_level
     FROM inventory i
     WHERE i.business_id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM product_variant pv
         WHERE pv.business_id = i.business_id
           AND pv.product_id = i.product_id
       )

     UNION ALL

     SELECT
       pv.business_id,
       pv.product_id,
       pv.variant_quantity AS quantity,
       COALESCE(i.reorder_level, 0) AS reorder_level
     FROM product_variant pv
     LEFT JOIN inventory i
       ON i.business_id = pv.business_id
      AND i.product_id = pv.product_id
     WHERE pv.business_id = $1
   ) stock
     ON stock.business_id = p.business_id
    AND stock.product_id = p.product_id
    GROUP BY p.product_id, p.product_name
    HAVING SUM(stock.quantity) <= MAX(stock.reorder_level)
    ORDER BY SUM(stock.quantity) ASC
    LIMIT 10`,
    [businessId]
    ),

    // Recent orders
    pool.query(
      `SELECT
         o.order_id,
         o.order_date,
         o.order_status,
         o.payment_status,
         c.customer_name,
         COALESCE(v.total_amount, 0)::numeric(14,2) AS total_amount
       FROM orders o
       LEFT JOIN customer c
         ON c.business_id = o.business_id
        AND c.customer_id = o.customer_id
       LEFT JOIN v_order_totals v
         ON v.business_id = o.business_id
        AND v.order_id = o.order_id
       WHERE o.business_id = $1
       ORDER BY o.order_date DESC
       LIMIT 5`,
      [businessId]
    ),

    pool.query(
  `WITH variant_products AS (
     SELECT DISTINCT business_id, product_id
     FROM product_variant
     WHERE business_id = $1
   ),
   stock_summary AS (
     SELECT
       COUNT(*)::int AS tracked_products,
       COALESCE(SUM(pv.variant_quantity), 0) AS variant_stock,
       COUNT(*) FILTER (
         WHERE pv.variant_quantity <= COALESCE(
           (SELECT i.reorder_level
            FROM inventory i
            WHERE i.business_id = pv.business_id
              AND i.product_id = pv.product_id),
           0
         )
       ) AS low_variant_count
     FROM product_variant pv
     WHERE pv.business_id = $1
   ),
   standard_summary AS (
     SELECT
       COUNT(*)::int AS tracked_products,
       COALESCE(SUM(i.quantity), 0) AS standard_stock,
       COUNT(*) FILTER (
         WHERE i.quantity <= i.reorder_level
       ) AS low_standard_count
     FROM inventory i
     WHERE i.business_id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM variant_products vp
         WHERE vp.business_id = i.business_id
           AND vp.product_id = i.product_id
       )
   )
    SELECT
     (ss.tracked_products + vs.tracked_products)::int
       AS tracked_products,
     (ss.standard_stock + vs.variant_stock)::numeric(14,3)
       AS total_stock_units,
     (ss.low_standard_count + vs.low_variant_count)::int
       AS low_stock_count
        FROM standard_summary ss
        CROSS JOIN stock_summary vs`,
        [businessId]
    )
  ]);

  return {
    summary: summaryResult.rows[0],
    monthly_order_value: monthlyResult.rows.reverse(),
    best_selling_products: bestSellingResult.rows,
    low_stock_products: lowStockResult.rows,
    recent_orders: recentOrdersResult.rows,
    inventory: inventoryResult.rows[0]
  };
}

async function getBusinessAnalytics(businessId, businessTypeId) {
  // Restaurant
  businessTypeId = Number(businessTypeId);
  const client = await pool.connect();
  if (Number(businessTypeId) === 3) {
    const [dashboard, tables] = await Promise.all([
      pool.query("SELECT * FROM v_restaurant_dashboard WHERE business_id = $1", [businessId]),
      pool.query("SELECT * FROM v_restaurant_table_schedule WHERE business_id = $1 ORDER BY table_number", [businessId])
    ]);

    return {
      type: "restaurant",
      overview: dashboard.rows[0] || null,
      table_schedule: tables.rows
    };
  }

  // Flower shop
  if (Number(businessTypeId) === 4) {
    const [dashboard, production, profitability, assembly] = await Promise.all([
      pool.query("SELECT * FROM v_flower_shop_dashboard WHERE business_id = $1", [businessId]),
      pool.query("SELECT * FROM v_bouquet_production WHERE business_id = $1", [businessId]),
      pool.query("SELECT * FROM v_bouquet_profitability WHERE business_id = $1", [businessId]),
      pool.query("SELECT * FROM v_flower_assembly_analytics WHERE business_id = $1", [businessId])
    ]);

    return {
      type: "flower_shop",
      overview: dashboard.rows[0] || null,
      bouquet_production: production.rows,
      bouquet_profitability: profitability.rows,
      assembly_analytics: assembly.rows
    };
  }

  // Bakery
  if (Number(businessTypeId) === 1) {
    const [recipes, batches, ingredients] = await Promise.all([
      pool.query(`SELECT r.recipe_id, r.recipe_name, p.product_name
                 FROM recipe r JOIN product p
                   ON p.business_id = r.business_id AND p.product_id = r.product_id
                 WHERE r.business_id = $1`, [businessId]),
      pool.query(`SELECT pb.batch_id, pb.batch_code, pb.product_id, p.product_name,
                 pb.production_date, pb.expiry_date, pb.quantity_produced
                 FROM production_batch pb JOIN product p
                   ON p.business_id = pb.business_id AND p.product_id = pb.product_id
                 WHERE pb.business_id = $1
                 ORDER BY pb.production_date DESC NULLS LAST`, [businessId]),
      pool.query(`SELECT i.ingredient_id, i.ingredient_name, i.unit
                 FROM ingredient i WHERE i.business_id = $1
                 ORDER BY i.ingredient_name`, [businessId])
    ]);

    return {
      type: "bakery",
      recipes: recipes.rows,
      production_batches: batches.rows,
      ingredients: ingredients.rows
    };
  }

  // Clothing / Boutique
  if (Number(businessTypeId) === 2 || Number(businessTypeId) === 6) {
    const variants = await pool.query(
      `SELECT p.product_id, p.product_name, pv.variant_id, pv.sku,
         pv.size_label, pv.color, pv.material, pv.variant_quantity, pv.additional_price
       FROM product_variant pv JOIN product p
         ON p.business_id = pv.business_id AND p.product_id = pv.product_id
       WHERE pv.business_id = $1
       ORDER BY p.product_name, pv.size_label, pv.color`,
      [businessId]
    );

    return {
      type: Number(businessTypeId) === 2 ? "clothing" : "boutique",
      variants: variants.rows
    };
  }

  return {
    type: "general",
    message: "Common dashboard analytics available"
  };
}   

module.exports = { 
    getDashboard,
    getBusinessAnalytics
};