const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('users.view'), userController.getUsers);
router.post('/', requirePermission('users.create'), userController.createUser);
router.put('/:id', requirePermission('users.update'), userController.updateUser);
router.patch('/:id/toggle-status', requirePermission('users.suspend'), userController.toggleStatus);
router.post('/:id/reset-password', requirePermission('users.update'), userController.resetPassword);
router.delete('/:id', requirePermission('users.delete'), userController.deleteUser);

module.exports = router;
