const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('roles.view'), roleController.getRoles);
router.get('/:id', requirePermission('roles.view'), roleController.getRoleById);
router.post('/', requirePermission('roles.create'), roleController.createRole);
router.put('/:id', requirePermission('roles.update'), roleController.updateRole);
router.delete('/:id', requirePermission('roles.delete'), roleController.deleteRole);
router.post('/assign-user', requirePermission('roles.assign'), roleController.assignUserRoles);

module.exports = router;
