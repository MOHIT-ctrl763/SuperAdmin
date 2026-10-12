import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Ban,
  CheckCircle,
  Trash2,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Clock,
  Mail,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { PermissionGuard } from '../../components/auth/PermissionGuard';

export function OrganizationsListPage() {
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Email OTP verification state for organization provisioning
  const [orgEmailVerified, setOrgEmailVerified] = useState(false);
  const [orgOtpSent, setOrgOtpSent] = useState(false);
  const [orgOtpCode, setOrgOtpCode] = useState('');
  const [orgOtpLoading, setOrgOtpLoading] = useState(false);

  // New Organization Form state
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    status: 'TRIAL',
    trialDays: 14,
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    planId: 2
  });

  const toast = useToast();
  const navigate = useNavigate();

  const getTargetOrgEmail = () => {
    return (newOrgForm.ownerEmail || newOrgForm.email || '').trim();
  };

  const handleSendOrgOtp = async () => {
    const targetEmail = getTargetOrgEmail();
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('Please enter a valid owner or billing email first.');
      return;
    }
    setOrgOtpLoading(true);
    try {
      const res = await api.post('/auth/send-email-otp', {
        email: targetEmail,
        purpose: 'NEW_ORG',
        name: newOrgForm.ownerName || newOrgForm.name || 'Tenant Admin'
      });
      if (res.success) {
        setOrgOtpSent(true);
        setOrgOtpCode(''); // Never autofill; user must enter from their email inbox
        toast.success(res.message || 'Verification OTP sent to email inbox. Please check your email.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code.');
    } finally {
      setOrgOtpLoading(false);
    }
  };

  const handleVerifyOrgOtp = async () => {
    const targetEmail = getTargetOrgEmail();
    if (!orgOtpCode || orgOtpCode.length < 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setOrgOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-email-otp', {
        email: targetEmail,
        otp: orgOtpCode,
        purpose: 'NEW_ORG'
      });
      if (res.success) {
        setOrgEmailVerified(true);
        toast.success('Organization email verified with OTP!');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid or expired verification code.');
    } finally {
      setOrgOtpLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setPlans(res.data);
        setNewOrgForm(prev => {
          const exists = res.data.some(p => p.id === prev.planId);
          if (!exists) {
            const defaultPlan = res.data.find(p => p.is_popular) || res.data[0];
            return { ...prev, planId: defaultPlan.id };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const fetchOrganizations = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/organizations', {
        page,
        limit: 10,
        search,
        status: statusFilter
      });
      if (res.success && res.data) {
        setOrganizations(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load organizations: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations(1);
    fetchPlans();
  }, [search, statusFilter]);

  const handleOpenCreateModal = () => {
    fetchPlans();
    setCreateModalOpen(true);
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgEmailVerified) {
      toast.error('Please verify the organization contact/owner email with OTP before provisioning.');
      return;
    }
    if (newOrgForm.phone && newOrgForm.phone.length !== 10) {
      toast.error('Contact phone number must be exactly 10 digits.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post('/organizations', newOrgForm);
      if (res.success) {
        toast.success(`Organization '${res.data.name}' created successfully.`);
        setCreateModalOpen(false);
        setOrgEmailVerified(false);
        setOrgOtpSent(false);
        setOrgOtpCode('');
        setNewOrgForm({
          name: '',
          slug: '',
          email: '',
          phone: '',
          city: '',
          state: '',
          status: 'TRIAL',
          trialDays: 14,
          ownerName: '',
          ownerEmail: '',
          ownerPassword: '',
          planId: plans.find(p => p.is_popular)?.id || (plans[0]?.id || 2)
        });
        fetchOrganizations(1);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/organizations/${selectedOrg.id}/suspend`, {
        reason: suspensionReason || 'Administrative suspension'
      });
      if (res.success) {
        toast.success(`Organization '${selectedOrg.name}' suspended.`);
        setSuspendModalOpen(false);
        setSelectedOrg(null);
        setSuspensionReason('');
        fetchOrganizations(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to suspend organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (org) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/organizations/${org.id}/activate`);
      if (res.success) {
        toast.success(`Organization '${org.name}' reactivated successfully.`);
        fetchOrganizations(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to activate organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/organizations/${selectedOrg.id}`);
      if (res.success) {
        toast.success(`Organization '${selectedOrg.name}' deleted.`);
        setConfirmDeleteOpen(false);
        setSelectedOrg(null);
        fetchOrganizations(1);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoginAsAdmin = async (org) => {
    setActionLoading(true);
    try {
      const res = await api.post('/auth/impersonate', { organizationId: org.id });
      if (res.success && res.data?.token) {
        toast.success(`Authenticated as Admin for ${org.name}`);
        // Store impersonation token in localStorage for CRM portal and open
        const crmUrl = `http://localhost:5173/dashboard?impersonate_token=${res.data.token}`;
        window.open(crmUrl, '_blank');
      }
    } catch (err) {
      toast.error(err.message || 'Impersonation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Company',
      render: (row) => (
        <div className="flex flex-col">
          <Link
            to={`/super-admin/organizations/${row.id}`}
            className="font-medium text-slate-900 text-sm hover:text-blue-600 transition-colors"
          >
            {row.name}
          </Link>
          <span className="text-xs text-slate-500 font-normal font-mono mt-0.5">slug: {row.slug}</span>
        </div>
      )
    },
    {
      key: 'owner_name',
      label: 'Owner / Contact',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-slate-900 font-medium text-sm">{row.owner_name || 'Admin'}</span>
          <span className="text-xs text-slate-500 font-normal">{row.email}</span>
        </div>
      )
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: (row) => (
        <Badge variant={row.plan_name || 'PRO'}>{row.plan_name || 'Pro'}</Badge>
      )
    },
    {
      key: 'users_count',
      label: 'Users',
      render: (row) => (
        <span className="font-medium text-slate-900 text-sm">
          {row.users_count} <span className="text-slate-500 font-normal text-xs">users</span>
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => (
        <span className="text-xs text-slate-600 font-normal">
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
          {/* View Details */}
          <Link
            to={`/super-admin/organizations/${row.id}`}
            title="View Details"
            className="p-1.5 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors border border-slate-200 bg-white shadow-xs"
          >
            <Eye className="w-4 h-4 stroke-[2.5]" />
          </Link>

          {/* Login as Admin */}
          <button
            onClick={() => handleLoginAsAdmin(row)}
            title="Login as Organization Admin"
            disabled={actionLoading}
            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors border border-blue-200 bg-blue-50/50 shadow-xs"
          >
            <UserCheck className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Suspend or Activate */}
          <PermissionGuard permission="organizations.suspend">
            {row.status === 'SUSPENDED' ? (
              <button
                onClick={() => handleActivate(row)}
                title="Activate Organization"
                className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 transition-colors border border-emerald-300 bg-emerald-50 shadow-xs"
              >
                <CheckCircle className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedOrg(row);
                  setSuspendModalOpen(true);
                }}
                title="Suspend Organization"
                className="p-1.5 rounded-lg text-amber-700 hover:text-amber-800 hover:bg-amber-100 transition-colors border border-amber-300 bg-amber-50 shadow-xs"
              >
                <Ban className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </PermissionGuard>

          {/* Delete */}
          <PermissionGuard permission="organizations.delete">
            <button
              onClick={() => {
                setSelectedOrg(row);
                setConfirmDeleteOpen(true);
              }}
              title="Delete Organization"
              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200 bg-rose-50 shadow-xs"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
            </button>
          </PermissionGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>Organization Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
            Control customer tenants, subscription states, suspension policies and tenant isolation.
          </p>
        </div>

        <PermissionGuard permission="organizations.create">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>New Organization</span>
          </button>
        </PermissionGuard>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, owner or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 stroke-[2]" /> Status:
          </span>
          {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={organizations}
        isLoading={isLoading}
        emptyMessage="No organizations matching the filter criteria"
        pagination={pagination}
        onPageChange={(p) => fetchOrganizations(p)}
      />

      {/* CREATE ORGANIZATION MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Organization"
        subtitle="Provision a fresh multi-tenant company with owner account and initial trial plan."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={newOrgForm.name}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                placeholder="e.g. Acme Corporation"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Slug / Identifier</label>
              <input
                type="text"
                value={newOrgForm.slug}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, slug: e.target.value })}
                placeholder="acme-corp (auto-generated if empty)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Billing Email *</label>
              <input
                type="email"
                required
                value={newOrgForm.email}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, email: e.target.value })}
                placeholder="billing@acme.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                value={newOrgForm.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setNewOrgForm({ ...newOrgForm, phone: val });
                }}
                placeholder="9876543210"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
              {newOrgForm.phone && newOrgForm.phone.length !== 10 && (
                <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">
                  Must be exactly 10 digits ({newOrgForm.phone.length}/10)
                </span>
              )}
            </div>
          </div>

          {/* Owner Account */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600">Owner Admin Credentials</h4>
              {orgEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Owner Email Verified via OTP
                </span>
              ) : (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  OTP Verification Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={newOrgForm.ownerName}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, ownerName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newOrgForm.ownerPassword}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, ownerPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            {/* Owner Email with OTP Verification Row */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Owner Admin Email *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={orgEmailVerified}
                    value={newOrgForm.ownerEmail}
                    onChange={(e) => {
                      setNewOrgForm({ ...newOrgForm, ownerEmail: e.target.value });
                      setOrgEmailVerified(false);
                      setOrgOtpSent(false);
                      setOrgOtpCode('');
                    }}
                    placeholder="john@acme.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-normal transition-all ${
                      orgEmailVerified
                        ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500'
                    }`}
                  />
                </div>

                {!orgEmailVerified ? (
                  <button
                    type="button"
                    onClick={handleSendOrgOtp}
                    disabled={orgOtpLoading || !(newOrgForm.ownerEmail || newOrgForm.email)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all whitespace-nowrap disabled:opacity-50"
                  >
                    {orgOtpLoading ? 'Sending...' : (orgOtpSent ? 'Resend OTP' : 'Send OTP')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOrgEmailVerified(false);
                      setOrgOtpSent(false);
                      setOrgOtpCode('');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 bg-slate-100 hover:bg-slate-200"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* OTP Input for Organization */}
              {orgOtpSent && !orgEmailVerified && (
                <div className="mt-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      Enter 6-digit code sent to <span className="underline">{getTargetOrgEmail()}</span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={orgOtpCode}
                      onChange={(e) => setOrgOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="flex-1 px-3.5 py-1.5 rounded-lg bg-white border border-blue-300 text-sm font-mono font-semibold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOrgOtp}
                      disabled={orgOtpLoading || orgOtpCode.length < 6}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                      {orgOtpLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plan Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={newOrgForm.status}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="TRIAL">TRIAL (Free Evaluation)</option>
                <option value="ACTIVE">ACTIVE (Paid)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trial Days</label>
              <input
                type="number"
                value={newOrgForm.trialDays}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, trialDays: parseInt(e.target.value, 10) || 14 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial Plan</label>
              <select
                value={newOrgForm.planId}
                onChange={(e) => setNewOrgForm({ ...newOrgForm, planId: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                {plans.length === 0 ? (
                  <>
                    <option value={1}>Basic Plan (₹29/mo)</option>
                    <option value={2}>Pro Plan (Recommended) (₹79/mo)</option>
                    <option value={3}>Enterprise Plan (₹199/mo)</option>
                  </>
                ) : (
                  plans.map((p) => {
                    const price = parseFloat(p.price_monthly ?? p.monthly_price ?? 0);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{price.toFixed(0)}/mo) {p.is_popular ? '★ (Recommended)' : ''} {!p.is_active ? '(Inactive)' : ''}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setOrgEmailVerified(false);
                setOrgOtpSent(false);
                setOrgOtpCode('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !orgEmailVerified}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Create Organization</span>
              {orgEmailVerified && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        </form>
      </Modal>

      {/* SUSPEND MODAL */}
      <Modal
        isOpen={suspendModalOpen}
        onClose={() => {
          setSuspendModalOpen(false);
          setSelectedOrg(null);
        }}
        title={`Suspend Organization: ${selectedOrg?.name || ''}`}
        subtitle="Suspension will immediately prevent all organization members from accessing CRM services."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Reason for Suspension *
            </label>
            <textarea
              rows={3}
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="e.g. Non-payment of subscription invoices past grace period, or terms violation."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-rose-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            Customer data will NOT be deleted. You can reactivate this organization at any time from this panel.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSuspendModalOpen(false);
                setSelectedOrg(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSuspend}
              disabled={actionLoading || !suspensionReason.trim()}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium shadow-md shadow-rose-600/20 disabled:opacity-50"
            >
              Confirm Suspension
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setSelectedOrg(null);
        }}
        onConfirm={handleDelete}
        title="Delete Organization"
        message={`Are you sure you want to delete '${selectedOrg?.name}'? This will remove the tenant and associated users.`}
        confirmText="Delete Tenant"
        type="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}
