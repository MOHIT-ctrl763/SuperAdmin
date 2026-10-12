const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('auditLogs.view'), auditController.getAuditLogs);

module.exports = router;
