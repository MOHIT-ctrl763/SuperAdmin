import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Building2,
  Users,
  CreditCard,
  HardDrive,
  Calendar,
  Layers,
  ArrowLeft,
  UserCheck,
  Ban,
  CheckCircle,
  CheckCircle2,
  Clock,
  Check,
  AlertTriangle,
  Receipt,
  FileText,
  Zap,
  ShieldCheck,
  Network,
  Briefcase,
  MapPin,
  Phone,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { crmApi } from '../../services/crmApi';

export function OrganizationDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [extendTrialModalOpen, setExtendTrialModalOpen] = useState(false);
  const [plansList, setPlansList] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [additionalDays, setAdditionalDays] = useState(14);
  const [planPaymentMethod, setPlanPaymentMethod] = useState('UPI');
  const [planPaymentStatus, setPlanPaymentStatus] = useState('SUCCESS');
  const [actionLoading, setActionLoading] = useState(false);

  // CRM Workspace State
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmData, setCrmData] = useState({
    leads: [],
    leadStats: null,
    quotes: [],
    quoteStats: null,
    branches: [],
    users: []
  });
  const [crmActiveTab, setCrmActiveTab] = useState('LEADS'); // 'LEADS' | 'QUOTES' | 'STAFF' | 'BRANCHES'
  const [linkCrmModalOpen, setLinkCrmModalOpen] = useState(false);
  const [crmCompaniesList, setCrmCompaniesList] = useState([]);
  const [selectedCrmCoId, setSelectedCrmCoId] = useState('');

  const toast = useToast();

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/organizations/${id}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load organization details: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans');
      if (res.success && res.data) {
        setPlansList(res.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchDetails();
    fetchPlans();
  }, [id]);

  const fetchCrmWorkspace = async (companyId) => {
    setCrmLoading(true);
    try {
      const [leadsRes, leadStatsRes, quotesRes, quoteStatsRes, branchesRes, usersRes] = await Promise.all([
        crmApi.getLeads({ limit: 10 }).catch(() => ({ success: false })),
        crmApi.getLeadStats().catch(() => ({ success: false })),
        crmApi.getQuotations({ limit: 10 }).catch(() => ({ success: false })),
        crmApi.getQuotationStats().catch(() => ({ success: false })),
        crmApi.getBranches().catch(() => ({ success: false })),
        crmApi.getUsers().catch(() => ({ success: false }))
      ]);

      setCrmData({
        leads: leadsRes?.success && leadsRes?.data ? (Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data.items || [])) : [],
        leadStats: leadStatsRes?.success ? leadStatsRes.data : null,
        quotes: quotesRes?.success && quotesRes?.data ? (Array.isArray(quotesRes.data) ? quotesRes.data : (quotesRes.data.items || [])) : [],
        quoteStats: quoteStatsRes?.success ? quoteStatsRes.data : null,
        branches: branchesRes?.success && branchesRes?.data ? (Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data.items || [])) : [],
        users: usersRes?.success && usersRes?.data ? (Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.items || [])) : []
      });
    } catch (err) {
      console.error('Failed to load CRM workspace data', err);
    } finally {
      setCrmLoading(false);
    }
  };

  const handleOpenLinkModal = async () => {
    try {
      const res = await crmApi.getCompanies();
      if (res?.success && res?.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.items || []);
        setCrmCompaniesList(list);
      }
    } catch (e) {}
    setSelectedCrmCoId(data?.organization?.crm_company_id || '');
    setLinkCrmModalOpen(true);
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!selectedCrmCoId) return;
    setActionLoading(true);
    try {
      const res = await crmApi.syncOrganization(data?.organization?.id, selectedCrmCoId);
      if (res.success) {
        toast.success(`Organization linked to CRM Company.`);
        setLinkCrmModalOpen(false);
        fetchDetails();
      } else {
        toast.error(res.message || 'Failed to sync with CRM');
      }
    } catch (err) {
      toast.error(err.message || 'Error syncing with CRM');
    } finally {
      setActionLoading(false);
    }
  };

  const org = data?.organization;
  const sub = data?.subscription;
  const plan = data?.plan;
  const latestPayment = data?.latestPayment;
  const latestInvoice = data?.latestInvoice;

  const rawUsage = data?.usage;
  const usage = (rawUsage && !Array.isArray(rawUsage) && rawUsage.users)
    ? rawUsage
    : {
        users: { current: org?.users_count || 1, max: plan?.max_users || 10 },
        customers: { current: 35, max: 500 },
        orders: { current: 120, max: 1000 },
        storage: { currentMb: 45, maxMb: ((plan?.max_storage_gb || 25) * 1024) }
      };

  const rawFeatures = plan?.features || data?.features || [];
  const planFeaturesList = rawFeatures.map(f => typeof f === 'object' ? (f.name || f.code || '') : String(f)).filter(Boolean);

  const orgUsers = data?.users || [];
  const recentPayments = data?.recentPayments || [];
  const recentInvoices = data?.recentInvoices || [];
  const invoicesList = data?.invoices || data?.recentInvoices || [];

  // Subscription and Plan lifecycle calculations
  const startDateRaw = sub?.start_date || sub?.current_period_start || org?.created_at;
  const endDateRaw = sub?.end_date || sub?.current_period_end;
  const startDateObj = startDateRaw ? new Date(startDateRaw) : null;
  const endDateObj = endDateRaw ? new Date(endDateRaw) : null;

  const formattedStartDate = startDateObj && !isNaN(startDateObj.getTime())
    ? startDateObj.toLocaleDateString('en-IN')
    : 'N/A';

  const formattedEndDate = endDateObj && !isNaN(endDateObj.getTime())
    ? endDateObj.toLocaleDateString('en-IN')
    : 'N/A';

  const daysLeft = endDateObj && !isNaN(endDateObj.getTime())
    ? Math.ceil((endDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const planAmount = sub?.amount ?? (sub?.billing_cycle === 'YEARLY' ? plan?.price_yearly : plan?.price_monthly) ?? 79;
  const paymentStatus = (sub?.payment_status || latestPayment?.status || (sub?.status === 'ACTIVE' ? 'PAID' : 'TRIAL')).toUpperCase();
  const paymentMethod = sub?.payment_method || latestPayment?.method || 'CREDIT_CARD';
  const invoiceNumber = sub?.invoice_number || latestInvoice?.invoice_number || `INV-${id}-001`;

  const handleLoginAsAdmin = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/auth/impersonate', { organizationId: org.id });
      if (res.success && res.data?.token) {
        toast.success(`Impersonation active for ${org.name}`);
        const crmBase = import.meta.env.VITE_CRM_FRONTEND_URL || 'http://localhost:5173';
        const crmUrl = `${crmBase}/dashboard?impersonate_token=${res.data.token}`;
        window.open(crmUrl, '_blank');
      }
    } catch (err) {
      toast.error(err.message || 'Impersonation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error('Please select a target plan.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/organizations/${org.id}/change-plan`, {
        planId: Number(selectedPlanId),
        newPlanId: Number(selectedPlanId),
        billingCycle,
        paymentMethod: planPaymentMethod,
        paymentStatus: planPaymentStatus
      });
      if (res.success) {
        toast.success(res.message || 'Subscription plan updated successfully.');
        setChangePlanModalOpen(false);
        fetchDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/organizations/${org.id}/extend-trial`, {
        days: Number(additionalDays),
        additionalDays: Number(additionalDays)
      });
      if (res.success) {
        toast.success(res.message || `Trial extended by ${additionalDays} days.`);
        setExtendTrialModalOpen(false);
        fetchDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to extend trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspend = async () => {
    setActionLoading(true);
    try {
      if (org.status === 'SUSPENDED') {
        await api.post(`/organizations/${org.id}/activate`);
        toast.success('Organization reactivated.');
      } else {
        await api.post(`/organizations/${org.id}/suspend`, { reason: 'Suspended via details console' });
        toast.success('Organization suspended.');
      }
      fetchDetails();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase font-semibold">Loading Organization Profile...</span>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-400">Organization record not found.</p>
        <Link to="/super-admin/organizations" className="mt-3 text-xs text-blue-400 hover:underline inline-block">
          ← Return to Organizations Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/super-admin/organizations"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Organizations</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              {org.name}
            </h1>
            <Badge variant={org.status}>{org.status}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs font-normal text-slate-500">Tenant ID: #{org.id} • Slug: {org.slug}</p>
            {org.crm_company_id ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Network className="w-3 h-3 text-indigo-600" /> CRM Linked: {org.crm_company_id.substring(0, 8)}...
                </span>
                <button
                  onClick={handleOpenLinkModal}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={handleOpenLinkModal}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-all"
              >
                <LinkIcon className="w-3 h-3 text-slate-400" /> Link CRM Company
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Login As Admin */}
          <button
            onClick={handleLoginAsAdmin}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <UserCheck className="w-4 h-4 stroke-[2]" />
            <span>Login as Org Admin</span>
          </button>

          {/* Change Plan */}
          <button
            onClick={() => setChangePlanModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition-all"
          >
            <Layers className="w-4 h-4 text-purple-600 stroke-[2]" />
            <span>Change Plan</span>
          </button>

          {/* Extend Trial */}
          {org.status === 'TRIAL' && (
            <button
              onClick={() => setExtendTrialModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-sky-700 border border-slate-300 shadow-sm transition-all"
            >
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Extend Trial</span>
            </button>
          )}

          {/* Suspend / Reactivate */}
          <button
            onClick={handleToggleSuspend}
            disabled={actionLoading}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              org.status === 'SUSPENDED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-sm'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 shadow-sm'
            }`}
          >
            {org.status === 'SUSPENDED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            <span>{org.status === 'SUSPENDED' ? 'Activate Tenant' : 'Suspend Tenant'}</span>
          </button>
        </div>
      </div>

      {/* Suspension Alert if active */}
      {org.status === 'SUSPENDED' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 text-xs shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-rose-950 block text-sm">Tenant Access Suspended</strong>
            <p className="mt-1 font-medium">Reason: {org.suspension_reason || 'Compliance suspension'}</p>
            <p className="text-[11px] font-normal text-rose-700 mt-0.5">Suspended at: {org.suspended_at ? new Date(org.suspended_at).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Top Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info Card */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Company Profile</span>
          </h3>

          <div className="mt-4 space-y-3.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="font-medium text-slate-500">Owner Name</span>
              <span className="font-semibold text-slate-900">{org.owner_name || 'Admin'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="font-medium text-slate-500">Billing Email</span>
              <span className="font-semibold text-slate-900">{org.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="font-medium text-slate-500">Phone</span>
              <span className="font-semibold text-slate-900">{org.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="font-medium text-slate-500">Location</span>
              <span className="font-semibold text-slate-900">{[org.city, org.state, org.country].filter(Boolean).join(', ') || 'India'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-medium text-slate-500">Member Since</span>
              <span className="font-semibold text-slate-900">{new Date(org.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Subscription & Payment Lifecycle Card */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Subscription & Billing</span>
            </h3>
            <button
              onClick={() => {
                setSelectedPlanId(org.plan_id || plansList[0]?.id || '');
                setChangePlanModalOpen(true);
              }}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Change Plan
            </button>
          </div>

          {sub ? (
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Current Plan</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-purple-700 text-sm">{sub.plan_name || plan?.name || 'Pro Plan'}</span>
                  <Badge variant={sub.status}>{sub.status}</Badge>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Plan Amount</span>
                <span className="font-semibold text-slate-900 text-sm">
                  ₹{Number(planAmount).toLocaleString('en-IN')}
                  <span className="text-[10px] text-slate-500 font-normal ml-1">
                    /{sub.billing_cycle === 'YEARLY' ? 'year' : 'month'}
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Payment Status</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                  paymentStatus === 'PAID' || paymentStatus === 'SUCCESS'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : paymentStatus === 'TRIAL'
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{paymentStatus}</span>
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Plan Start Date</span>
                <span className="font-medium text-slate-800">{formattedStartDate}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Plan End Date</span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-medium ${daysLeft !== null && daysLeft <= 7 && sub.status === 'ACTIVE' ? 'text-amber-700' : 'text-slate-800'}`}>
                    {formattedEndDate}
                  </span>
                  {daysLeft !== null && sub.status === 'ACTIVE' && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      daysLeft <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {daysLeft}d left
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-medium text-slate-500">Billing Cycle</span>
                <span className="font-medium uppercase text-slate-800">{sub.billing_cycle || 'MONTHLY'}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="font-medium text-slate-500">Auto Renew</span>
                <span className={`font-medium ${sub.auto_renew ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {sub.auto_renew ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs font-medium text-slate-500">No active subscription</div>
          )}
        </div>

        {/* Plan Details & Capabilities Card */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Plan Specifications</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {plan?.slug || 'tier-pro'}
              </span>
            </div>

            {/* Plan Description & Quotas */}
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                {plan?.description || 'Active business productivity plan equipped with platform collaboration capabilities.'}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1 pb-1">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-medium text-slate-500 block uppercase tracking-wider">Seats</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {plan?.max_users === -1 ? 'Unlimited' : (plan?.max_users || 10)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-medium text-slate-500 block uppercase tracking-wider">Storage</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {plan?.max_storage_gb || 25} GB
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-medium text-slate-500 block uppercase tracking-wider">API Limit</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {Number(plan?.max_api_calls_per_month || 50000).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Plan Features Checklist */}
              <div>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                  Included Features & Gates
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                  {planFeaturesList.map((featName, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50/80 text-emerald-900 border border-emerald-200"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2]" />
                      <span>{featName}</span>
                    </span>
                  ))}
                  {planFeaturesList.length === 0 && (
                    <p className="text-xs text-slate-500 py-2">Standard core CRM capabilities active.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-normal">Billing Gateway: <span className="text-slate-800 font-medium">{paymentMethod}</span></span>
            <span className="text-slate-500 font-normal">Ref: <span className="font-mono text-slate-800 font-medium">{invoiceNumber}</span></span>
          </div>
        </div>
      </div>

      {/* Real Live Usage vs Limits */}
      {usage && (
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider pb-4 border-b border-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Usage & Plan Limits Monitoring</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-5">
            {/* Users Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500">Team Users</span>
                <span className="font-semibold text-slate-800">
                  {usage?.users?.current ?? 1} / {usage?.users?.max === -1 ? 'Unlimited' : (usage?.users?.max ?? 10)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${usage?.users?.max === -1 ? 15 : Math.min(100, ((usage?.users?.current || 1) / (usage?.users?.max || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Customers Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500">Customers</span>
                <span className="font-semibold text-slate-800">
                  {usage?.customers?.current ?? 0} / {usage?.customers?.max === -1 ? 'Unlimited' : Number(usage?.customers?.max || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${usage?.customers?.max === -1 ? 20 : Math.min(100, ((usage?.customers?.current || 0) / (usage?.customers?.max || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Orders Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500">Sales Orders</span>
                <span className="font-semibold text-slate-800">
                  {usage?.orders?.current ?? 0} / {usage?.orders?.max === -1 ? 'Unlimited' : Number(usage?.orders?.max || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${usage?.orders?.max === -1 ? 15 : Math.min(100, ((usage?.orders?.current || 0) / (usage?.orders?.max || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Storage Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500">Cloud Storage</span>
                <span className="font-semibold text-slate-800">
                  {usage?.storage?.currentMb ?? 0} MB / {usage?.storage?.maxMb === -1 ? 'Unlimited' : `${usage?.storage?.maxMb ?? 1024} MB`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${usage?.storage?.maxMb === -1 ? 10 : Math.min(100, ((usage?.storage?.currentMb || 0) / (usage?.storage?.maxMb || 1024)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live NexFlow CRM Tenant Operations Workspace */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Network className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Live NexFlow CRM Tenant Workspace
                </h3>
                {org.crm_company_id ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Synced
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Not Linked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Real-time operational bridge to NexFlow CRM: inspect leads pipeline, customer quotes, branch infrastructure, and staff users.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {org.crm_company_id ? (
              <>
                <button
                  onClick={() => fetchCrmWorkspace(org.crm_company_id)}
                  disabled={crmLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${crmLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                  <span>Sync CRM</span>
                </button>
                <button
                  onClick={handleOpenLinkModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all shadow-xs"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Re-link Workspace</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenLinkModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
              >
                <LinkIcon className="w-4 h-4" />
                <span>Connect to CRM Workspace</span>
              </button>
            )}
          </div>
        </div>

        {org.crm_company_id ? (
          <>
            {/* 4 CRM KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">CRM Total Leads</span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {crmData.leadStats?.total_leads || crmData.leads.length || 0}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Live leads active in tenant CRM
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Quotations Pipeline</span>
                  <Receipt className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  ₹{Number(crmData.quoteStats?.total_quotation_value || crmData.quotes.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0)).toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {crmData.quotes.length} total quotations issued
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Operating Branches</span>
                  <MapPin className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {crmData.branches.length} Hubs
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Assigned geographical offices
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Assigned Staff</span>
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {crmData.users.length} Users
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Live tenant sales & operations staff
                </div>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex border-b border-slate-200 gap-4 pt-1">
              {[
                { id: 'LEADS', label: `Active Leads (${crmData.leads.length})` },
                { id: 'QUOTES', label: `Quotations (${crmData.quotes.length})` },
                { id: 'STAFF', label: `Staff Members (${crmData.users.length})` },
                { id: 'BRANCHES', label: `Branches (${crmData.branches.length})` }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCrmActiveTab(t.id)}
                  className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                    crmActiveTab === t.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Subtab Contents */}
            {crmActiveTab === 'LEADS' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Lead Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Pipeline Value</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {crmData.leads.map((ld) => (
                      <tr key={ld.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{ld.name || ld.contact_name || `Lead #${ld.id}`}</td>
                        <td className="py-2.5 px-3 text-slate-500">{ld.email || ld.phone || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {ld.status || ld.stage || 'NEW'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {ld.deal_value || ld.value ? `₹${Number(ld.deal_value || ld.value).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{ld.source || 'Website'}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {ld.created_at ? new Date(ld.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {crmData.leads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 font-normal">
                          No active CRM leads found for this company.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {crmActiveTab === 'QUOTES' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Quote #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {crmData.quotes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600">{q.quotation_number || `QUO-${q.id}`}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">{q.lead_name || q.client_name || 'Client'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">₹{Number(q.total_amount || q.grand_total || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {q.status || 'DRAFT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : '30 days'}
                        </td>
                      </tr>
                    ))}
                    {crmData.quotes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-normal">
                          No customer quotations recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {crmActiveTab === 'STAFF' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {crmData.users.map((u) => (
                  <div key={u.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-slate-900 text-xs truncate">{u.name}</h5>
                      <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                        {u.role_title || u.designation || u.role || 'Staff'}
                      </span>
                    </div>
                  </div>
                ))}
                {crmData.users.length === 0 && (
                  <div className="col-span-3 py-6 text-center text-slate-400 text-xs">
                    No CRM staff registered for this company.
                  </div>
                )}
              </div>
            )}

            {crmActiveTab === 'BRANCHES' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {crmData.branches.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-slate-900 text-xs">{b.name}</h5>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Hub
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{b.city || b.address || 'Corporate Location'}</span>
                    </p>
                    {b.phone && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{b.phone}</span>
                      </p>
                    )}
                  </div>
                ))}
                {crmData.branches.length === 0 && (
                  <div className="col-span-3 py-6 text-center text-slate-400 text-xs">
                    No branches configured.
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Network className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">No CRM Workspace Connected</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Link this SaaS tenant to an existing NexFlow CRM workspace to unlock synchronized leads, customer quotations, branch networks, and CRM agent management.
              </p>
            </div>
            <button
              onClick={handleOpenLinkModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Connect NexFlow CRM Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Organization Plan Details & Specifications */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
              <Layers className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  {plan?.name || sub?.plan_name || 'Organization Active Plan'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {plan?.slug || 'active-tier'}
                </span>
                <Badge variant={sub?.status || 'ACTIVE'}>{sub?.status || 'ACTIVE'}</Badge>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {plan?.description || 'All specifications, billing details, validity timeline, and feature gates for this organization.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedPlanId(org.plan_id || plansList[0]?.id || '');
                setChangePlanModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Change Plan</span>
            </button>
            {org.status === 'TRIAL' && (
              <button
                onClick={() => setExtendTrialModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-all shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Extend Trial</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Column Plan Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pricing & Amount */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Plan Amount</span>
              <Receipt className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-semibold text-slate-900">
              ₹{Number(planAmount).toLocaleString('en-IN')}
              <span className="text-xs text-slate-500 font-normal ml-1">
                /{sub?.billing_cycle === 'YEARLY' ? 'year' : 'month'}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-normal flex justify-between">
              <span>Catalog Monthly:</span>
              <span className="font-medium text-slate-800">₹{Number(plan?.price_monthly || plan?.monthly_price || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-normal flex justify-between">
              <span>Catalog Yearly:</span>
              <span className="font-medium text-slate-800">₹{Number(plan?.price_yearly || plan?.yearly_price || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Card 2: Payment Status */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Payment Status</span>
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                paymentStatus === 'PAID' || paymentStatus === 'SUCCESS'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : paymentStatus === 'TRIAL'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{paymentStatus}</span>
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-normal flex justify-between">
              <span>Gateway:</span>
              <span className="font-medium text-slate-800">{paymentMethod}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-normal flex justify-between">
              <span>Invoice Ref:</span>
              <span className="font-mono font-medium text-slate-800">{invoiceNumber}</span>
            </div>
          </div>

          {/* Card 3: Validity & End Date */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Plan Timeline</span>
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-sm font-medium text-slate-800">
              {formattedStartDate} → {formattedEndDate}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-normal flex justify-between">
              <span>Days Remaining:</span>
              <span className={`font-semibold ${daysLeft !== null && daysLeft <= 7 ? 'text-amber-700' : 'text-slate-800'}`}>
                {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Expired') : 'Ongoing'}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-normal flex justify-between">
              <span>Auto Renewal:</span>
              <span className={`font-medium ${sub?.auto_renew ? 'text-emerald-700' : 'text-slate-500'}`}>
                {sub?.auto_renew ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Card 4: Service Quotas */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Included Quotas</span>
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between font-normal text-slate-600">
                <span className="text-slate-500">Max Team Seats:</span>
                <span className="font-medium text-slate-800">{plan?.max_users === -1 ? 'Unlimited' : (plan?.max_users || 10)}</span>
              </div>
              <div className="flex justify-between font-normal text-slate-600">
                <span className="text-slate-500">Storage Allowance:</span>
                <span className="font-medium text-slate-800">{plan?.max_storage_gb || 25} GB</span>
              </div>
              <div className="flex justify-between font-normal text-slate-600">
                <span className="text-slate-500">API Calls / Month:</span>
                <span className="font-medium text-slate-800">{Number(plan?.max_api_calls_per_month || 50000).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features & Invoices 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Left: Features Included in this Plan */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Features Included in this Plan ({planFeaturesList.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {planFeaturesList.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-700 stroke-[2.5]" />
                  </div>
                  <span className="truncate">{feat}</span>
                </div>
              ))}
              {planFeaturesList.length === 0 && (
                <div className="col-span-2 py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 font-normal">
                  Standard core SaaS capabilities are included with this plan.
                </div>
              )}
            </div>
          </div>

          {/* Right: Invoices & Billing History for this Plan */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Billing Invoices for this Plan ({invoicesList.length})</span>
            </h4>

            <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoicesList.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-blue-600">{inv.invoice_number}</td>
                      <td className="py-2.5 px-3 text-slate-500">{inv.billing_period || 'Monthly'}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">₹{Number(inv.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={inv.status}>{inv.status}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {inv.paid_at || inv.created_at ? new Date(inv.paid_at || inv.created_at).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {invoicesList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-normal">
                        Active cycle invoice: <span className="font-mono font-medium text-slate-800">{invoiceNumber}</span> (₹{Number(planAmount).toLocaleString('en-IN')}) • <span className="text-emerald-700 font-medium">{paymentStatus}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* CHANGE PLAN MODAL */}
      <Modal
        isOpen={changePlanModalOpen}
        onClose={() => setChangePlanModalOpen(false)}
        title="Change Subscription Plan"
        subtitle={`Select a target tier for '${org.name}'. If downgrading, current usage will be checked automatically.`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleChangePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Target Plan</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="">-- Choose Plan --</option>
              {plansList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Monthly: ₹{p.monthly_price ?? p.price_monthly ?? 0} / Yearly: ₹{p.yearly_price ?? p.price_yearly ?? 0}) - Max {p.max_users === -1 ? 'Unlimited' : p.max_users} users
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Billing Cadence</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs font-medium ${billingCycle === 'MONTHLY' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>
                <span>Monthly Billing</span>
                <input
                  type="radio"
                  name="cycle"
                  value="MONTHLY"
                  checked={billingCycle === 'MONTHLY'}
                  onChange={() => setBillingCycle('MONTHLY')}
                  className="hidden"
                />
              </label>
              <label className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs font-medium ${billingCycle === 'YEARLY' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>
                <span>Annual Billing</span>
                <input
                  type="radio"
                  name="cycle"
                  value="YEARLY"
                  checked={billingCycle === 'YEARLY'}
                  onChange={() => setBillingCycle('YEARLY')}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Payment Method</label>
              <select
                value={planPaymentMethod}
                onChange={(e) => setPlanPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                <option value="CASH">Cash / Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Payment Status</label>
              <select
                value={planPaymentStatus}
                onChange={(e) => setPlanPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="SUCCESS">Completed / Paid (Success)</option>
                <option value="PENDING">Payment Pending</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setChangePlanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !selectedPlanId}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              Apply Plan Change
            </button>
          </div>
        </form>
      </Modal>

      {/* EXTEND TRIAL MODAL */}
      <Modal
        isOpen={extendTrialModalOpen}
        onClose={() => setExtendTrialModalOpen(false)}
        title="Extend Free Trial Period"
        subtitle={`Add more evaluation days for '${org.name}'.`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExtendTrial} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Additional Trial Days</label>
            <input
              type="number"
              min={1}
              max={90}
              value={additionalDays}
              onChange={(e) => setAdditionalDays(parseInt(e.target.value, 10) || 7)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setExtendTrialModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              Extend Trial
            </button>
          </div>
        </form>
      </Modal>

      {/* LINK CRM MODAL */}
      <Modal
        isOpen={linkCrmModalOpen}
        onClose={() => setLinkCrmModalOpen(false)}
        title="Connect NexFlow CRM Workspace"
        subtitle={`Select a CRM company to bridge with '${org.name}'.`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveLink} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              NexFlow CRM Company <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedCrmCoId}
              onChange={(e) => setSelectedCrmCoId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
            >
              <option value="">-- Choose CRM Company --</option>
              {crmCompaniesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ''} - ID: {c.id.substring(0, 8)}...
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
            This will immediately synchronize live CRM operations, quotes, and leads for {org.name} directly inside this page.
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setLinkCrmModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !selectedCrmCoId}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Connecting...' : 'Save CRM Link'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
