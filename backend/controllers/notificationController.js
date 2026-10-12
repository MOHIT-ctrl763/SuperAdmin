const { query } = require('../db/database');

exports.getNotifications = async (req, res) => {
  try {
    const notifsRes = await query('SELECT * FROM saas_notifications ORDER BY id DESC LIMIT 50');
    const items = notifsRes.rows;
    const unreadCount = items.filter(n => !n.is_read).length;
    return res.json({
      success: true,
      data: {
        items,
        unreadCount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { all } = req.body;
    if (all) {
      await query('UPDATE saas_notifications SET is_read = true');
    } else if (req.params.id) {
      await query('UPDATE saas_notifications SET is_read = true WHERE id = $1', [req.params.id]);
    }
    return res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.broadcast = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message are required' });

    const result = await query(`
      INSERT INTO saas_notifications (title, message, type)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [title, message, type || 'INFO']);

    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details)
      VALUES ($1, $2, 'BROADCAST_NOTIFICATION', 'NOTIFICATIONS', $3)
    `, [req.user.id, req.user.name, `Broadcast: ${title}`]);

    return res.status(201).json({ success: true, message: 'Notification broadcasted', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
