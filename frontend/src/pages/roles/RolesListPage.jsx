import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Lock,
  Unlock,
  Users,
  Key,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  CheckSquare,
  Square,
  Filter,
  Sparkles,
  Info
} from 'lucide-react';

export function RolesListPage() {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, SYSTEM, CUSTOM

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState(null);
  const [roleDetailLoading, setRoleDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state for Create / Edit
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_active: true,
    permissionCodes: []
  });

  // Search filter inside permissions selection modal
  const [permSearch, setPermSearch] = useState('');

  const toast = useToast();
  const { hasPermission, isSuperAdmin } = useAuth();

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/roles');
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load roles list');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/permissions');
      if (res.success && res.data) {
        setAllPermissions(res.data);
      }
    } catch (err) {
      console.error('Failed to load permissions catalog:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const map = {};
    allPermissions.forEach((p) => {
      const mod = p.module || 'general';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    });
    return map;
  }, [allPermissions]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setForm({
      name: '',
      description: '',
      is_active: true,
      permissionCodes: []
    });
    setPermSearch('');
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = async (role) => {
    setSelectedRole(role);
    setRoleDetailLoading(true);
    setEditModalOpen(true);
    setPermSearch('');

    try {
      const res = await api.get(`/roles/${role.id}`);
      if (res.success && res.data) {
        setSelectedRole(res.data);
        setForm({
          name: res.data.name || '',
          description: res.data.description || '',
          is_active: res.data.is_active !== false,
          permissionCodes: res.data.permissionCodes || []
        });
      }
    } catch (err) {
      toast.error('Failed to load role details');
    } finally {
      setRoleDetailLoading(false);
    }
  };

  // Open View Modal
  const handleOpenView = async (role) => {
    setSelectedRole(role);
    setRoleDetailLoading(true);
    setViewModalOpen(true);

    try {
      const res = await api.get(`/roles/${role.id}`);
      if (res.success && res.data) {
        setSelectedRole(res.data);
      }
    } catch (err) {
      toast.error('Failed to load role details');
    } finally {
      setRoleDetailLoading(false);
    }
  };

  // Open Delete Dialog
  const handleOpenDelete = (role) => {
    if (role.is_system) {
      toast.error('System roles cannot be deleted to ensure platform security.');
      return;
    }
    setSelectedRole(role);
    setDeleteModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/roles', {
        name: form.name.trim(),
        description: form.description.trim(),
        permissionCodes: form.permissionCodes
      });

      if (res.success) {
        toast.success(res.message || 'Custom role created successfully');
        setCreateModalOpen(false);
        fetchRoles();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create role');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;

    setActionLoading(true);
    try {
      const res = await api.put(`/roles/${selectedRole.id}`, {
        name: selectedRole.is_system ? selectedRole.name : form.name.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
        permissionCodes: selectedRole.slug === 'super_admin' ? undefined : form.permissionCodes
      });

      if (res.success) {
        toast.success(res.message || 'Role updated successfully');
        setEditModalOpen(false);
        fetchRoles();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Delete
  const handleDeleteConfirm = async () => {
    if (!selectedRole) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/roles/${selectedRole.id}`);
      if (res.success) {
        toast.success(res.message || 'Role deleted successfully');
        setDeleteModalOpen(false);
        fetchRoles();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setActionLoading(false);
    }
  };

  // Permission Selection Helpers
  const togglePermission = (code) => {
    setForm((prev) => {
      const exists = prev.permissionCodes.includes(code);
      return {
        ...prev,
        permissionCodes: exists
          ? prev.permissionCodes.filter((c) => c !== code)
          : [...prev.permissionCodes, code]
      };
    });
  };

  const handleSelectAllPermissions = () => {
    setForm((prev) => ({
      ...prev,
      permissionCodes: allPermissions.map((p) => p.code)
    }));
  };

  const handleDeselectAllPermissions = () => {
    setForm((prev) => ({
      ...prev,
      permissionCodes: []
    }));
  };

  const handleToggleModulePermissions = (moduleName) => {
    const modulePerms = permissionsByModule[moduleName] || [];
    const moduleCodes = modulePerms.map((p) => p.code);
    const allSelected = moduleCodes.every((c) => form.permissionCodes.includes(c));

    setForm((prev) => ({
      ...prev,
      permissionCodes: allSelected
        ? prev.permissionCodes.filter((c) => !moduleCodes.includes(c))
        : Array.from(new Set([...prev.permissionCodes, ...moduleCodes]))
    }));
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const matchSearch =
        (role.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (role.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (role.slug || '').toLowerCase().includes(search.toLowerCase());

      const matchType =
        typeFilter === 'ALL' ||
        (typeFilter === 'SYSTEM' && role.is_system) ||
        (typeFilter === 'CUSTOM' && !role.is_system);

      return matchSearch && matchType;
    });
  }, [roles, search, typeFilter]);

  // Table Columns
  const columns = [
    {
      key: 'name',
      label: 'Role Information',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              row.is_system
                ? 'bg-blue-600/15 text-blue-600 border border-blue-500/30'
                : 'bg-purple-600/15 text-purple-600 border border-purple-500/30'
            }`}
          >
            {row.slug === 'super_admin' ? (
              <ShieldCheck className="w-5 h-5 stroke-[2.3]" />
            ) : row.is_system ? (
              <Shield className="w-5 h-5 stroke-[2.3]" />
            ) : (
              <Sparkles className="w-5 h-5 stroke-[2.3]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">{row.name}</span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                {row.slug}
              </span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1 max-w-sm mt-0.5">
              {row.description || 'No description provided'}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Role Type',
      render: (row) =>
        row.is_system ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-300">
            <Lock className="w-3 h-3 stroke-[2.5]" />
            SYSTEM
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300">
            <Unlock className="w-3 h-3 stroke-[2.5]" />
            CUSTOM
          </span>
        )
    },
    {
      key: 'permission_count',
      label: 'Permissions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-bold text-slate-800 text-xs">
            {row.slug === 'super_admin' ? (
              <span className="text-emerald-700 font-extrabold">All ({allPermissions.length || 64})</span>
            ) : (
              `${row.permission_count || 0} granted`
            )}
          </span>
        </div>
      )
    },
    {
      key: 'user_count',
      label: 'Assigned Users',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-800 text-xs">{row.user_count || 0} admins</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.is_active !== false ? 'ACTIVE' : 'SUSPENDED'}>
          {row.is_active !== false ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: 'Created Date',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-500">
          {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'System Default'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* View Details */}
          <button
            onClick={() => handleOpenView(row)}
            title="View Role & Permissions"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4 stroke-[2.3]" />
          </button>

          {/* Edit Role */}
          <PermissionGuard permission="roles.update">
            <button
              onClick={() => handleOpenEdit(row)}
              title="Edit Role & Permissions"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 stroke-[2.3]" />
            </button>
          </PermissionGuard>

          {/* Delete Role (Custom only) */}
          <PermissionGuard permission="roles.delete">
            {row.is_system ? (
              <span
                title="System role is protected from deletion"
                className="p-1.5 text-slate-300 cursor-not-allowed"
              >
                <Lock className="w-4 h-4 stroke-[2]" />
              </span>
            ) : (
              <button
                onClick={() => handleOpenDelete(row)}
                title="Delete Custom Role"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 stroke-[2.3]" />
              </button>
            )}
          </PermissionGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Roles Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {roles.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Configure internal Super Admin RBAC access, custom roles, and fine-grained permissions.
          </p>
        </div>

        <PermissionGuard permission="roles.create">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            Create Custom Role
          </button>
        </PermissionGuard>
      </div>

      {/* Role Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">System Default Roles</p>
            <p className="text-base font-semibold text-slate-900">
              {roles.filter((r) => r.is_system).length} Protected Roles
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">Custom Staff Roles</p>
            <p className="text-base font-semibold text-slate-900">
              {roles.filter((r) => !r.is_system).length} Unlimited Custom
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">Granular Permissions</p>
            <p className="text-base font-semibold text-slate-900">
              {allPermissions.length || 64} Active across 17 Modules
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles by name or slug..."
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="ALL">All Types</option>
            <option value="SYSTEM">System Default Roles</option>
            <option value="CUSTOM">Custom Created Roles</option>
          </select>
        </div>
      </div>

      {/* Roles Data Table */}
      <DataTable
        columns={columns}
        data={filteredRoles}
        isLoading={isLoading}
        emptyMessage="No roles match your search filters."
      />

      {/* ========================================================
          CREATE CUSTOM ROLE MODAL
         ======================================================== */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Custom Role"
        subtitle="Define a specialized internal staff role and select precise module permissions."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Billing Viewer, Support Tier 2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Role Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the operational scope of this role..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Permissions Header & Global Toggles */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Manage Permissions ({form.permissionCodes.length} selected)
                </h4>
                <p className="text-xs text-slate-500">
                  Select permissions granted to users assigned this role.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPermissions}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllPermissions}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Quick search within permissions */}
            <div className="relative mb-4">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                placeholder="Filter permissions by module or keyword (e.g. refund, view, export)..."
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900"
              />
            </div>

            {/* Grouped Permissions by Module */}
            <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1">
              {Object.entries(permissionsByModule).map(([modName, perms]) => {
                const filteredPerms = perms.filter(
                  (p) =>
                    p.code.toLowerCase().includes(permSearch.toLowerCase()) ||
                    p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                    (p.description || '').toLowerCase().includes(permSearch.toLowerCase())
                );

                if (filteredPerms.length === 0) return null;

                const modCodes = perms.map((p) => p.code);
                const allModSelected = modCodes.every((c) => form.permissionCodes.includes(c));
                const someModSelected = modCodes.some((c) => form.permissionCodes.includes(c));

                return (
                  <div
                    key={modName}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {modName}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          ({perms.length} actions)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleModulePermissions(modName)}
                        className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800"
                      >
                        {allModSelected ? 'Deselect Module' : 'Select Module'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredPerms.map((p) => {
                        const checked = form.permissionCodes.includes(p.code);
                        return (
                          <label
                            key={p.code}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                              checked
                                ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.code)}
                              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="overflow-hidden">
                              <span className="text-xs block leading-tight truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono truncate">
                                {p.code}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {actionLoading ? 'Creating...' : 'Save Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          EDIT ROLE MODAL
         ======================================================== */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedRole?.is_system ? `Edit System Role: ${selectedRole?.name}` : `Edit Role: ${selectedRole?.name}`}
        subtitle="Adjust role metadata, operational status, and assigned permissions."
        maxWidth="max-w-4xl"
      >
        {roleDetailLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">
            Loading role configurations...
          </div>
        ) : (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            {/* System Role Warning Notice */}
            {selectedRole?.is_system && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  This is a predefined system role. Its system identifier ({selectedRole?.slug}) is protected.
                  {selectedRole?.slug === 'super_admin' && (
                    <strong className="block mt-0.5 text-amber-950">
                      Super Admin permanently retains all permissions for platform integrity.
                    </strong>
                  )}
                </span>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  disabled={selectedRole?.is_system}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the operational scope..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Status toggle for custom roles */}
            {!selectedRole?.is_system && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_active" className="text-xs font-extrabold text-slate-700">
                  Role Active (Admins can be assigned to this role)
                </label>
              </div>
            )}

            {/* Permissions list (editable for all except super_admin) */}
            {selectedRole?.slug !== 'super_admin' ? (
              <div className="pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Manage Permissions ({form.permissionCodes.length} selected)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Grant or revoke fine-grained permissions for this role.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPermissions}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Filter */}
                <div className="relative mb-4">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    placeholder="Search permissions..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900"
                  />
                </div>

                <div className="max-h-[360px] overflow-y-auto space-y-4 pr-1">
                  {Object.entries(permissionsByModule).map(([modName, perms]) => {
                    const filteredPerms = perms.filter(
                      (p) =>
                        p.code.toLowerCase().includes(permSearch.toLowerCase()) ||
                        p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                        (p.description || '').toLowerCase().includes(permSearch.toLowerCase())
                    );

                    if (filteredPerms.length === 0) return null;

                    const modCodes = perms.map((p) => p.code);
                    const allModSelected = modCodes.every((c) => form.permissionCodes.includes(c));

                    return (
                      <div
                        key={modName}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            {modName} ({perms.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePermissions(modName)}
                            className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800"
                          >
                            {allModSelected ? 'Deselect Module' : 'Select Module'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {filteredPerms.map((p) => {
                            const checked = form.permissionCodes.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                                  checked
                                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(p.code)}
                                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="overflow-hidden">
                                  <span className="text-xs block leading-tight truncate">{p.name}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono truncate">
                                    {p.code}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <p className="font-extrabold text-slate-800">Unrestricted Full Control</p>
                <p className="mt-1">
                  Super Admin role automatically includes all current and future permissions across every system module.
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Update Role'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================
          VIEW ROLE DETAILS MODAL
         ======================================================== */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Role Details: ${selectedRole?.name}`}
        subtitle={`System Identifier: ${selectedRole?.slug}`}
        maxWidth="max-w-3xl"
      >
        {roleDetailLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">
            Loading details...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold block">Type</span>
                <span className="font-black text-slate-900">
                  {selectedRole?.is_system ? 'System Default' : 'Custom'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Status</span>
                <span className="font-black text-emerald-600">
                  {selectedRole?.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Permissions</span>
                <span className="font-black text-blue-600">
                  {selectedRole?.slug === 'super_admin' ? 'All (64)' : (selectedRole?.permissions?.length || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Assigned Staff</span>
                <span className="font-black text-indigo-600">
                  {selectedRole?.users?.length || selectedRole?.user_count || 0}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                Description
              </span>
              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                {selectedRole?.description || 'No description recorded.'}
              </p>
            </div>

            {/* Assigned Users preview */}
            {selectedRole?.users && selectedRole.users.length > 0 && (
              <div>
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Assigned Staff Members ({selectedRole.users.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedRole.users.map((u) => (
                    <span
                      key={u.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800"
                    >
                      {u.name} <span className="text-slate-400 font-normal">({u.email})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Permissions list */}
            <div>
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
                Assigned Permissions
              </span>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {selectedRole?.slug === 'super_admin' ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl text-xs font-bold">
                    Super Administrator holds full unrestricted authority across all 17 system modules (*).
                  </div>
                ) : selectedRole?.permissions && selectedRole.permissions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRole.permissions.map((p) => (
                      <div
                        key={p.code}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <span className="font-extrabold text-slate-900 block truncate">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">{p.code}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No permissions assigned.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          DELETE CONFIRM DIALOG
         ======================================================== */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Custom Role"
        message={`Are you sure you want to permanently delete the custom role "${selectedRole?.name}"? Any users currently assigned to this role will lose its permissions.`}
        confirmText={actionLoading ? 'Deleting...' : 'Delete Role'}
        variant="danger"
      />
    </div>
  );
}

export default RolesListPage;
