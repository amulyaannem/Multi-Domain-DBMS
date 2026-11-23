const pool = require("../config/db");

async function registerBusiness(userId, data) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Verify business type
        const typeResult = await client.query(
            `SELECT business_type_id
             FROM business_type
             WHERE business_type_id = $1`,
            [data.business_type_id]
        );

        if (typeResult.rowCount === 0) {
            throw new Error("BUSINESS_TYPE_NOT_FOUND");
        }

        // 2. Create business
        const businessResult = await client.query(
            `INSERT INTO business
                (business_name, business_type_id, currency_code)
             VALUES ($1, $2, $3)
             RETURNING business_id, business_name,
                       business_type_id, currency_code, created_at`,
            [
                data.business_name,
                data.business_type_id,
                data.currency_code,
            ]
        );

        const business = businessResult.rows[0];

        // 3. Fetch default modules for this business type
        const moduleResult = await client.query(
            `SELECT module_id, default_enabled
             FROM business_type_module
             WHERE business_type_id = $1`,
            [data.business_type_id]
        );

        if (moduleResult.rowCount === 0) {
            throw new Error("NO_DEFAULT_MODULES");
        }

        // 4. Activate modules for the new business
        await client.query(
            `INSERT INTO business_module
                (business_id, module_id, enabled)
             SELECT $1, module_id, default_enabled
             FROM business_type_module
             WHERE business_type_id = $2`,
            [business.business_id, data.business_type_id]
        );

        // 5. Assign registering user as owner
        await client.query(
            `INSERT INTO business_member
                (user_id, business_id, member_role)
             VALUES ($1, $2, 'owner')`,
            [userId, business.business_id]
        );

        // 6. Retrieve activated modules
        const activatedModules = await client.query(
            `SELECT
                m.module_id,
                m.module_name,
                m.module_key,
                bm.enabled
             FROM business_module bm
             JOIN module m
               ON m.module_id = bm.module_id
             WHERE bm.business_id = $1
             ORDER BY m.module_id`,
            [business.business_id]
        );

        await client.query("COMMIT");

        return {
            business,
            modules: activatedModules.rows,
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

async function getUserBusinesses(userId) {
    const result = await pool.query(
        `SELECT
            b.business_id,
            b.business_name,
            b.business_type_id,
            b.currency_code,
            bm.member_role,
            b.created_at
         FROM business_member bm
         JOIN business b
           ON b.business_id = bm.business_id
         WHERE bm.user_id = $1
         ORDER BY b.created_at DESC`,
        [userId]
    );

    return result.rows;
}

async function getBusinessById(userId, businessId) {
  const result = await pool.query(
    `SELECT b.business_id,b.business_name,b.business_type_id,b.currency_code,b.created_at,
            bm.member_role
     FROM business_member bm
     JOIN business b ON b.business_id=bm.business_id
     WHERE bm.user_id=$1 AND bm.business_id=$2`,
    [userId, businessId]
  );
  return result.rows[0] || null;
}

async function updateBusiness(userId, businessId, data) {
  const member = await getBusinessById(userId, businessId);
  if (!member) return null;
  if (!["owner", "manager"].includes(member.member_role)) {
    const error = new Error("Insufficient permissions"); error.statusCode=403; throw error;
  }
  const fields=[]; const values=[businessId];
  if (Object.hasOwn(data,"business_name")) { values.push(data.business_name); fields.push(`business_name=$${values.length}`); }
  if (Object.hasOwn(data,"currency_code")) { values.push(data.currency_code); fields.push(`currency_code=$${values.length}`); }
  if (!fields.length) return member;
  const result=await pool.query(`UPDATE business SET ${fields.join(", ")} WHERE business_id=$1 RETURNING business_id,business_name,business_type_id,currency_code,created_at`,values);
  return { ...result.rows[0], member_role: member.member_role };
}

async function getBusinessModules(businessId) {
  const result=await pool.query(
    `SELECT m.module_id,m.module_name,m.module_key,m.description,bm.enabled,bm.activated_at
     FROM business_module bm JOIN module m ON m.module_id=bm.module_id
     WHERE bm.business_id=$1 ORDER BY m.module_id`,
    [businessId]
  );
  return result.rows;
}

async function setBusinessModule(userId,businessId,moduleId,enabled) {
  const member=await getBusinessById(userId,businessId);
  if (!member) return null;
  if (member.member_role!=="owner") { const error=new Error("Only owners can change modules"); error.statusCode=403; throw error; }
  const result=await pool.query(
    `UPDATE business_module SET enabled=$3,activated_at=CURRENT_TIMESTAMP
     WHERE business_id=$1 AND module_id=$2
     RETURNING business_id,module_id,enabled,activated_at`,
    [businessId,moduleId,enabled]
  );
  return result.rows[0] || null;
}

async function getBusinessMembers(userId,businessId) {
  const member=await getBusinessById(userId,businessId);
  if (!member) return null;
  const result=await pool.query(
    `SELECT bm.membership_id,bm.user_id,au.full_name,au.email,bm.member_role,bm.joined_at,au.is_active
     FROM business_member bm JOIN app_user au ON au.user_id=bm.user_id
     WHERE bm.business_id=$1 ORDER BY bm.joined_at`,
    [businessId]
  );
  return result.rows;
}

async function updateBusinessMember(userId,businessId,membershipId,newRole) {
  const member=await getBusinessById(userId,businessId);
  if (!member) return null;
  if (member.member_role!=="owner") { const error=new Error("Only owners can change member roles"); error.statusCode=403; throw error; }
  const target=await pool.query(`SELECT user_id,member_role FROM business_member WHERE business_id=$1 AND membership_id=$2`,[businessId,membershipId]);
  if (!target.rowCount) return null;
  if (target.rows[0].member_role==="owner") { const error=new Error("Owner role cannot be changed"); error.statusCode=409; throw error; }
  if (target.rows[0].user_id===Number(userId)) { const error=new Error("You cannot change your own membership role"); error.statusCode=409; throw error; }
  const result=await pool.query(
    `UPDATE business_member SET member_role=$3 WHERE business_id=$1 AND membership_id=$2 AND member_role<> 'owner'
     RETURNING membership_id,user_id,member_role,joined_at`,
    [businessId,membershipId,newRole]
  );
  return result.rows[0] || null;
}

async function removeBusinessMember(userId,businessId,membershipId) {
  const member=await getBusinessById(userId,businessId);
  if (!member) return null;
  if (member.member_role!=="owner") { const error=new Error("Only owners can remove members"); error.statusCode=403; throw error; }
  const target=await pool.query(`SELECT user_id,member_role FROM business_member WHERE business_id=$1 AND membership_id=$2`,[businessId,membershipId]);
  if (!target.rowCount) return null;
  if (target.rows[0].member_role==="owner") { const error=new Error("Owner membership cannot be removed"); error.statusCode=409; throw error; }
  if (target.rows[0].user_id===Number(userId)) { const error=new Error("You cannot remove your own membership"); error.statusCode=409; throw error; }
  const result=await pool.query(`DELETE FROM business_member WHERE business_id=$1 AND membership_id=$2 AND member_role<> 'owner' RETURNING membership_id,user_id,member_role`,[businessId,membershipId]);
  return result.rows[0] || null;
}

module.exports = {
    registerBusiness,
    getUserBusinesses,
    getBusinessById,
    updateBusiness,
    getBusinessModules,
    setBusinessModule,
    getBusinessMembers,
    updateBusinessMember,
    removeBusinessMember,
};