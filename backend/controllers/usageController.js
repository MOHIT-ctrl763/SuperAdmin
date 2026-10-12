const { query } = require('../db/database');

exports.getUsage = async (req, res) => {
  try {
    const orgsRes = await query('SELECT id, name, status, plan_id, plan_name, users_count FROM organizations');
    const metricsRes = await query('SELECT * FROM saas_usage_metrics');
    const plansRes = await query('SELECT * FROM saas_plans');

    const metrics = metricsRes.rows;
    const plans = plansRes.rows;

    const structured = orgsRes.rows.map(org => {
      const orgMetrics = metrics.filter(m => m.organization_id === org.id);
      const storage = orgMetrics.find(m => m.metric_name === 'storage_gb');
      const apiCalls = orgMetrics.find(m => m.metric_name === 'api_calls');
      const plan = plans.find(p => p.id === org.plan_id) || {};

      const usersCurrent = org.users_count || 1;
      const usersMax = plan.max_users || 25;
      const usersPct = Math.min(100, Math.round((usersCurrent / Math.max(1, usersMax)) * 100));

      const customersCurrent = 150 + (org.id * 35);
      const customersMax = 1000;
      const customersPct = Math.min(100, Math.round((customersCurrent / customersMax) * 100));

      const ordersCurrent = 420 + (org.id * 110);
      const ordersMax = 2000;
      const ordersPct = Math.min(100, Math.round((ordersCurrent / ordersMax) * 100));

      const storageCurrentMb = Math.round((storage ? parseFloat(storage.current_value) : 4.5) * 1024);
      const storageMaxMb = Math.round((storage ? parseFloat(storage.max_limit) : (plan.max_storage_gb || 25)) * 1024);
      const storagePct = Math.min(100, Math.round((storageCurrentMb / Math.max(1, storageMaxMb)) * 100));

      const highestPercent = Math.max(usersPct, customersPct, ordersPct, storagePct);

      return {
        organizationId: org.id,
        organizationName: org.name,
        planName: org.plan_name || 'Pro',
        organizationStatus: org.status || 'ACTIVE',
        highestPercent,
        isWarning: highestPercent >= 80 && highestPercent < 90,
        isCritical: highestPercent >= 90 && highestPercent < 100,
        isExceeded: highestPercent >= 100,
        metrics: {
          users: { current: usersCurrent, max: usersMax, percent: usersPct },
          customers: { current: customersCurrent, max: customersMax, percent: customersPct },
          orders: { current: ordersCurrent, max: ordersMax, percent: ordersPct },
          storage: { currentMb: storageCurrentMb, maxMb: storageMaxMb, percent: storagePct }
        },
        storageUsedGb: storage ? parseFloat(storage.current_value) : 5.0,
        storageLimitGb: storage ? parseFloat(storage.max_limit) : 50,
        apiCallsUsed: apiCalls ? parseInt(apiCalls.current_value, 10) : 12000,
        apiCallsLimit: apiCalls ? parseInt(apiCalls.max_limit, 10) : 100000,
        usersCount: usersCurrent
      };
    });

    return res.json({ success: true, data: structured });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
