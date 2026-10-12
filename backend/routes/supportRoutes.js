const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('support.view'), supportController.getTickets);
router.get('/:id', requirePermission('support.view'), supportController.getTicketById);
router.post('/:id/reply', requirePermission('support.update'), supportController.replyTicket);

module.exports = router;
