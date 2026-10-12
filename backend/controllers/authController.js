const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');
const { sendOtpEmail } = require('../services/emailService');
const { getUserRoles, getUserPermissions } = require('../services/rbacService');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    const user = result.rows[0];
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check user's assigned RBAC roles
    const userRoles = await getUserRoles(user.id);
    const isSuperAdmin = userRoles.some(r => r.slug === 'super_admin') || user.role_name === 'SUPER_ADMIN';

    // Must be a platform admin user (have roles or be super admin or organization_id is NULL)
    if (userRoles.length === 0 && !isSuperAdmin && user.organization_id !== null) {
      return res.status(403).json({ success: false, message: 'Access forbidden: Not an authorized platform administrator.' });
    }

    const permissions = await getUserPermissions(user.id);

    // Update last login
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Log audit
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address)
      VALUES ($1, $2, 'AUTH_LOGIN', 'AUTH', $3, $4)
    `, [user.id, user.name, `${isSuperAdmin ? 'Super Administrator' : (userRoles[0]?.name || 'Admin')} logged into control center`, req.ip || '127.0.0.1']);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: isSuperAdmin ? 'super_admin' : (userRoles[0]?.slug || 'admin'),
        role_name: user.role_name,
        isSuperAdmin
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: isSuperAdmin ? 'super_admin' : (userRoles[0]?.slug || 'admin'),
          role_name: user.role_name,
          roleDisplayName: isSuperAdmin ? 'Super Administrator' : (userRoles[0]?.name || user.role_display_name),
          isSuperAdmin,
          roles: userRoles,
          permissions
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, role_name, role_display_name, last_login, is_active FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];
    const userRoles = await getUserRoles(user.id);
    const isSuperAdmin = userRoles.some(r => r.slug === 'super_admin') || user.role_name === 'SUPER_ADMIN';
    const permissions = await getUserPermissions(user.id);

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: isSuperAdmin ? 'super_admin' : (userRoles[0]?.slug || 'admin'),
        role_name: user.role_name,
        roleDisplayName: isSuperAdmin ? 'Super Administrator' : (userRoles[0]?.name || user.role_display_name),
        isSuperAdmin,
        roles: userRoles,
        permissions,
        lastLogin: user.last_login
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.impersonate = async (req, res) => {
  try {
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId is required.' });
    }

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [organizationId]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    const org = orgRes.rows[0];

    const impersonateToken = jwt.sign(
      {
        impersonated: true,
        superAdminId: req.user.id,
        organizationId: org.id,
        organizationName: org.name,
        role: 'ORG_ADMIN'
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details, ip_address)
      VALUES ($1, $2, $3, 'IMPERSONATE', 'AUTH', $4, $5)
    `, [req.user.id, req.user.name, org.id, `Impersonated admin for ${org.name}`, req.ip || '127.0.0.1']);

    return res.json({
      success: true,
      message: `Generated impersonation token for ${org.name}`,
      data: {
        token: impersonateToken,
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Super Admin email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query(
      "SELECT id, name, email FROM users WHERE email = $1 AND role_name = 'SUPER_ADMIN'",
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active Super Administrator found with this email address.'
      });
    }

    const user = userRes.rows[0];

    // Generate random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire existing active resets for this email
    await query(
      "UPDATE saas_password_resets SET is_used = true WHERE email = $1 AND is_used = false",
      [cleanEmail]
    );

    // Insert new reset OTP (valid for 15 minutes)
    await query(`
      INSERT INTO saas_password_resets (email, otp, expires_at, is_used)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes', false)
    `, [cleanEmail, otp]);

    // Log audit
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address)
      VALUES ($1, $2, 'AUTH_PASSWORD_RESET_REQUESTED', 'AUTH', 'Password reset code requested for Super Admin', $3)
    `, [user.id, user.name, req.ip || '127.0.0.1']);

    // Send Live OTP Email via Gmail SMTP
    try {
      await sendOtpEmail({
        to: user.email,
        name: user.name || 'Super Administrator',
        otp,
        expiresInMinutes: 15
      });
    } catch (mailErr) {
      console.error('⚠️ SMTP Email error in forgotPassword:', mailErr.message);
      return res.status(500).json({
        success: false,
        message: `Unable to deliver reset code to ${cleanEmail}: ${mailErr.message}. Please check email address or server configuration.`
      });
    }

    return res.json({
      success: true,
      message: `Verification OTP sent to ${cleanEmail}. Please check your email inbox or spam folder.`,
      data: {
        email: cleanEmail,
        expiresInMinutes: 15
      }
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.verifyResetCode = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const resetRes = await query(`
      SELECT * FROM saas_password_resets
      WHERE email = $1 AND otp = $2 AND is_used = false AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail, cleanOtp]);

    if (resetRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new code.'
      });
    }

    return res.json({
      success: true,
      message: 'Verification code verified successfully.'
    });
  } catch (err) {
    console.error('verifyResetCode error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Verify OTP
    const resetRes = await query(`
      SELECT * FROM saas_password_resets
      WHERE email = $1 AND otp = $2 AND is_used = false AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail, cleanOtp]);

    if (resetRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    const userRes = await query(
      "SELECT id, name FROM users WHERE email = $1 AND role_name = 'SUPER_ADMIN'",
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Super Administrator not found.' });
    }

    const user = userRes.rows[0];
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    // Update user password
    await query("UPDATE users SET password = $1 WHERE id = $2", [passwordHash, user.id]);

    // Mark OTP as used
    await query("UPDATE saas_password_resets SET is_used = true WHERE id = $1", [resetRes.rows[0].id]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address)
      VALUES ($1, $2, 'AUTH_PASSWORD_RESET_COMPLETED', 'AUTH', 'Password successfully reset for Super Admin', $3)
    `, [user.id, user.name, req.ip || '127.0.0.1']);

    return res.json({
      success: true,
      message: 'Password has been successfully updated! You can now log in.'
    });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.sendEmailOtp = async (req, res) => {
  try {
    const { email, purpose = 'VERIFICATION', name = 'User' } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate old unverified ones for this email and purpose
    await query(`
      UPDATE saas_email_verifications
      SET is_verified = TRUE
      WHERE email = $1 AND purpose = $2 AND is_verified = FALSE
    `, [cleanEmail, purpose]);

    // Insert new OTP record (15 minutes validity)
    await query(`
      INSERT INTO saas_email_verifications (email, otp, purpose, is_verified, expires_at)
      VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
    `, [cleanEmail, otp, purpose]);

    let title = 'Email Verification Code';
    let subject = `[OrderFlow OMS] Security Verification Code: ${otp}`;
    let description = `A verification request was made for email (${cleanEmail}) on OrderFlow OMS SaaS Platform. Please enter the 6-digit code below to verify:`;

    if (purpose === 'NEW_USER') {
      title = 'New User Account Verification';
      subject = `[OrderFlow OMS] Verify User Account: ${otp}`;
      description = `You are being added to OrderFlow OMS SaaS Platform. Use the 6-digit verification code below to verify your email address:`;
    } else if (purpose === 'NEW_ORG') {
      title = 'Tenant Organization Verification';
      subject = `[OrderFlow OMS] Verify Organization Email: ${otp}`;
      description = `A new organization is being provisioned with contact email (${cleanEmail}). Use the 6-digit code below to verify:`;
    }

    // Dispatch email with strict verification
    try {
      await sendOtpEmail({
        to: cleanEmail,
        name: name || cleanEmail,
        otp,
        expiresInMinutes: 15,
        title,
        subject,
        description
      });
    } catch (mailErr) {
      console.error('⚠️ SMTP Error during sendEmailOtp:', mailErr.message);
      return res.status(500).json({
        success: false,
        message: `Failed to deliver verification email to ${cleanEmail}: ${mailErr.message}. Please verify the address and try again.`
      });
    }

    console.log(`🔑 [EMAIL_OTP] Successfully dispatched to ${cleanEmail} (${purpose})`);

    return res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      data: {
        email: cleanEmail,
        expiresInMinutes: 15
      }
    });
  } catch (err) {
    console.error('sendEmailOtp error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp, purpose = 'VERIFICATION' } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const recordRes = await query(`
      SELECT * FROM saas_email_verifications
      WHERE email = $1 AND otp = $2 AND is_verified = FALSE AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail, cleanOtp]);

    if (recordRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    // Mark as verified
    await query(`
      UPDATE saas_email_verifications
      SET is_verified = TRUE
      WHERE id = $1
    `, [recordRes.rows[0].id]);

    return res.json({
      success: true,
      message: 'Email address verified successfully.',
      data: {
        email: cleanEmail,
        verified: true
      }
    });
  } catch (err) {
    console.error('verifyEmailOtp error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
