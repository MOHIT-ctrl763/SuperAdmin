import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Tag, Plus, CheckCircle, XCircle, Trash2, Percent, IndianRupee } from 'lucide-react';

export function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    usageLimit: 100,
    perCustomerLimit: 1
  });
  const [actionLoading, setActionLoading] = useState(false);

  const toast = useToast();

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/coupons');
      if (res.success && res.data) {
        setCoupons(res.data);
      }
    } catch (err) {
      toast.error('Failed to load coupons: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/coupons', form);
      if (res.success) {
        toast.success(`Coupon '${res.data.code}' created.`);
        setCreateModalOpen(false);
        setForm({ code: '', discountType: 'PERCENTAGE', discountValue: 20, usageLimit: 100, perCustomerLimit: 1 });
        fetchCoupons();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create coupon');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (c) => {
    try {
      const res = await api.patch(`/coupons/${c.id}/toggle-status`);
      if (res.success) {
        toast.success(`Coupon ${res.data.isActive ? 'activated' : 'deactivated'}.`);
        fetchCoupons();
      }
    } catch (err) {
      toast.error('Failed to toggle coupon');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete coupon '${c.code}'?`)) return;
    try {
      const res = await api.delete(`/coupons/${c.id}`);
      if (res.success) {
        toast.success('Coupon removed.');
        fetchCoupons();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-amber-600 stroke-[2]" />
            <span>Discount Coupons & Campaigns</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Create promotional discount codes for subscription onboarding and retention.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2]" />
          <span>New Coupon</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl p-5 border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-mono text-xs font-semibold tracking-wider text-slate-900 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                  {c.code}
                </span>
                <Badge variant={c.is_active ? 'ACTIVE' : 'DEACTIVATED'}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-700">
                  {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                </span>
              </div>

              <div className="mt-3 text-xs text-slate-600 font-bold space-y-1">
                <p>Usage: <strong className="font-black text-slate-950">{c.times_used || c.used_count || 0}</strong> / {c.usage_limit || c.max_uses || 100} redeemed</p>
                <p>Total Saved: <strong className="font-black text-emerald-700">₹{Number(c.total_discount_granted || 0).toLocaleString()}</strong></p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleToggle(c)}
                className={`p-1.5 rounded-lg transition-colors ${c.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                title={c.is_active ? 'Deactivate' : 'Activate'}
              >
                {c.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </button>

              <button
                onClick={() => handleDelete(c)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Promotional Coupon"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. WELCOME30"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono uppercase font-black text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value *</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={form.discountValue}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                  setForm({ ...form, discountValue: cleanVal });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Max Redemptions</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value.replace(/\D/g, '') })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              Save Coupon
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
