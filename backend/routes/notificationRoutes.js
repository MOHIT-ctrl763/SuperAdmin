const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notificationController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('notifications.view'), notifController.getNotifications);
router.post('/mark-read', requirePermission('notifications.view'), notifController.markRead);
router.post('/broadcast', requirePermission('notifications.send'), notifController.broadcast);
router.patch('/:id/read', requirePermission('notifications.view'), notifController.markRead);

module.exports = router;
