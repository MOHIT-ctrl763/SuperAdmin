const express = require('express');
const router = express.Router();
const orgController = require('../controllers/organizationController');
const { authenticateSuperAdmin, requirePermission, requireAnyPermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requireAnyPermission(['organizations.view', 'trials.view']), orgController.getOrganizations);
router.get('/:id', requirePermission('organizations.view'), orgController.getOrganizationById);
router.post('/', requirePermission('organizations.create'), orgController.createOrganization);
router.post('/:id/suspend', requirePermission('organizations.suspend'), orgController.suspendOrganization);
router.post('/:id/activate', requirePermission('organizations.suspend'), orgController.activateOrganization);
router.post('/:id/change-plan', requireAnyPermission(['organizations.update', 'trials.update']), orgController.changePlan);
router.post('/:id/convert-to-paid', requireAnyPermission(['organizations.update', 'trials.update']), orgController.convertToPaid || orgController.changePlan);
router.post('/:id/extend-trial', requireAnyPermission(['organizations.update', 'trials.update']), orgController.extendTrial);
router.delete('/:id', requirePermission('organizations.delete'), orgController.deleteOrganization);

module.exports = router;
