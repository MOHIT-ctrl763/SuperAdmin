const express = require('express');
const router = express.Router();
const featureController = require('../controllers/featureController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('features.view'), featureController.getFeatures);
router.post('/', requirePermission('features.create'), featureController.createFeature);
router.patch('/:id/toggle-status', requirePermission('features.activate'), featureController.toggleStatus);
router.delete('/:id', requirePermission('features.delete'), featureController.deleteFeature);

module.exports = router;
