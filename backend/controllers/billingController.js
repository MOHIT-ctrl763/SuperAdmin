const { query } = require('../db/database');

exports.getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = (req.query.status || 'ALL').toUpperCase();
    const search = (req.query.search || '').trim();

    let sql = 'SELECT * FROM saas_invoices WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM saas_invoices WHERE 1=1';
    const params = [];

    if (status !== 'ALL') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
      countSql += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (invoice_number ILIKE $${params.length} OR organization_name ILIKE $${params.length})`;
      countSql += ` AND (invoice_number ILIKE $${params.length} OR organization_name ILIKE $${params.length})`;
    }

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const offsetIdx = params.length + 2;
    const limitIdx = params.length + 1;
    sql += ` ORDER BY id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const itemsRes = await query(sql, [...params, limit, (page - 1) * limit]);

    const items = itemsRes.rows.map(row => {
      const amt = parseFloat(row.amount || 0);
      const tax = parseFloat((amt * 0.18).toFixed(2));
      const subtotal = parseFloat((amt - tax).toFixed(2));
      return {
        ...row,
        amount: amt,
        total: amt,
        subtotal: subtotal > 0 ? subtotal : amt,
        tax: tax,
        invoice_date: row.created_at
      };
    });

    return res.json({
      success: true,
      data: {
        items,
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

exports.getPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = (req.query.status || 'ALL').toUpperCase();
    const search = (req.query.search || '').trim();

    let sql = 'SELECT * FROM saas_payments WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM saas_payments WHERE 1=1';
    const params = [];

    if (status !== 'ALL') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
      countSql += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (payment_id ILIKE $${params.length} OR organization_name ILIKE $${params.length})`;
      countSql += ` AND (payment_id ILIKE $${params.length} OR organization_name ILIKE $${params.length})`;
    }

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const offsetIdx = params.length + 2;
    const limitIdx = params.length + 1;
    sql += ` ORDER BY id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const itemsRes = await query(sql, [...params, limit, (page - 1) * limit]);

    const items = itemsRes.rows.map(row => {
      const amt = parseFloat(row.amount || 0);
      const tax = parseFloat((amt * 0.18).toFixed(2));
      const subtotal = parseFloat((amt - tax).toFixed(2));
      return {
        ...row,
        transaction_id: row.payment_id,
        amount: subtotal > 0 ? subtotal : amt,
        tax_amount: tax,
        total_amount: amt,
        gateway: row.method || 'STRIPE',
        payment_method: row.method || 'Card',
        email: `billing@org${row.organization_id}.com`,
        plan_name: 'Pro Tier'
      };
    });

    return res.json({
      success: true,
      data: {
        items,
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

exports.markInvoicePaid = async (req, res) => {
  try {
    const invRes = await query('SELECT * FROM saas_invoices WHERE id = $1', [req.params.id]);
    if (invRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const inv = invRes.rows[0];
    await query("UPDATE saas_invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = $1", [inv.id]);

    await query(`
      INSERT INTO saas_payments (payment_id, organization_id, organization_name, amount, currency, method, status)
      VALUES ($1, $2, $3, $4, $5, 'MANUAL_SUPERADMIN', 'SUCCESS')
    `, [`PAY-${Date.now().toString().slice(-6)}`, inv.organization_id, inv.organization_name, inv.amount, inv.currency || 'USD']);

    return res.json({ success: true, message: 'Invoice marked as paid' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { reason } = req.body;
    const payRes = await query('SELECT * FROM saas_payments WHERE id = $1', [req.params.id]);
    if (payRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });

    await query("UPDATE saas_payments SET status = 'REFUNDED' WHERE id = $1", [req.params.id]);

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'PAYMENT_REFUND', 'BILLING', $4)
    `, [req.user.id, req.user.name, payRes.rows[0].organization_id, `Refunded payment ${payRes.rows[0].payment_id}: ${reason || 'Customer request'}`]);

    return res.json({ success: true, message: 'Payment marked as refunded' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
