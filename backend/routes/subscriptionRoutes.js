const express = require('express');
const router = express.Router();
const subController = require('../controllers/subscriptionController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('subscriptions.view'), subController.getSubscriptions);
router.get('/churn-analytics', requirePermission('subscriptions.view'), subController.getChurnAnalytics);
router.post('/automation/run-check', requirePermission('subscriptions.update'), subController.triggerAutomationCheck);
router.post('/', requirePermission('subscriptions.create'), subController.createSubscription);
router.post('/:id/change-plan', requirePermission('subscriptions.update'), subController.changePlan);
router.post('/:id/extend', requirePermission('subscriptions.renew'), subController.extendSubscription);
router.post('/:id/cancel', requirePermission('subscriptions.cancel'), subController.cancelSubscription);
router.post('/:id/reactivate', requirePermission('subscriptions.update'), subController.reactivateSubscription);
router.delete('/:id', requirePermission('subscriptions.cancel'), subController.deleteSubscription);

module.exports = router;
