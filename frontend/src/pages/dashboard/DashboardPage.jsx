import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { crmApi } from '../../services/crmApi';
import { MetricCard } from '../../components/common/MetricCard';
import { AreaChart, BarChart, DonutChart } from '../../components/common/Charts';
import { Badge } from '../../components/common/Badge';
import {
  Building2,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
  MoreVertical,
  Calendar,
  Network,
  Flame,
  MessageSquare,
  FileSpreadsheet,
  Activity,
  PhoneCall,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function DashboardPage() {
  const { user, isSuperAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [crmStats, setCrmStats] = useState(null);
  const [crmActivities, setCrmActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [saasRes, crmSummaryRes, crmLeadRes, crmQuoteRes, crmWaRes, crmActRes] = await Promise.allSettled([
        api.get('/dashboard/stats'),
        crmApi.getReportsSummary(),
        crmApi.getLeadStats(),
        crmApi.getQuotationStats(),
        crmApi.getWhatsAppStats(),
        crmApi.getActivities({ limit: 5 })
      ]);

      if (saasRes.status === 'fulfilled' && saasRes.value?.success) {
        setData(saasRes.value.data);
      } else {
        throw new Error('Failed to load dashboard metrics');
      }

      // Merge CRM Live Metrics if available
      const crmData = {
        reports: crmSummaryRes.status === 'fulfilled' && crmSummaryRes.value?.success ? crmSummaryRes.value.data : null,
        leads: crmLeadRes.status === 'fulfilled' && crmLeadRes.value?.success ? crmLeadRes.value.data : null,
        quotations: crmQuoteRes.status === 'fulfilled' && crmQuoteRes.value?.success ? crmQuoteRes.value.data : null,
        whatsapp: crmWaRes.status === 'fulfilled' && crmWaRes.value?.success ? crmWaRes.value.data : null
      };
      setCrmStats(crmData);

      if (crmActRes.status === 'fulfilled' && crmActRes.value?.success) {
        setCrmActivities(crmActRes.value.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const orgs = data?.organizations || {};
  const subs = data?.subscriptions || {};
  const rev = data?.revenue || {};
  const users = data?.users || {};
  const charts = data?.charts || {};
  const recentOrgs = data?.recentOrganizations || [];

  return (
    <div className="space-y-7 animate-fade-in pb-10">
      {/* Top Welcome & Quick Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>{!isSuperAdmin ? `${user?.organizationName || 'Company'} Workspace Dashboard` : 'Performance & CRM Control Center'}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            {!isSuperAdmin
              ? `Dedicated CRM Workspace • Sold Plan: ${subs.plan_name || 'Business Plan'} • Company Admin: ${user?.email || ''}`
              : 'Unified multi-tenant SaaS metrics, active subscriptions, revenue, and live NexFlow CRM operations.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={fetchDashboardStats}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:border-slate-400 transition-colors shadow-sm cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2] ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {isSuperAdmin && (
            <>
              {/* CRM Integration Matrix Link */}
              <Link
                to="/super-admin/crm-integration"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm transition-all"
              >
                <Network className="w-4 h-4 stroke-[2]" />
                <span>CRM Health Gateway</span>
              </Link>

              {/* New Org Quick Button */}
              <Link
                to="/super-admin/organizations"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>New CRM Company</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Row 1: Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title={!isSuperAdmin ? "Company Status" : "Total Organizations"}
          value={!isSuperAdmin ? (orgs.active ? "ACTIVE" : "TRIAL") : (orgs.total || 0)}
          subtitle={!isSuperAdmin ? "Isolated CRM Workspace" : `${orgs.active || 0} Active • ${orgs.trial || 0} Trial • ${orgs.suspended || 0} Suspended`}
          icon={Building2}
          featured={true}
          trend={!isSuperAdmin ? "Verified" : "+15% from last month"}
          trendPositive={true}
        />

        <MetricCard
          title={!isSuperAdmin ? "Assigned Plan" : "Active Subscriptions"}
          value={!isSuperAdmin ? (subs.plan_name || "Pro Business") : (subs.active || 0)}
          subtitle={!isSuperAdmin ? "Monthly Billing Cycle" : `${subs.expiringSoon || 0} Expiring soon (7 days)`}
          icon={CreditCard}
          color="amber"
          trend={!isSuperAdmin ? "Active" : "-10% from last month"}
          trendPositive={!isSuperAdmin}
        />

        <MetricCard
          title={!isSuperAdmin ? "Subscription Fee" : "Monthly SaaS Revenue"}
          value={`₹${(rev.monthly || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={!isSuperAdmin ? `Plan Billed: ₹${(rev.monthly || 0).toLocaleString('en-IN')}/mo` : `Yearly: ₹${(rev.yearly || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="emerald"
          trend={!isSuperAdmin ? "Paid" : "+8.2% from last month"}
          trendPositive={true}
        />

        <MetricCard
          title={!isSuperAdmin ? "Workspace Users" : "Total SaaS & CRM Users"}
          value={users.total || 1}
          subtitle={!isSuperAdmin ? `${users.active || 1} Active user accounts` : `${users.active || 0} active • 7 CRM staff members`}
          icon={Users}
          color="purple"
          trend={!isSuperAdmin ? "Dedicated" : "+5% from last month"}
          trendPositive={true}
        />
      </div>

      {/* LIVE CRM OPERATIONS PULSE */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/70 border border-slate-800 p-6 shadow-xl text-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>{!isSuperAdmin ? `${user?.organizationName || 'Company'} CRM Workspace Pulse` : 'Live NexFlow CRM Operations Pulse'}</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {!isSuperAdmin
                ? 'Real-time isolated data for your company workspace in NexFlow CRM'
                : 'Real-time synchronization with active CRM engine (`https://api.nexflowcrm.com/api/v1`)'}
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Link
                to="/super-admin/users"
                className="text-xs font-medium text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
              >
                Manage CRM Users →
              </Link>
              <Link
                to="/super-admin/organizations"
                className="text-xs font-medium text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
              >
                Manage CRM Companies →
              </Link>
            </div>
          )}
        </div>

        {/* 4 CRM Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 relative z-10">
          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CRM Total Leads</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black text-white mt-1 block">
              {crmStats?.leads?.total ?? crmStats?.reports?.totalLeads ?? 0}
            </span>
            <span className="text-[11px] text-amber-300 block mt-0.5">
              Avg Score: {crmStats?.leads?.avgScore || 0}/100 • Hot: {crmStats?.leads?.hot || 0}
            </span>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CRM Quotes Pipeline</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              ₹{Number(crmStats?.quotations?.totalValue ?? crmStats?.reports?.totalRevenue ?? 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {crmStats?.quotations?.total ?? 0} Quotes ({crmStats?.quotations?.accepted || 0} Accepted)
            </span>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">WhatsApp Engagement</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-white mt-1 block">
              {crmStats?.whatsapp?.activeChats ?? 0} Threads
            </span>
            <span className="text-[11px] text-emerald-300 block mt-0.5">
              Response Rate: {crmStats?.whatsapp?.responseRate || '100%'}
            </span>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch Offices</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-2xl font-black text-white mt-1 block">
              {!isSuperAdmin ? '1 Active' : '4 Active'}
            </span>
            <span className="text-[11px] text-purple-300 block mt-0.5">
              {!isSuperAdmin ? 'Primary Company Workspace' : 'Mumbai HQ, Delhi, Pune (7 staff assigned)'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              {!isSuperAdmin ? "Pipeline Leads" : "Trial Orgs"}
            </span>
            <span className="text-2xl font-black text-sky-700 mt-1 block">
              {!isSuperAdmin ? (crmStats?.leads?.total ?? 0) : (orgs.trial || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              {!isSuperAdmin ? "Billing Cycle" : "Expiring (7d)"}
            </span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {!isSuperAdmin ? "Monthly" : (subs.expiringSoon || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              {!isSuperAdmin ? "Access Role" : "Suspended"}
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {!isSuperAdmin ? "Owner" : (orgs.suspended || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              {!isSuperAdmin ? "Payment Status" : "Failed Payments"}
            </span>
            <span className="text-2xl font-black text-purple-700 mt-1 block">
              {!isSuperAdmin ? "PAID" : (rev.failedPayments || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Row 3: Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue Performance Overview Area Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Performance Overview
                </h3>
                <p className="text-xs font-normal text-slate-500 mt-0.5">Platform billed subscription revenue trend</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
                  <span>Last 30 Days</span>
                </div>
              </div>
            </div>

            <div className="mt-2 mb-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Total Revenue</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  ₹{(rev.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  ▲ 30.24%
                </span>
              </div>
            </div>
          </div>

          <div className="h-64 mt-2">
            <AreaChart data={charts.monthlyRevenueTrend || []} />
          </div>
        </div>

        {/* Right: Plan Distribution Donut Chart */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                Subscription Tier Share
              </h3>
              <p className="text-xs font-normal text-slate-500 mt-0.5">Active tenant plan distribution</p>
            </div>
            <div className="h-60 mt-3 flex items-center justify-center">
              <DonutChart data={charts.planDistribution || []} />
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Two Split Columns (Recent SaaS Organizations & Recent CRM Activities) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recently Enrolled Organizations */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Recently Enrolled Organizations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">SaaS multi-tenant accounts</p>
            </div>
            <Link
              to="/super-admin/organizations"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {recentOrgs.map((org) => (
              <div key={org.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link to={`/super-admin/organizations/${org.id}`} className="font-bold text-slate-900 text-xs hover:text-blue-600">
                    {org.name}
                  </Link>
                  <p className="text-[11px] text-slate-500">{org.email} • {org.plan_name}</p>
                </div>
                <Badge variant={org.status}>{org.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live CRM Operational Activity Stream */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Live CRM Activities
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time interactions from CRM agents and leads</p>
              </div>
            </div>
            <Link
              to="/super-admin/audit-logs"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:underline"
            >
              <span>Full Stream</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {crmActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent CRM activity recorded.</p>
            ) : (
              crmActivities.slice(0, 5).map((act, idx) => (
                <div key={act.id || idx} className="py-3 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{act.title || act.type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {act.created_at ? new Date(act.created_at).toLocaleTimeString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{act.description}</p>
                    {act.leadName && (
                      <span className="inline-block mt-1 text-[10px] text-indigo-600 font-medium">
                        Lead: {act.leadName}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
