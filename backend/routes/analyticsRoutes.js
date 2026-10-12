const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateSuperAdmin, requireAnyPermission } = require('../middleware/auth');

// Require authentication for all analytics endpoints
router.use(authenticateSuperAdmin);

// Overview metrics (MRR, ARR, ARPU, Churn, Conversion, Totals)
router.get(
  '/overview',
  requireAnyPermission(['dashboard.view', 'analytics.view', 'billing.view']),
  analyticsController.getOverview
);

// Deep revenue breakdown (By plan, method, reconciliation, currency)
router.get(
  '/revenue',
  requireAnyPermission(['dashboard.view', 'analytics.view', 'billing.view']),
  analyticsController.getRevenueAnalytics
);

// Subscription breakdown (Monthly vs Yearly, active tiers, renewal pipeline)
router.get(
  '/subscriptions',
  requireAnyPermission(['dashboard.view', 'analytics.view', 'subscriptions.view']),
  analyticsController.getSubscriptionAnalytics
);

// Customer & Tenant Analytics (Acquisition velocity, status, top revenue accounts)
router.get(
  '/customers',
  requireAnyPermission(['dashboard.view', 'analytics.view', 'organizations.view']),
  analyticsController.getCustomerAnalytics
);

// Trials & Conversion Pipeline (Active trials, expiring, conversion rate)
router.get(
  '/trials',
  requireAnyPermission(['dashboard.view', 'analytics.view', 'trials.view']),
  analyticsController.getTrialAnalytics
);

module.exports = router;
