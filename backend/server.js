require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { initSchema } = require('./db/database');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const userRoutes = require('./routes/userRoutes');
const planRoutes = require('./routes/planRoutes');
const featureRoutes = require('./routes/featureRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const billingRoutes = require('./routes/billingRoutes');
const couponRoutes = require('./routes/couponRoutes');
const usageRoutes = require('./routes/usageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const settingRoutes = require('./routes/settingRoutes');
const supportRoutes = require('./routes/supportRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const searchRoutes = require('./routes/searchRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const crmRoutes = require('./routes/crmRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL (superadmin_db)',
    service: 'Super Admin Standalone API'
  });
});

// Mount Super Admin API Endpoints
app.use('/api/super-admin/auth', authRoutes);
app.use('/api/super-admin/dashboard', dashboardRoutes);
app.use('/api/super-admin/organizations', organizationRoutes);
app.use('/api/super-admin/users', userRoutes);
app.use('/api/super-admin/roles', roleRoutes);
app.use('/api/super-admin/permissions', permissionRoutes);
app.use('/api/super-admin/plans', planRoutes);
app.use('/api/super-admin/features', featureRoutes);
app.use('/api/super-admin/subscriptions', subscriptionRoutes);
app.use('/api/super-admin', billingRoutes); // Handles /invoices, /payments, /billing/invoices, /billing/payments
app.use('/api/super-admin/coupons', couponRoutes);
app.use('/api/super-admin/usage', usageRoutes);
app.use('/api/super-admin/notifications', notificationRoutes);
app.use('/api/super-admin/audit-logs', auditRoutes);
app.use('/api/super-admin/settings', settingRoutes);
app.use('/api/super-admin/support', supportRoutes);
app.use('/api/super-admin/search', searchRoutes);
app.use('/api/super-admin/analytics', analyticsRoutes);
app.use('/api/super-admin/crm', crmRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SUPER_ADMIN_ERROR]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start Server with PostgreSQL DB auto-init
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🛡️ Super Admin PostgreSQL Backend running on port ${PORT}`);
      console.log(`🐘 Database: superadmin_db (PostgreSQL localhost:5432)`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`⚡ Health: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);

      // Start Subscription Lifecycle Automation worker
      const { startAutomationWorker } = require('./services/subscriptionAutomationService');
      startAutomationWorker();
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
