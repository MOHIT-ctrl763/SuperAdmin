const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('settings.view'), settingController.getSettings);
router.put('/', requirePermission('settings.update'), settingController.updateSettings);

module.exports = router;
