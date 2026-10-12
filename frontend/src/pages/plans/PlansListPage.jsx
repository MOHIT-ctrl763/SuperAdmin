import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  HardDrive,
  Check,
  Shield,
  Star,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PermissionGuard } from '../../components/auth/PermissionGuard';

export function PlansListPage() {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Plan Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    monthlyPrice: 999,
    yearlyPrice: 9999,
    trialDays: 14,
    maxUsers: 5,
    maxCustomers: 1000,
    maxOrders: 2000,
    maxStorageMb: 2048,
    isPopular: false,
    featureKeys: []
  });

  const toast = useToast();

  const fetchPlansAndFeatures = async () => {
    setIsLoading(true);
    try {
      const [plansRes, featsRes] = await Promise.all([
        api.get('/plans'),
        api.get('/features').catch(() => ({ success: false, data: [] }))
      ]);
      if (plansRes && plansRes.success) setPlans(plansRes.data || []);
      if (featsRes && featsRes.success) setFeatures(featsRes.data || []);
    } catch (err) {
      toast.error('Failed to load plans: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndFeatures();
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        price_monthly: Number(form.monthlyPrice || 0),
        price_yearly: Number(form.yearlyPrice || 0),
        monthlyPrice: Number(form.monthlyPrice || 0),
        yearlyPrice: Number(form.yearlyPrice || 0),
        slug: form.code,
        features: form.featureKeys
      };
      const res = await api.post('/plans', payload);
      if (res.success) {
        toast.success(`Plan '${res.data?.name || form.name}' created successfully.`);
        setCreateModalOpen(false);
        fetchPlansAndFeatures();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        price_monthly: Number(form.monthlyPrice || 0),
        price_yearly: Number(form.yearlyPrice || 0),
        monthlyPrice: Number(form.monthlyPrice || 0),
        yearlyPrice: Number(form.yearlyPrice || 0),
        slug: form.code,
        features: form.featureKeys
      };
      const res = await api.put(`/plans/${selectedPlan.id}`, payload);
      if (res.success) {
        toast.success(`Plan '${res.data?.name || form.name}' updated.`);
        setEditModalOpen(false);
        setSelectedPlan(null);
        fetchPlansAndFeatures();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      const res = await api.patch(`/plans/${plan.id}/toggle-status`);
      if (res.success) {
        toast.success(`Plan ${res.data.isActive ? 'activated' : 'deactivated'}.`);
        fetchPlansAndFeatures();
      }
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/plans/${selectedPlan.id}`);
      if (res.success) {
        toast.success(`Plan deleted successfully.`);
        setDeleteModalOpen(false);
        setSelectedPlan(null);
        fetchPlansAndFeatures();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete plan');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (plan) => {
    setSelectedPlan(plan);
    setForm({
      name: plan.name || '',
      code: plan.code || plan.slug || '',
      description: plan.description || '',
      monthlyPrice: Number(plan.monthly_price ?? plan.price_monthly ?? 0),
      yearlyPrice: Number(plan.yearly_price ?? plan.price_yearly ?? 0),
      trialDays: plan.trial_days || 14,
      maxUsers: plan.max_users || 10,
      maxCustomers: plan.max_customers || 1000,
      maxOrders: plan.max_orders || 2000,
      maxStorageMb: plan.max_storage_mb || 2048,
      isPopular: !!plan.is_popular,
      featureKeys: plan.features?.map((f) => f.code || f.key || f.id || f.name) || []
    });
    setEditModalOpen(true);
  };

  const toggleFeatureInForm = (key) => {
    setForm((prev) => {
      const exists = prev.featureKeys.includes(key);
      return {
        ...prev,
        featureKeys: exists ? prev.featureKeys.filter((k) => k !== key) : [...prev.featureKeys, key]
      };
    });
  };

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>Subscription Plans</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Define pricing tiers, resource limits, trial periods, and feature availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PermissionGuard permission="features.view">
            <Link
              to="/super-admin/features"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <span>Feature Catalog</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </PermissionGuard>

          <PermissionGuard permission="plans.create">
            <button
              onClick={() => {
                setForm({
                  name: '',
                  code: '',
                  description: '',
                  monthlyPrice: 999,
                  yearlyPrice: 9999,
                  trialDays: 14,
                  maxUsers: 5,
                  maxCustomers: 1000,
                  maxOrders: 2000,
                  maxStorageMb: 2048,
                  isPopular: false,
                  featureKeys: ['export', 'import']
                });
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>Create Plan</span>
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Plan Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 relative ${
              plan.is_popular
                ? 'bg-white border-2 border-blue-600 shadow-xl'
                : 'bg-white border border-slate-200/90 shadow-sm hover:shadow-md'
            }`}
          >
            {plan.is_popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                Most Popular
              </span>
            )}

            <div>
              {/* Plan Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <span className="text-[11px] font-mono font-normal text-slate-500">{plan.code}</span>
                </div>
                <Badge variant={plan.is_active ? 'ACTIVE' : 'DEACTIVATED'}>
                  {plan.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>

              {/* Price */}
              <div className="py-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">₹{Number(plan.monthly_price ?? plan.price_monthly ?? 0).toLocaleString('en-IN')}</span>
                  <span className="text-xs text-slate-500 font-normal">/ month</span>
                </div>
                <p className="text-xs text-slate-500 font-normal mt-1">
                  Billed annually at ₹{Number(plan.yearly_price ?? plan.price_yearly ?? 0).toLocaleString('en-IN')} / year
                </p>
                <p className="text-xs text-slate-600 mt-3 font-normal leading-relaxed">
                  {plan.description || 'Comprehensive CRM tooling for business operations.'}
                </p>
              </div>

              {/* Core Limits Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Team Users:</span>
                  <span className="font-semibold text-slate-900">{plan.max_users === -1 ? 'Unlimited' : `${plan.max_users ?? 10} Users`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Customers:</span>
                  <span className="font-semibold text-slate-900">{plan.max_customers === -1 ? 'Unlimited' : (plan.max_customers ? Number(plan.max_customers).toLocaleString() : 'Unlimited')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Cloud Storage:</span>
                  <span className="font-semibold text-slate-900">{plan.max_storage_mb === -1 ? 'Unlimited' : `${Math.round((plan.max_storage_mb ?? ((plan.max_storage_gb ?? 25) * 1024)) / 1024)} GB`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Free Trial:</span>
                  <span className="font-semibold text-sky-700">{plan.trial_days ?? 14} Days</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="mt-5 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">Included Capabilities</span>
                {plan.features?.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-normal text-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{typeof f === 'string' ? f : f?.name || f?.title || 'Feature'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with Subscribers count & Action buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-normal text-slate-500">
                {plan.active_subscribers_count ?? 1} active subscriber(s)
              </span>

              <div className="flex items-center gap-1">
                <PermissionGuard permission="plans.update">
                  <button
                    onClick={() => openEditModal(plan)}
                    title="Edit Plan"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    title={plan.is_active ? 'Disable Plan' : 'Activate Plan'}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    {plan.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </PermissionGuard>

                <PermissionGuard permission="plans.delete">
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setDeleteModalOpen(true);
                    }}
                    title="Delete Plan"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </PermissionGuard>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PLAN FORM MODAL (CREATE / EDIT) */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditModalOpen(false);
          setSelectedPlan(null);
        }}
        title={editModalOpen ? `Edit Plan: ${selectedPlan?.name}` : 'Create Subscription Plan'}
        subtitle="Configure pricing, resource allowances and feature permissions."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={editModalOpen ? handleUpdatePlan : handleCreatePlan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plan Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Professional Growth"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="pro-growth"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ideal for growing teams with up to 25 members..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Price (₹) *</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={form.monthlyPrice}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                  setForm({ ...form, monthlyPrice: cleanVal });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Yearly Price (₹) *</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={form.yearlyPrice}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                  setForm({ ...form, yearlyPrice: cleanVal });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Trial Days</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={form.trialDays}
                onChange={(e) => setForm({ ...form, trialDays: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 block mb-3">Resource Limits (-1 for Unlimited)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Users</label>
                <input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Customers</label>
                <input
                  type="number"
                  value={form.maxCustomers}
                  onChange={(e) => setForm({ ...form, maxCustomers: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Orders</label>
                <input
                  type="number"
                  value={form.maxOrders}
                  onChange={(e) => setForm({ ...form, maxOrders: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Storage (MB)</label>
                <input
                  type="number"
                  value={form.maxStorageMb}
                  onChange={(e) => setForm({ ...form, maxStorageMb: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-purple-600 block mb-3">Feature Toggles</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {features.map((feat, idx) => {
                const featKey = feat.code || feat.key || feat.id || `feat-${idx}`;
                const checked = form.featureKeys.includes(featKey);
                return (
                  <label
                    key={featKey}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-black block text-slate-950">{feat.name}</span>
                      <span className="text-[10px] font-bold text-slate-500">{featKey}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFeatureInForm(featKey)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditModalOpen(false);
                setSelectedPlan(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {editModalOpen ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Plan"
        message={`Are you sure you want to delete '${selectedPlan?.name}'? Note that plans currently attached to active subscriptions cannot be deleted.`}
        confirmText="Delete Plan"
        type="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}
