const rbacService = require('../services/rbacService');

exports.getRoles = async (req, res) => {
  try {
    const roles = await rbacService.getRoles();
    return res.json({ success: true, data: roles });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await rbacService.getRoleById(parseInt(req.params.id, 10));
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    return res.json({ success: true, data: role });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, slug, description, permissionCodes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    // Privilege escalation check: non-super admin cannot grant permissions they don't have
    if (!req.user.isSuperAdmin && Array.isArray(permissionCodes)) {
      const userPerms = await rbacService.getUserPermissions(req.user.id);
      const invalid = permissionCodes.filter(p => !userPerms.includes(p));
      if (invalid.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Privilege Escalation Detected: You cannot grant permissions you do not possess (${invalid.join(', ')}).`
        });
      }
    }

    const createdRole = await rbacService.createRole({
      name,
      slug,
      description,
      permissionCodes
    }, req.user);

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: createdRole
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const { name, description, is_active, permissionCodes } = req.body;

    // Privilege escalation check
    if (!req.user.isSuperAdmin && Array.isArray(permissionCodes)) {
      const userPerms = await rbacService.getUserPermissions(req.user.id);
      const invalid = permissionCodes.filter(p => !userPerms.includes(p));
      if (invalid.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Privilege Escalation Detected: You cannot grant permissions you do not possess (${invalid.join(', ')}).`
        });
      }
    }

    const updatedRole = await rbacService.updateRole(roleId, {
      name,
      description,
      is_active,
      permissionCodes
    }, req.user);

    return res.json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    await rbacService.deleteRole(roleId, req.user);
    return res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.assignUserRoles = async (req, res) => {
  try {
    const { userId, roleIds } = req.body;
    if (!userId || !Array.isArray(roleIds)) {
      return res.status(400).json({ success: false, message: 'userId and roleIds array are required' });
    }

    // Privilege escalation prevention:
    // Only an active Super Admin can assign or revoke the Super Admin role
    const targetRoles = await rbacService.getRoles();
    const assigningSuperAdmin = roleIds.some(rId => {
      const found = targetRoles.find(r => r.id === rId);
      return found && found.slug === 'super_admin';
    });

    if (assigningSuperAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Security Alert: Only a Super Administrator can grant Super Admin privileges.'
      });
    }

    const assigned = await rbacService.assignUserRoles(parseInt(userId, 10), roleIds, req.user);
    return res.json({
      success: true,
      message: 'User roles updated successfully',
      data: assigned
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await rbacService.getAllPermissions();
    return res.json({ success: true, data: permissions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
