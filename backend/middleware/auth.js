const jwt = require('jsonwebtoken');
const { getUserRoles, getUserPermissions } = require('../services/rbacService');

const JWT_SECRET = process.env.JWT_SECRET || 'superadmin_jwt_secret_standalone_9283749283472';

async function authenticateSuperAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication session token required.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user's assigned roles
    const roles = await getUserRoles(decoded.id);
    const isSuperAdmin = roles.some(r => r.slug === 'super_admin') || decoded.role === 'super_admin' || decoded.role_name === 'SUPER_ADMIN';

    // Verify user is an authorized internal admin (either has an internal role, or is legacy super admin)
    if (roles.length === 0 && !isSuperAdmin && decoded.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Only authorized administrators can access this console.'
      });
    }

    req.user = {
      ...decoded,
      roles,
      isSuperAdmin
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.'
    });
  }
}

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // Super Admin bypasses all individual permission checks
      if (req.user.isSuperAdmin) {
        return next();
      }

      const permissions = await getUserPermissions(req.user.id);
      if (permissions.includes('*') || permissions.includes(permissionCode)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to perform this action (${permissionCode}).`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
}

function requireAnyPermission(permissionCodes = []) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      if (req.user.isSuperAdmin) {
        return next();
      }

      const permissions = await getUserPermissions(req.user.id);
      const hasAny = permissions.includes('*') || permissionCodes.some(p => permissions.includes(p));

      if (hasAny) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have any of the required permissions (${permissionCodes.join(', ')}).`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
}

module.exports = {
  authenticateSuperAdmin,
  requirePermission,
  requireAnyPermission,
  JWT_SECRET
};
