const { query } = require('../db/database');

exports.getPlans = async (req, res) => {
  try {
    const plansRes = await query('SELECT * FROM saas_plans ORDER BY price_monthly ASC');
    const plans = plansRes.rows.map(p => {
      let feats = [];
      if (Array.isArray(p.features_json)) {
        feats = p.features_json;
      } else if (typeof p.features_json === 'string') {
        try { feats = JSON.parse(p.features_json); } catch(e) { feats = []; }
      }
      const monthly = parseFloat(p.price_monthly || 0);
      const yearly = parseFloat(p.price_yearly || 0);
      const featuresFormatted = feats.map(f => typeof f === 'object' ? f : { id: f, name: String(f) });

      return {
        ...p,
        monthly_price: monthly,
        yearly_price: yearly,
        price_monthly: monthly,
        price_yearly: yearly,
        code: p.slug || p.code || 'PLAN',
        max_customers: p.max_customers || 1000,
        max_storage_mb: (p.max_storage_gb || 25) * 1024,
        trial_days: p.trial_days || 14,
        active_subscribers_count: p.active_subscribers_count || 1,
        features: featuresFormatted
      };
    });

    return res.json({ success: true, data: plans });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Plan name is required' });

    const slug = (req.body.slug || req.body.code || name.toLowerCase().replace(/[^a-z0-9]/g, '-')).trim();
    const description = req.body.description || '';
    
    // Parse prices properly from both naming conventions
    const price_monthly = parseFloat(req.body.price_monthly ?? req.body.monthlyPrice ?? req.body.monthly_price ?? 0);
    const price_yearly = parseFloat(req.body.price_yearly ?? req.body.yearlyPrice ?? req.body.yearly_price ?? 0);
    
    const is_popular = !!(req.body.is_popular ?? req.body.isPopular);
    const max_users = parseInt(req.body.max_users ?? req.body.maxUsers, 10) || 10;
    const max_storage_gb = parseInt(req.body.max_storage_gb, 10) || (req.body.maxStorageMb ? Math.round(parseInt(req.body.maxStorageMb, 10) / 1024) : 25);
    const max_api_calls_per_month = parseInt(req.body.max_api_calls_per_month ?? req.body.maxApiCalls, 10) || 50000;
    
    const features = req.body.features ?? req.body.featureKeys ?? [];
    const featJson = JSON.stringify(Array.isArray(features) ? features : []);

    const result = await query(`
      INSERT INTO saas_plans (name, slug, description, price_monthly, price_yearly, is_active, is_popular, max_users, max_storage_gb, max_api_calls_per_month, features_json)
      VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10::jsonb)
      RETURNING *
    `, [name, slug, description, price_monthly, price_yearly, is_popular, max_users, max_storage_gb, max_api_calls_per_month, featJson]);

    const created = result.rows[0];
    return res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: {
        ...created,
        monthly_price: parseFloat(created.price_monthly || 0),
        yearly_price: parseFloat(created.price_yearly || 0),
        price_monthly: parseFloat(created.price_monthly || 0),
        price_yearly: parseFloat(created.price_yearly || 0)
      }
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Plan name is required' });

    const description = req.body.description || '';
    const price_monthly = parseFloat(req.body.price_monthly ?? req.body.monthlyPrice ?? req.body.monthly_price ?? 0);
    const price_yearly = parseFloat(req.body.price_yearly ?? req.body.yearlyPrice ?? req.body.yearly_price ?? 0);
    const is_popular = !!(req.body.is_popular ?? req.body.isPopular);
    const max_users = parseInt(req.body.max_users ?? req.body.maxUsers, 10) || 10;
    const max_storage_gb = parseInt(req.body.max_storage_gb, 10) || (req.body.maxStorageMb ? Math.round(parseInt(req.body.maxStorageMb, 10) / 1024) : 25);
    const max_api_calls_per_month = parseInt(req.body.max_api_calls_per_month ?? req.body.maxApiCalls, 10) || 50000;
    
    const features = req.body.features ?? req.body.featureKeys ?? [];
    const featJson = JSON.stringify(Array.isArray(features) ? features : []);

    const result = await query(`
      UPDATE saas_plans
      SET name = $1, description = $2, price_monthly = $3, price_yearly = $4, is_popular = $5, max_users = $6, max_storage_gb = $7, max_api_calls_per_month = $8, features_json = $9::jsonb
      WHERE id = $10
      RETURNING *
    `, [name, description, price_monthly, price_yearly, is_popular, max_users, max_storage_gb, max_api_calls_per_month, featJson, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const updated = result.rows[0];
    return res.json({
      success: true,
      message: 'Plan updated successfully',
      data: {
        ...updated,
        monthly_price: parseFloat(updated.price_monthly || 0),
        yearly_price: parseFloat(updated.price_yearly || 0),
        price_monthly: parseFloat(updated.price_monthly || 0),
        price_yearly: parseFloat(updated.price_yearly || 0)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const planRes = await query('SELECT id, is_active FROM saas_plans WHERE id = $1', [req.params.id]);
    if (planRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Plan not found' });

    const newStatus = !planRes.rows[0].is_active;
    await query('UPDATE saas_plans SET is_active = $1 WHERE id = $2', [newStatus, req.params.id]);

    return res.json({ success: true, message: `Plan ${newStatus ? 'activated' : 'deactivated'}`, data: { isActive: newStatus } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.duplicatePlan = async (req, res) => {
  try {
    const planRes = await query('SELECT * FROM saas_plans WHERE id = $1', [req.params.id]);
    if (planRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Plan not found' });

    const plan = planRes.rows[0];
    const newName = `${plan.name} (Copy)`;
    const newSlug = `${plan.slug}-copy-${Date.now()}`;

    const result = await query(`
      INSERT INTO saas_plans (name, slug, description, price_monthly, price_yearly, is_active, is_popular, max_users, max_storage_gb, max_api_calls_per_month, features_json)
      VALUES ($1, $2, $3, $4, $5, true, false, $6, $7, $8, $9)
      RETURNING id
    `, [newName, newSlug, plan.description, plan.price_monthly, plan.price_yearly, plan.max_users, plan.max_storage_gb, plan.max_api_calls_per_month, plan.features_json]);

    return res.status(201).json({ success: true, message: 'Plan duplicated successfully', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    await query('DELETE FROM saas_plans WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
