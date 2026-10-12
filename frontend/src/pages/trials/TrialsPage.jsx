import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Building, 
  DollarSign, 
  ArrowRight, 
  Tag, 
  Receipt,
  Sparkles,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function TrialsPage() {
  const [trialOrgs, setTrialOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Extend Modal state
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [additionalDays, setAdditionalDays] = useState(14);
  
  // Convert to Paid Modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingOrg, setConvertingOrg] = useState(null);
  const [convertForm, setConvertForm] = useState({
    planId: '',
    billingCycle: 'MONTHLY',
    amount: 0,
    paymentMethod: 'UPI',
    paymentStatus: 'SUCCESS',
    transactionId: '',
    notes: ''
  });

  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const fetchTrialsAndPlans = async () => {
    setIsLoading(true);
    try {
      const [trialsRes, plansRes] = await Promise.allSettled([
        api.get('/organizations', { status: 'TRIAL', limit: 50 }),
        api.get('/plans')
      ]);

      if (trialsRes.status === 'fulfilled' && trialsRes.value?.success) {
        setTrialOrgs(trialsRes.value.data?.items || []);
      }
      if (plansRes.status === 'fulfilled' && plansRes.value) {
        const loadedPlans = plansRes.value.data || plansRes.value || [];
        setPlans(Array.isArray(loadedPlans) ? loadedPlans : []);
      }
    } catch (err) {
      toast.error('Failed to load trial accounts: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialsAndPlans();
  }, []);

  const handleExtendTrial = async (e) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/organizations/${selectedOrg.id}/extend-trial`, {
        additionalDays
      });
      if (res.success) {
        toast.success(`Trial extended for ${selectedOrg.name}.`);
        setExtendModalOpen(false);
        setSelectedOrg(null);
        fetchTrialsAndPlans();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to extend trial');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Convert to Paid modal with organization and plan defaults
  const handleOpenConvertModal = (org) => {
    setConvertingOrg(org);
    const initialPlan = (plans && plans.find(p => p.id === org.plan_id)) || (plans && plans[0]) || { id: 1, name: 'Basic Plan', price_monthly: 29, price_yearly: 290 };
    const defaultAmount = initialPlan ? parseFloat(initialPlan.price_monthly || 0) : 29;

    setConvertForm({
      planId: initialPlan.id,
      billingCycle: 'MONTHLY',
      amount: defaultAmount,
      paymentMethod: 'UPI',
      paymentStatus: 'SUCCESS',
      transactionId: `TXN-${Date.now().toString().slice(-6)}`,
      notes: `Converted ${org.name} from free trial to paid plan`
    });
    setConvertModalOpen(true);
  };

  const handlePlanSelect = (targetPlanId) => {
    const idNum = parseInt(targetPlanId, 10);
    const targetPlan = plans.find(p => p.id === idNum);
    const newAmount = targetPlan
      ? (convertForm.billingCycle === 'YEARLY' ? parseFloat(targetPlan.price_yearly || 0) : parseFloat(targetPlan.price_monthly || 0))
      : convertForm.amount;

    setConvertForm(prev => ({
      ...prev,
      planId: idNum,
      amount: newAmount
    }));
  };

  const handleCycleSelect = (cycle) => {
    const targetPlan = plans.find(p => p.id === parseInt(convertForm.planId, 10));
    const newAmount = targetPlan
      ? (cycle === 'YEARLY' ? parseFloat(targetPlan.price_yearly || 0) : parseFloat(targetPlan.price_monthly || 0))
      : convertForm.amount;

    setConvertForm(prev => ({
      ...prev,
      billingCycle: cycle,
      amount: newAmount
    }));
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingOrg) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/organizations/${convertingOrg.id}/convert-to-paid`, {
        planId: convertForm.planId,
        billingCycle: convertForm.billingCycle,
        amount: parseFloat(convertForm.amount),
        paymentMethod: convertForm.paymentMethod,
        paymentStatus: convertForm.paymentStatus,
        transactionId: convertForm.transactionId,
        notes: convertForm.notes
      });
      if (res.success) {
        toast.success(res.message || `Successfully converted '${convertingOrg.name}' to active paid subscription.`);
        setConvertModalOpen(false);
        setConvertingOrg(null);
        fetchTrialsAndPlans();
      }
    } catch (err) {
      toast.error(err.message || 'Trial conversion failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Organization',
      render: (row) => (
        <div className="flex flex-col">
          <Link
            to={`/super-admin/organizations/${row.id}`}
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
          >
            {row.name}
          </Link>
          <span className="text-xs font-normal text-slate-500">{row.email}</span>
        </div>
      )
    },
    {
      key: 'plan_name',
      label: 'Trial Plan Tier',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          {row.plan_name || 'Pro'}
        </span>
      )
    },
    {
      key: 'trial_ends_at',
      label: 'Trial Expiry & Days Left',
      render: (row) => {
        const endDate = row.trial_ends_at ? new Date(row.trial_ends_at) : (row.subscription_expiry ? new Date(row.subscription_expiry) : new Date());
        const diffMs = endDate.getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExpiringVerySoon = diffDays <= 3;

        return (
          <div className="flex flex-col">
            <span className={`text-xs font-medium ${isExpiringVerySoon ? 'text-rose-700' : 'text-sky-700'}`}>
              {diffDays > 0 ? `${diffDays} days remaining` : 'Expired'}
            </span>
            <span className="text-[10px] font-normal text-slate-500">
              Ends {endDate.toLocaleDateString()}
            </span>
          </div>
        );
      }
    },
    {
      key: 'users_count',
      label: 'Enrolled Users',
      render: (row) => <span className="font-normal text-slate-700">{row.users_count} users</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setSelectedOrg(row);
              setExtendModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 transition-colors shadow-sm"
          >
            + Extend
          </button>
          <button
            onClick={() => handleOpenConvertModal(row)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Convert to Paid
          </button>
        </div>
      )
    }
  ];

  const selectedPlanObj = plans.find(p => p.id === parseInt(convertForm.planId, 10));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-sky-600 stroke-[2]" />
            <span>Trial Accounts Lifecycle</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Monitor client evaluation durations, impending expiration timers and convert trials to active subscriptions.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={trialOrgs}
        isLoading={isLoading}
        emptyMessage="No organizations currently in free trial status"
      />

      {/* EXTEND MODAL */}
      <Modal
        isOpen={extendModalOpen}
        onClose={() => setExtendModalOpen(false)}
        title={`Extend Trial: ${selectedOrg?.name || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExtendTrial} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Additional Trial Days</label>
            <input
              type="number"
              min={1}
              max={60}
              value={additionalDays}
              onChange={(e) => setAdditionalDays(parseInt(e.target.value, 10) || 14)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setExtendModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              Extend Trial
            </button>
          </div>
        </form>
      </Modal>

      {/* CONVERT TRIAL TO PAID MODAL */}
      <Modal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        title="Convert Trial to Paid Subscription"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleConvertSubmit} className="space-y-5">
          {/* Organization Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shadow-sm">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{convertingOrg?.name || 'Organization'}</h4>
                <p className="text-xs text-slate-500">{convertingOrg?.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Trial Active
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">Tier: {convertingOrg?.plan_name || 'Pro'}</p>
            </div>
          </div>

          {/* Plan & Cycle Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Select Paid Plan
              </label>
              <select
                value={convertForm.planId}
                onChange={(e) => handlePlanSelect(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price_monthly}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Billing Cycle
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCycleSelect('MONTHLY')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    convertForm.billingCycle === 'MONTHLY'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => handleCycleSelect('YEARLY')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    convertForm.billingCycle === 'YEARLY'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Yearly (Annual)
                </button>
              </div>
            </div>
          </div>

          {/* Amount and Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Paid Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={convertForm.amount}
                  onChange={(e) => setConvertForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standard: ₹{convertForm.billingCycle === 'YEARLY' ? selectedPlanObj?.price_yearly || 0 : selectedPlanObj?.price_monthly || 0}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                Payment Status
              </label>
              <select
                value={convertForm.paymentStatus}
                onChange={(e) => setConvertForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="SUCCESS">Completed / Paid (Success)</option>
                <option value="PENDING">Payment Pending (Cheque / Wire / Invoice)</option>
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {convertForm.paymentStatus === 'SUCCESS' ? '✓ Adds immediately to SaaS Revenue & MRR' : '⌛ Recorded as pending in analytics'}
              </span>
            </div>
          </div>

          {/* Payment Method and Transaction Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                Payment Method (Kaise Pay Kiya)
              </label>
              <select
                value={convertForm.paymentMethod}
                onChange={(e) => setConvertForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm / QR)</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="BANK_TRANSFER">Bank Transfer (IMPS / NEFT / RTGS)</option>
                <option value="CASH">Cash / Offline</option>
                <option value="OTHER">Other Gateway / Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                Transaction ID / UTR Ref
              </label>
              <input
                type="text"
                value={convertForm.transactionId}
                onChange={(e) => setConvertForm(prev => ({ ...prev, transactionId: e.target.value }))}
                placeholder="e.g. UPI-982348 or UTR-192837"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Internal Notes / Conversion Remarks (Optional)
            </label>
            <input
              type="text"
              value={convertForm.notes}
              onChange={(e) => setConvertForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Converted on client request after 14 days evaluation"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Real-time Analytics Impact Card */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xs text-emerald-950 leading-relaxed">
              <p className="font-bold text-emerald-900">
                Real-Time Dashboard & SaaS Analytics Sync:
              </p>
              <p className="text-emerald-800 mt-0.5">
                Recording <strong>₹{convertForm.amount}</strong> via <strong>{convertForm.paymentMethod}</strong> ({convertForm.paymentStatus === 'SUCCESS' ? 'Paid' : 'Pending'}). 
                The Super Admin Dashboard, MRR, ARR, and Revenue Analytics will immediately update.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setConvertModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Convert to Paid & Collect
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
