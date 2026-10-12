const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('plans.view'), planController.getPlans);
router.post('/', requirePermission('plans.create'), planController.createPlan);
router.put('/:id', requirePermission('plans.update'), planController.updatePlan);
router.patch('/:id/toggle-status', requirePermission('plans.update'), planController.toggleStatus);
router.delete('/:id', requirePermission('plans.delete'), planController.deletePlan);

module.exports = router;
