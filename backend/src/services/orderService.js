const pool = require("../config/db");

async function createDraftOrder(businessId, data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Validate customer belongs to this business.
    if (data.customer_id) {
      const customerResult = await client.query(
        `SELECT customer_id
         FROM customer
         WHERE business_id = $1 AND customer_id = $2`,
        [businessId, data.customer_id]
      );

      if (!customerResult.rowCount) {
        const error = new Error("Customer not found in this business");
        error.statusCode = 400;
        throw error;
      }
    }

    // Create draft order.
    const orderResult = await client.query(
      `INSERT INTO orders
        (business_id, customer_id, order_status, payment_method)
       VALUES ($1, $2, 'draft', $3)
       RETURNING *`,
      [
        businessId,
        data.customer_id ?? null,
        data.payment_method ?? null
      ]
    );

    const order = orderResult.rows[0];

    // Process every item using prices stored in the database.
    for (const item of data.items) {
      const productResult = await client.query(
        `SELECT
            p.product_id,
            p.unit_price,
            p.is_active,
            COUNT(pv.variant_id)::int AS variant_count
         FROM product p
         LEFT JOIN product_variant pv
           ON pv.business_id = p.business_id
           AND pv.product_id = p.product_id
         WHERE p.business_id = $1
           AND p.product_id = $2
         GROUP BY p.product_id, p.unit_price, p.is_active`,
        [businessId, item.product_id]
      );

      if (!productResult.rowCount || !productResult.rows[0].is_active) {
        const error = new Error(
          `Product ${item.product_id} not found or inactive`
        );
        error.statusCode = 400;
        throw error;
      }

      const product = productResult.rows[0];

      let unitPrice = Number(product.unit_price);

      if (product.variant_count > 0 && !item.variant_id) {
        const error = new Error(
          `Product ${item.product_id} requires a variant`
        );
        error.statusCode = 400;
        throw error;
      }

      if (item.variant_id) {
        const variantResult = await client.query(
          `SELECT additional_price
           FROM product_variant
           WHERE business_id = $1
             AND product_id = $2
             AND variant_id = $3`,
          [businessId, item.product_id, item.variant_id]
        );

        if (!variantResult.rowCount) {
          const error = new Error(
            `Invalid variant ${item.variant_id} for product ${item.product_id}`
          );
          error.statusCode = 400;
          throw error;
        }

        unitPrice += Number(variantResult.rows[0].additional_price);
      }

      await client.query(
        `INSERT INTO order_details
          (business_id, order_id, product_id, variant_id,
           quantity_ordered, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          businessId,
          order.order_id,
          item.product_id,
          item.variant_id ?? null,
          item.quantity,
          unitPrice
        ]
      );
    }

    const totalResult = await client.query(
      `SELECT
          COALESCE(SUM(line_total), 0) AS order_total
       FROM order_details
       WHERE business_id = $1 AND order_id = $2`,
      [businessId, order.order_id]
    );

    await client.query("COMMIT");

    return {
      ...order,
      order_total: totalResult.rows[0].order_total
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function getOrders(businessId) {
  const { rows } = await pool.query(
    `SELECT
        o.order_id,
        o.business_id,
        o.customer_id,
        c.customer_name,
        o.order_date,
        o.order_status,
        o.payment_method,
        o.payment_status,
        o.delivery_date,
        o.delivery_status,
        COALESCE(SUM(od.line_total), 0) AS order_total,
        COUNT(od.order_detail_id)::int AS item_count
     FROM orders o
     LEFT JOIN customer c
       ON c.business_id = o.business_id
       AND c.customer_id = o.customer_id
     LEFT JOIN order_details od
       ON od.business_id = o.business_id
       AND od.order_id = o.order_id
     WHERE o.business_id = $1
     GROUP BY o.order_id, c.customer_name
     ORDER BY o.order_date DESC`,
    [businessId]
  );

  return rows;
}

async function getOrderById(businessId, orderId) {
  const orderResult = await pool.query(
    `SELECT
        o.*,
        c.customer_name,
        COALESCE(
          SUM(od.line_total),
          0
        ) AS order_total,
        COUNT(od.order_detail_id)::int AS item_count
     FROM orders o
     LEFT JOIN customer c
       ON c.business_id = o.business_id
       AND c.customer_id = o.customer_id
     LEFT JOIN order_details od
       ON od.business_id = o.business_id
       AND od.order_id = o.order_id
     WHERE o.business_id = $1
       AND o.order_id = $2
     GROUP BY o.order_id, c.customer_name`,
    [businessId, orderId]
  );

  if (!orderResult.rowCount) {
    return null;
  }

  const itemsResult = await pool.query(
    `SELECT
        od.order_detail_id,
        od.product_id,
        p.product_name,
        od.variant_id,
        pv.sku,
        od.quantity_ordered,
        od.unit_price,
        od.line_total
     FROM order_details od
     JOIN product p
       ON p.business_id = od.business_id
       AND p.product_id = od.product_id
     LEFT JOIN product_variant pv
       ON pv.business_id = od.business_id
       AND pv.product_id = od.product_id
       AND pv.variant_id = od.variant_id
     WHERE od.business_id = $1
       AND od.order_id = $2
     ORDER BY od.order_detail_id`,
    [businessId, orderId]
  );

  return {
    ...orderResult.rows[0],
    items: itemsResult.rows
  };
}

async function placeOrder(businessId, orderId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the order so simultaneous placement requests
    // cannot process it independently.
    const orderResult = await client.query(
      `SELECT order_id, order_status
       FROM orders
       WHERE business_id = $1 AND order_id = $2
       FOR UPDATE`,
      [businessId, orderId]
    );

    if (!orderResult.rowCount) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    if (orderResult.rows[0].order_status !== "draft") {
      const error = new Error("Only draft orders can be placed");
      error.statusCode = 409;
      throw error;
    }

    // Load all order items.
    const itemsResult = await client.query(
      `SELECT
          product_id,
          variant_id,
          quantity_ordered
       FROM order_details
       WHERE business_id = $1 AND order_id = $2
       ORDER BY product_id, variant_id NULLS FIRST`,
      [businessId, orderId]
    );

    if (!itemsResult.rowCount) {
      const error = new Error("Cannot place an empty order");
      error.statusCode = 400;
      throw error;
    }

    // Validate and lock every stock source before deducting.
    const deductions = [];

    for (const item of itemsResult.rows) {
      if (item.variant_id !== null) {
        const stockResult = await client.query(
          `SELECT variant_quantity
           FROM product_variant
           WHERE business_id = $1
             AND product_id = $2
             AND variant_id = $3
           FOR UPDATE`,
          [businessId, item.product_id, item.variant_id]
        );

        if (!stockResult.rowCount) {
          const error = new Error("Product variant not found");
          error.statusCode = 400;
          throw error;
        }

        const available = Number(stockResult.rows[0].variant_quantity);
        const required = Number(item.quantity_ordered);

        if (available < required) {
          const error = new Error(
            `Insufficient variant stock for product ${item.product_id}`
          );
          error.statusCode = 409;
          throw error;
        }

        deductions.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity_ordered
        });
      } else {
        // Do not permit base-product deduction when variants exist.
        const variantCheck = await client.query(
          `SELECT 1
           FROM product_variant
           WHERE business_id = $1 AND product_id = $2
           LIMIT 1`,
          [businessId, item.product_id]
        );

        if (variantCheck.rowCount) {
          const error = new Error(
            `A variant is required for product ${item.product_id}`
          );
          error.statusCode = 400;
          throw error;
        }

        const stockResult = await client.query(
          `SELECT quantity
           FROM inventory
           WHERE business_id = $1 AND product_id = $2
           FOR UPDATE`,
          [businessId, item.product_id]
        );

        if (!stockResult.rowCount) {
          const error = new Error(
            `Inventory record missing for product ${item.product_id}`
          );
          error.statusCode = 409;
          throw error;
        }

        const available = Number(stockResult.rows[0].quantity);
        const required = Number(item.quantity_ordered);

        if (available < required) {
          const error = new Error(
            `Insufficient stock for product ${item.product_id}`
          );
          error.statusCode = 409;
          throw error;
        }

        deductions.push({
          product_id: item.product_id,
          variant_id: null,
          quantity: item.quantity_ordered
        });
      }
    }

    // All items passed validation. Apply deductions.
    for (const item of deductions) {
      if (item.variant_id !== null) {
        await client.query(
          `UPDATE product_variant
           SET variant_quantity = variant_quantity - $1
           WHERE business_id = $2
             AND product_id = $3
             AND variant_id = $4`,
          [
            item.quantity,
            businessId,
            item.product_id,
            item.variant_id
          ]
        );
      } else {
        await client.query(
          `UPDATE inventory
           SET quantity = quantity - $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE business_id = $2
             AND product_id = $3`,
          [
            item.quantity,
            businessId,
            item.product_id
          ]
        );
      }
    }

    // Record the one-time stock deduction.
    await client.query(
      `INSERT INTO order_stock_deduction
        (business_id, order_id)
       VALUES ($1, $2)`,
      [businessId, orderId]
    );

    // Change status only after successful deduction.
    const updatedOrder = await client.query(
      `UPDATE orders
       SET order_status = 'placed'
       WHERE business_id = $1 AND order_id = $2
       RETURNING *`,
      [businessId, orderId]
    );

    await client.query("COMMIT");

    return updatedOrder.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function updateOrderStatus(businessId, orderId, newStatus) {
  const client = await pool.connect();

  const allowedTransitions = {
    draft: ["cancelled"],
    placed: ["processing", "cancelled"],
    processing: ["completed", "cancelled"]
  };

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT order_status
       FROM orders
       WHERE business_id = $1 AND order_id = $2
       FOR UPDATE`,
      [businessId, orderId]
    );

    if (!result.rowCount) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const currentStatus = result.rows[0].order_status;

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      const error = new Error(
        `Cannot change order status from ${currentStatus} to ${newStatus}`
      );
      error.statusCode = 409;
      throw error;
    }

    if (newStatus === "cancelled" && currentStatus !== "draft") {
      const deduction = await client.query(
        `SELECT 1 FROM order_stock_deduction
         WHERE business_id = $1 AND order_id = $2`,
        [businessId, orderId]
      );
      if (!deduction.rowCount) {
        const error = new Error("Cannot restore stock: no stock deduction record exists for this order");
        error.statusCode = 409;
        throw error;
      }

      const restoration = await client.query(
        `SELECT 1 FROM order_stock_restoration
         WHERE business_id = $1 AND order_id = $2`,
        [businessId, orderId]
      );
      if (restoration.rowCount) {
        const error = new Error("Stock for this order has already been restored");
        error.statusCode = 409;
        throw error;
      }

      const items = await client.query(
        `SELECT product_id, variant_id, quantity_ordered
         FROM order_details
         WHERE business_id = $1 AND order_id = $2`,
        [businessId, orderId]
      );

      for (const item of items.rows) {
        if (item.variant_id !== null) {
          const updatedVariant = await client.query(
            `UPDATE product_variant
             SET variant_quantity = variant_quantity + $1
             WHERE business_id = $2 AND product_id = $3 AND variant_id = $4
             RETURNING variant_id`,
            [item.quantity_ordered, businessId, item.product_id, item.variant_id]
          );
          if (!updatedVariant.rowCount) throw new Error("Could not restore variant inventory");
        } else {
          const updatedInventory = await client.query(
            `UPDATE inventory
             SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
             WHERE business_id = $2 AND product_id = $3
             RETURNING inventory_id`,
            [item.quantity_ordered, businessId, item.product_id]
          );
          if (!updatedInventory.rowCount) throw new Error("Could not restore standard inventory");
        }
      }

      await client.query(
        `INSERT INTO order_stock_restoration (business_id, order_id)
         VALUES ($1, $2)
         ON CONFLICT (business_id, order_id) DO NOTHING`,
        [businessId, orderId]
      );
    }

    const updated = await client.query(
      `UPDATE orders
       SET order_status = $1
       WHERE business_id = $2 AND order_id = $3
       RETURNING *`,
      [newStatus, businessId, orderId]
    );

    await client.query("COMMIT");
    return updated.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function updatePaymentStatus(businessId, orderId, newStatus) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT payment_status
       FROM orders
       WHERE business_id = $1 AND order_id = $2
       FOR UPDATE`,
      [businessId, orderId]
    );

    if (!result.rowCount) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const currentStatus = result.rows[0].payment_status;

    const allowedTransitions = {
      pending: ["paid", "partially_paid", "refunded"],
      partially_paid: ["paid", "refunded"],
      paid: ["refunded"],
      refunded: []
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)
        && currentStatus !== newStatus) {
      const error = new Error(
        `Cannot change payment status from ${currentStatus} to ${newStatus}`
      );
      error.statusCode = 409;
      throw error;
    }

    const updated = await client.query(
      `UPDATE orders
       SET payment_status = $1
       WHERE business_id = $2 AND order_id = $3
       RETURNING *`,
      [newStatus, businessId, orderId]
    );

    await client.query("COMMIT");
    return updated.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function updateDeliveryStatus(businessId, orderId, newStatus) {
  const client = await pool.connect();

  const allowedTransitions = {
    pending: ["preparing", "cancelled"],
    preparing: ["dispatched", "cancelled"],
    dispatched: ["delivered"],
    delivered: [],
    cancelled: [],
    not_required: []
  };

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT delivery_status
       FROM orders
       WHERE business_id = $1 AND order_id = $2
       FOR UPDATE`,
      [businessId, orderId]
    );

    if (!result.rowCount) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const currentStatus = result.rows[0].delivery_status;

    if (!allowedTransitions[currentStatus]?.includes(newStatus)
        && currentStatus !== newStatus) {
      const error = new Error(
        `Cannot change delivery status from ${currentStatus} to ${newStatus}`
      );
      error.statusCode = 409;
      throw error;
    }

    const updated = await client.query(
      `UPDATE orders
       SET delivery_status = $1
       WHERE business_id = $2 AND order_id = $3
       RETURNING *`,
      [newStatus, businessId, orderId]
    );

    await client.query("COMMIT");
    return updated.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createDraftOrder,
  getOrders,
  getOrderById,
  placeOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateDeliveryStatus
};