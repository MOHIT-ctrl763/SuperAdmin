const { query } = require('../db/database');

exports.getCoupons = async (req, res) => {
  try {
    const coupsRes = await query('SELECT * FROM saas_coupons ORDER BY id DESC');
    const items = coupsRes.rows.map(row => {
      const val = parseFloat(row.discount_value || 0);
      const used = parseInt(row.used_count || 0, 10);
      const limit = parseInt(row.max_uses || 100, 10);
      return {
        ...row,
        discount_value: val,
        times_used: used,
        usage_limit: limit,
        total_discount_granted: parseFloat((val * used).toFixed(2))
      };
    });
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const code = req.body.code;
    const discount_type = req.body.discount_type || req.body.discountType || 'PERCENTAGE';
    const discount_value = req.body.discount_value || req.body.discountValue;
    const max_uses = req.body.max_uses || req.body.usageLimit || 100;
    const expires_at = req.body.expires_at || null;

    if (!code || !discount_value) return res.status(400).json({ success: false, message: 'Code and discount value required' });

    const result = await query(`
      INSERT INTO saas_coupons (code, discount_type, discount_value, max_uses, used_count, is_active, expires_at)
      VALUES ($1, $2, $3, $4, 0, true, $5)
      RETURNING *
    `, [code.toUpperCase().trim(), discount_type, discount_value, max_uses, expires_at]);

    const created = result.rows[0];
    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: {
        ...created,
        times_used: 0,
        usage_limit: parseInt(created.max_uses || 100, 10),
        total_discount_granted: 0
      }
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const coupRes = await query('SELECT id, is_active FROM saas_coupons WHERE id = $1', [req.params.id]);
    if (coupRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Coupon not found' });

    const newStatus = !coupRes.rows[0].is_active;
    await query('UPDATE saas_coupons SET is_active = $1 WHERE id = $2', [newStatus, req.params.id]);

    return res.json({ success: true, message: `Coupon ${newStatus ? 'activated' : 'deactivated'}`, data: { isActive: newStatus } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await query('DELETE FROM saas_coupons WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
