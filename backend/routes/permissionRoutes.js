const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('permissions.view'), roleController.getAllPermissions);

module.exports = router;
