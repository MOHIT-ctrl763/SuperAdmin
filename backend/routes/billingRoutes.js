const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get(['/invoices', '/billing/invoices'], requirePermission('invoices.view'), billingController.getInvoices);
router.post(['/invoices/:id/mark-paid', '/billing/invoices/:id/mark-paid'], requirePermission('invoices.update'), billingController.markInvoicePaid);
router.get(['/payments', '/billing/payments'], requirePermission('payments.view'), billingController.getPayments);
router.post(['/payments/:id/refund', '/billing/payments/:id/refund'], requirePermission('payments.refund'), billingController.refundPayment);

module.exports = router;
