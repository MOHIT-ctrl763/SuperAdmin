const { query } = require('../db/database');

exports.getSettings = async (req, res) => {
  try {
    const setsRes = await query('SELECT key, value FROM system_settings');
    const settings = {};
    for (const row of setsRes.rows) {
      let val = row.value;
      try {
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          val = JSON.parse(val);
        }
      } catch (e) {
        // keep as string
      }
      settings[row.key] = val;
    }
    return res.json({ success: true, data: settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const payload = req.body;
    
    // Check if payload is in single setting format: { key, value }
    if (payload.key !== undefined && payload.value !== undefined) {
      const valStr = typeof payload.value === 'object' ? JSON.stringify(payload.value) : String(payload.value);
      await query(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `, [payload.key, valStr]);
    } else {
      for (const [key, value] of Object.entries(payload)) {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await query(`
          INSERT INTO system_settings (key, value, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `, [key, valStr]);
      }
    }

    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details)
      VALUES ($1, $2, 'UPDATE_SETTINGS', 'SETTINGS', 'Updated system platform configurations')
    `, [req.user?.id || 1, req.user?.name || 'Super Admin']);

    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
