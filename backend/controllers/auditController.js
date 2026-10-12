const { query } = require('../db/database');

exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const module = (req.query.module || 'ALL').toUpperCase();
    const search = (req.query.search || '').trim();

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const params = [];
    let pIdx = 1;

    if (module !== 'ALL') {
      sql += ` AND module = $${pIdx}`;
      countSql += ` AND module = $${pIdx}`;
      params.push(module);
      pIdx++;
    }

    if (search) {
      sql += ` AND (action ILIKE $${pIdx} OR details ILIKE $${pIdx} OR user_name ILIKE $${pIdx} OR ip_address ILIKE $${pIdx})`;
      countSql += ` AND (action ILIKE $${pIdx} OR details ILIKE $${pIdx} OR user_name ILIKE $${pIdx} OR ip_address ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    sql += ` ORDER BY id DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    const itemsRes = await query(sql, [...params, limit, (page - 1) * limit]);

    return res.json({
      success: true,
      data: {
        items: itemsRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
