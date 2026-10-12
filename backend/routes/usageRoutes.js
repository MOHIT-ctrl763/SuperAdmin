const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('usage.view'), usageController.getUsage);

module.exports = router;
