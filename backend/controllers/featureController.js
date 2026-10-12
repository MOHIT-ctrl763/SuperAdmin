const { query } = require('../db/database');

exports.getFeatures = async (req, res) => {
  try {
    const featRes = await query('SELECT * FROM saas_features ORDER BY id ASC');
    return res.json({ success: true, data: featRes.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createFeature = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const code = (req.body.code || req.body.key || name.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
    const category = req.body.category || 'CORE';
    const description = req.body.description || '';

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Feature name and key/code are required' });
    }

    const result = await query(`
      INSERT INTO saas_features (name, code, category, description, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [name, code, category, description]);

    return res.status(201).json({ success: true, message: 'Feature added', data: result.rows[0] });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const featRes = await query('SELECT id, is_active FROM saas_features WHERE id = $1', [req.params.id]);
    if (featRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Feature not found' });

    const newStatus = !featRes.rows[0].is_active;
    await query('UPDATE saas_features SET is_active = $1 WHERE id = $2', [newStatus, req.params.id]);

    return res.json({ success: true, message: `Feature ${newStatus ? 'enabled' : 'disabled'}`, data: { isActive: newStatus } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteFeature = async (req, res) => {
  try {
    await query('DELETE FROM saas_features WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Feature deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
