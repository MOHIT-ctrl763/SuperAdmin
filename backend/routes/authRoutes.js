const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateSuperAdmin } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);
router.post('/send-email-otp', authController.sendEmailOtp);
router.post('/verify-email-otp', authController.verifyEmailOtp);
router.get('/me', authenticateSuperAdmin, authController.getMe);
router.post('/impersonate', authenticateSuperAdmin, authController.impersonate);

module.exports = router;
