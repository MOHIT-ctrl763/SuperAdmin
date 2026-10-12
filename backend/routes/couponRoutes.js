const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticateSuperAdmin, requirePermission } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', requirePermission('coupons.view'), couponController.getCoupons);
router.post('/', requirePermission('coupons.create'), couponController.createCoupon);
router.patch('/:id/toggle-status', requirePermission('coupons.update'), couponController.toggleStatus);
router.delete('/:id', requirePermission('coupons.delete'), couponController.deleteCoupon);

module.exports = router;
