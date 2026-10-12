import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Users,
  Plus,
  Search,
  Filter,
  Key,
  Shield,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Building2,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PermissionGuard } from '../../components/auth/PermissionGuard';

export function UsersListPage() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([
    { id: 'SUPER_ADMIN', name: 'SUPER_ADMIN', display_name: 'Super Administrator' },
    { id: 'ORG_ADMIN', name: 'ORG_ADMIN', display_name: 'Organization Admin' },
    { id: 'ORG_MEMBER', name: 'ORG_MEMBER', display_name: 'Organization Member' }
  ]);
  const [allRbacRoles, setAllRbacRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignRolesModalOpen, setAssignRolesModalOpen] = useState(false);
  const [viewPermsModalOpen, setViewPermsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Email OTP verification state for user creation
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleName: 'ORG_ADMIN',
    organizationId: ''
  });

  const toast = useToast();

  const handleSendEmailOtp = async () => {
    if (!form.email || !form.email.includes('@')) {
      toast.error('Please enter a valid email address first.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/send-email-otp', {
        email: form.email,
        purpose: 'NEW_USER',
        name: form.name || 'New User'
      });
      if (res.success) {
        setOtpSent(true);
        setOtpCode(''); // Never autofill; user must enter from their email inbox
        toast.success(res.message || 'Verification OTP sent to email inbox. Please check your email.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-email-otp', {
        email: form.email,
        otp: otpCode,
        purpose: 'NEW_USER'
      });
      if (res.success) {
        setEmailVerified(true);
        toast.success('Email successfully verified with OTP!');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid or expired verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [orgsRes, rolesRes] = await Promise.all([
        api.get('/organizations', { limit: 100 }),
        api.get('/roles').catch(() => ({ success: false }))
      ]);
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data.items || []);
      }
      if (rolesRes && rolesRes.success && rolesRes.data) {
        setAllRbacRoles(rolesRes.data || []);
      }
    } catch (e) {
      console.error('Failed to pre-fetch organizations or roles', e);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const handleOpenAssignRoles = (user) => {
    setSelectedUser(user);
    const existingIds = Array.isArray(user.roles) ? user.roles.map((r) => r.id) : (user.roleIds || []);
    setSelectedRoleIds(existingIds);
    setAssignRolesModalOpen(true);
  };

  const handleToggleRoleId = (id) => {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  const handleSaveAssignRoles = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.post('/roles/assign-user', {
        userId: selectedUser.id,
        roleIds: selectedRoleIds
      });
      if (res.success) {
        toast.success(`Assigned roles updated for ${selectedUser.name}`);
        setAssignRolesModalOpen(false);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user roles');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenViewPerms = (user) => {
    setSelectedUser(user);
    setViewPermsModalOpen(true);
  };

  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/users', {
        page,
        limit: 10,
        search,
        organizationId: orgFilter,
        roleId: roleFilter,
        status: statusFilter === 'ACTIVE' ? 'active' : (statusFilter === 'INACTIVE' ? 'inactive' : '')
      });
      if (res.success && res.data) {
        setUsers(res.data.items);
        setPagination(res.data.pagination);
        if (res.data.filterOptions) {
          if (res.data.filterOptions.roles?.length) setRoles(res.data.filterOptions.roles);
          if (res.data.filterOptions.organizations?.length) setOrganizations(res.data.filterOptions.organizations);
        }
      }
    } catch (err) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [search, orgFilter, roleFilter, statusFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!emailVerified) {
      toast.error('Please verify the user email with OTP before provisioning.');
      return;
    }
    if (form.phone && form.phone.length !== 10) {
      toast.error('Contact phone number must be exactly 10 digits.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post('/users', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        roleName: form.roleName,
        organizationId: form.organizationId ? parseInt(form.organizationId, 10) : null
      });
      if (res.success) {
        toast.success(`User '${res.data?.name || form.name}' created successfully.`);
        setCreateModalOpen(false);
        setForm({ name: '', email: '', phone: '', password: '', roleName: 'ORG_ADMIN', organizationId: '' });
        setEmailVerified(false);
        setOtpSent(false);
        setOtpCode('');
        fetchUsers(1);
        fetchFilterOptions();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}`, {
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        roleName: selectedUser.role_name,
        organizationId: selectedUser.organization_id ? parseInt(selectedUser.organization_id, 10) : null,
        isActive: selectedUser.is_active
      });
      if (res.success) {
        toast.success('User updated successfully.');
        setEditModalOpen(false);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/users/${selectedUser.id}/reset-password`, {
        newPassword
      });
      if (res.success) {
        toast.success(`Password updated for ${selectedUser.name}.`);
        setResetModalOpen(false);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await api.patch(`/users/${user.id}/toggle-status`);
      if (res.success) {
        toast.success(`User ${res.data.isActive ? 'activated' : 'deactivated'}.`);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/users/${selectedUser.id}`);
      if (res.success) {
        toast.success(`User deleted successfully.`);
        setDeleteModalOpen(false);
        setSelectedUser(null);
        fetchUsers(1);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 text-sm">{row.name}</span>
          <span className="text-xs font-normal text-slate-500">{row.email}</span>
        </div>
      )
    },
    {
      key: 'organization_name',
      label: 'Organization',
      render: (row) => (
        row.organization_name ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-600 stroke-[2]" />
            <span>{row.organization_name}</span>
          </span>
        ) : (
          <span className="text-xs text-purple-700 font-medium italic">● SaaS Platform (Platform Admin)</span>
        )
      )
    },
    {
      key: 'roles',
      label: 'Assigned Roles & Scope',
      render: (row) => {
        const hasRoles = Array.isArray(row.roles) && row.roles.length > 0;
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {hasRoles ? (
                row.roles.map((r) => {
                  const isSa = r.slug === 'super_admin';
                  return (
                    <span
                      key={r.id || r.slug}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        isSa
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : r.is_system
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {isSa ? <ShieldCheck className="w-3 h-3 text-blue-600" /> : <Shield className="w-3 h-3 text-indigo-600" />}
                      {r.name}
                    </span>
                  );
                })
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
                  {row.role_display_name || row.role_name}
                </span>
              )}
            </div>
            {row.permissionCount && (
              <span className="text-[10px] font-bold text-slate-500 block">
                {row.permissionCount === 'All (*)' ? 'Full Access (*)' : `${row.permissionCount} permissions`}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'ACTIVE' : 'DEACTIVATED'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-600">
          {row.last_login ? new Date(row.last_login).toLocaleDateString() : 'Never'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-600">
          {new Date(row.created_at).toLocaleDateString()}
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
          {/* View Effective Permissions */}
          <button
            onClick={() => handleOpenViewPerms(row)}
            title="View Effective Permissions"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Eye className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Assign Roles */}
          <PermissionGuard permission="roles.assign">
            <button
              onClick={() => handleOpenAssignRoles(row)}
              title="Assign / Modify Roles"
              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>

          {/* Edit User */}
          <PermissionGuard permission="users.update">
            <button
              onClick={() => {
                setSelectedUser({ ...row });
                setEditModalOpen(true);
              }}
              title="Edit User"
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>

          {/* Reset Password */}
          <PermissionGuard permission="users.update">
            <button
              onClick={() => {
                setSelectedUser(row);
                setResetModalOpen(true);
              }}
              title="Reset Password"
              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Key className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>

          {/* Toggle Active */}
          <PermissionGuard permission="users.suspend">
            <button
              onClick={() => handleToggleStatus(row)}
              title={row.is_active ? 'Deactivate User' : 'Activate User'}
              className={`p-1.5 rounded-lg transition-colors ${
                row.is_active
                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {row.is_active ? <XCircle className="w-4 h-4 stroke-[2.2]" /> : <CheckCircle className="w-4 h-4 stroke-[2.2]" />}
            </button>
          </PermissionGuard>

          {/* Delete User */}
          <PermissionGuard permission="users.delete">
            <button
              onClick={() => {
                setSelectedUser(row);
                setDeleteModalOpen(true);
              }}
              title="Delete User"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          </PermissionGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>Platform User Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Audit, inspect and manage accounts across all tenant organizations and platform admins.
          </p>
        </div>

        <PermissionGuard permission="users.create">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>Add User</span>
          </button>
        </PermissionGuard>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Org Filter */}
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="ALL">All Organizations</option>
            <option value="PLATFORM">Platform Only (No Org)</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="ALL">All Roles</option>
            {roles.map((r) => (
              <option key={r.id || r.name} value={r.id || r.name}>{r.display_name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users matching current filters"
        pagination={pagination}
        onPageChange={(p) => fetchUsers(p)}
      />

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision New User"
        subtitle="Add a new member to an organization or promote platform administrators."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            />
          </div>

          {/* Email Address & Verification */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Email Address <span className="text-rose-500">*</span>
              </label>
              {emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified via OTP
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  OTP Verification Required
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  disabled={emailVerified}
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setEmailVerified(false);
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                  placeholder="rahul@company.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
                    emailVerified
                      ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>

              {!emailVerified ? (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={otpLoading || !form.email}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {otpLoading ? 'Sending...' : (otpSent ? 'Resend OTP' : 'Send OTP')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEmailVerified(false);
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-100 hover:bg-slate-200"
                >
                  Change
                </button>
              )}
            </div>

            {/* OTP Code Input Box */}
            {otpSent && !emailVerified && (
              <div className="mt-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    Enter 6-digit code sent to <span className="underline">{form.email}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-blue-300 text-sm font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    disabled={otpLoading || otpCode.length < 6}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm disabled:opacity-50"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contact Phone (10 Digits)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm({ ...form, phone: val });
                }}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
              {form.phone && form.phone.length !== 10 && (
                <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
                  Must be exactly 10 digits ({form.phone.length}/10)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.roleName}
                onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                {roles.map((r) => (
                  <option key={r.id || r.name} value={r.id || r.name}>{r.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Organization</label>
              <select
                value={form.organizationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    organizationId: val,
                    roleName: val ? (form.roleName === 'SUPER_ADMIN' ? 'ORG_ADMIN' : form.roleName) : 'SUPER_ADMIN'
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                <option value="">None (Super Admin Platform)</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEmailVerified(false);
                setOtpSent(false);
                setOtpCode('');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !emailVerified}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <span>{actionLoading ? 'Creating User...' : 'Create User'}</span>
              {emailVerified && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      {selectedUser && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit User: ${selectedUser.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={selectedUser.name}
                onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={selectedUser.email}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Role</label>
              <select
                value={selectedUser.role_name || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, role_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                {roles.map((r) => (
                  <option key={r.id || r.name} value={r.id || r.name}>{r.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Organization</label>
              <select
                value={selectedUser.organization_id || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, organization_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                <option value="">Platform (No Org)</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password: ${selectedUser?.name || ''}`}
        subtitle="Specify a new master password for this account."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition-all shadow-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || newPassword.length < 6}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-black shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          ASSIGN RBAC ROLES MODAL
         ======================================================== */}
      <Modal
        isOpen={assignRolesModalOpen}
        onClose={() => setAssignRolesModalOpen(false)}
        title={`Assign Roles: ${selectedUser?.name || ''}`}
        subtitle={`Configure internal RBAC access for ${selectedUser?.email || ''}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveAssignRoles} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Select one or more roles to assign to this administrator. Effective permissions will be calculated automatically from all active assigned roles.
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {allRbacRoles.map((role) => {
              const isChecked = selectedRoleIds.includes(role.id);
              const isSuperAdminRole = role.slug === 'super_admin';
              const cannotAssignSa = isSuperAdminRole && !isSuperAdmin;

              return (
                <label
                  key={role.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-blue-50/70 border-blue-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  } ${cannotAssignSa ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={cannotAssignSa}
                    checked={isChecked}
                    onChange={() => !cannotAssignSa && handleToggleRoleId(role.id)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{role.name}</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          role.is_system ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {role.is_system ? 'SYSTEM' : 'CUSTOM'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {role.description || 'No description provided'}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setAssignRolesModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Save Role Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          VIEW EFFECTIVE PERMISSIONS MODAL
         ======================================================== */}
      <Modal
        isOpen={viewPermsModalOpen}
        onClose={() => setViewPermsModalOpen(false)}
        title={`Effective Permissions: ${selectedUser?.name || ''}`}
        subtitle={`Account: ${selectedUser?.email || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-bold block">Assigned Roles</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedUser?.roles && selectedUser.roles.length > 0 ? (
                  selectedUser.roles.map((r) => (
                    <span key={r.id || r.slug} className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold text-[11px]">
                      {r.name}
                    </span>
                  ))
                ) : (
                  <span className="font-bold text-slate-700">
                    {selectedUser?.role_display_name || selectedUser?.role_name || 'Standard User'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold block">Permissions Count</span>
              <span className="font-black text-indigo-600 text-sm">
                {selectedUser?.permissionCount ||
                  (Array.isArray(selectedUser?.permissions) ? selectedUser.permissions.length : 0)}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
              Authorized Capabilities
            </span>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {selectedUser?.role_name === 'SUPER_ADMIN' ||
              (selectedUser?.roles && selectedUser.roles.some((r) => r.slug === 'super_admin')) ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Unrestricted Master Privileges (*): This account possesses all capabilities across all 17 system modules.
                  </span>
                </div>
              ) : selectedUser?.permissions && selectedUser.permissions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedUser.permissions.map((code) => (
                    <div key={code} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <code className="font-mono text-slate-800 text-[11px] truncate">{code}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No explicit permissions granted to this account.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-right">
            <button
              type="button"
              onClick={() => setViewPermsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user '${selectedUser?.name}' (${selectedUser?.email})?`}
        confirmText="Delete Account"
        type="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}
