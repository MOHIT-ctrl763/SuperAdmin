const { query } = require('../db/database');

exports.globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || req.query.search || '').trim();
    if (!q) {
      return res.json({
        success: true,
        data: {
          organizations: [],
          users: [],
          plans: []
        }
      });
    }

    const searchTerm = `%${q}%`;

    // 1. Search Organizations
    const orgsRes = await query(`
      SELECT id, name, slug, email, status, plan_name 
      FROM organizations 
      WHERE name ILIKE $1 OR slug ILIKE $1 OR email ILIKE $1 OR owner_name ILIKE $1
      ORDER BY id DESC LIMIT 5
    `, [searchTerm]);

    // 2. Search Users
    const usersRes = await query(`
      SELECT id, name, email, role_name, is_active, organization_id
      FROM users 
      WHERE name ILIKE $1 OR email ILIKE $1
      ORDER BY id DESC LIMIT 5
    `, [searchTerm]);

    // 3. Search Plans
    const plansRes = await query(`
      SELECT id, name, slug, price_monthly, price_yearly, is_active
      FROM saas_plans 
      WHERE name ILIKE $1 OR slug ILIKE $1
      ORDER BY id DESC LIMIT 5
    `, [searchTerm]);

    return res.json({
      success: true,
      data: {
        organizations: orgsRes.rows,
        users: usersRes.rows,
        plans: plansRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
