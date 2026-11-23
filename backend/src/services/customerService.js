
const pool = require("../config/db");

async function createCustomer(businessId, data) {
  const { rows } = await pool.query(
    `INSERT INTO customer
      (business_id, customer_name, phone, email, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      businessId,
      data.customer_name,
      data.phone ?? null,
      data.email ?? null,
      data.address ?? null
    ]
  );

  return rows[0];
}

async function getCustomers(businessId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM customer
     WHERE business_id = $1
     ORDER BY registered_at DESC`,
    [businessId]
  );

  return rows;
}

async function getCustomer(businessId, customerId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM customer
     WHERE business_id = $1 AND customer_id = $2`,
    [businessId, customerId]
  );

  return rows[0] || null;
}

async function updateCustomer(businessId, customerId, data) {
  const allowed = [
    "customer_name",
    "phone",
    "email",
    "address"
  ];

  const fields = Object.keys(data).filter(key =>
    allowed.includes(key)
  );

  if (!fields.length) {
    return getCustomer(businessId, customerId);
  }

  const values = [businessId, customerId];

  const assignments = fields.map((field, index) => {
    values.push(data[field] ?? null);
    return `${field} = $${index + 3}`;
  });

  const { rows } = await pool.query(
    `UPDATE customer
     SET ${assignments.join(", ")}
     WHERE business_id = $1 AND customer_id = $2
     RETURNING *`,
    values
  );

  return rows[0] || null;
}

async function deleteCustomer(businessId, customerId) {
  const { rows } = await pool.query(
    `DELETE FROM customer
     WHERE business_id = $1 AND customer_id = $2
     RETURNING customer_id`,
    [businessId, customerId]
  );

  return rows[0] || null;
}

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer
};
