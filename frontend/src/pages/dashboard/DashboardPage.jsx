import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
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
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard/stats');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || 'Failed to load dashboard metrics');
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
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Performance Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Real-time multi-tenant SaaS metrics, subscriptions and revenue performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={fetchDashboardStats}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:border-slate-400 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2] ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Revenue Analytics Link */}
          <Link
            to="/super-admin/analytics"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
          >
            <TrendingUp className="w-4 h-4 stroke-[2]" />
            <span>Revenue Analytics</span>
          </Link>

          {/* New Org Quick Button */}
          <Link
            to="/super-admin/organizations"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>Add Organization</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Primary KPI Cards (First Card is Vibrant Blue Gradient, rest are Clean White) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Organizations"
          value={orgs.total || 0}
          subtitle={`${orgs.active || 0} Active • ${orgs.trial || 0} Trial • ${orgs.suspended || 0} Suspended`}
          icon={Building2}
          featured={true}
          trend="+15% from last month"
          trendPositive={true}
        />

        <MetricCard
          title="Active Subscriptions"
          value={subs.active || 0}
          subtitle={`${subs.expiringSoon || 0} Expiring soon (7 days)`}
          icon={CreditCard}
          color="amber"
          trend="-10% from last month"
          trendPositive={false}
        />

        <MetricCard
          title="Monthly SaaS Revenue"
          value={`₹${(rev.monthly || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={`Yearly: ₹${(rev.yearly || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="emerald"
          trend="+8.2% from last month"
          trendPositive={true}
        />

        <MetricCard
          title="Total CRM Users"
          value={users.total || 0}
          subtitle={`${users.active || 0} active • ${users.newLast30Days || 0} new this month`}
          icon={Users}
          color="purple"
          trend="+5% from last month"
          trendPositive={true}
        />
      </div>

      {/* Row 2: Secondary Status Cards (Soft White Pill Cards with Bold Indicators) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Trial Orgs</span>
            <span className="text-2xl font-black text-sky-700 mt-1 block">{orgs.trial || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Expiring (7d)</span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">{subs.expiringSoon || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Suspended</span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">{orgs.suspended || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Failed Payments</span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">{rev.failedPayments || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Row 3: Visual Analytics Section (Matches Middle of Reference Screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue Performance Overview Area Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header with Title & Date Pill Dropdown */}
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
                <button className="p-1.5 text-slate-400 hover:text-slate-700">
                  <MoreVertical className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* Key Number Display with Realistic Contrast */}
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

          {/* Smooth Curvy Area Chart */}
          <div className="mt-2 pt-2">
            <AreaChart data={charts.monthlyRevenueTrend || []} height={220} color="#2563eb" />
          </div>
        </div>

        {/* Right: Subscription Distribution Donut Chart (1 Col) */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Subscription Activity
                </h3>
                <p className="text-xs font-normal text-slate-500 mt-0.5">Active subscriptions by plan tier</p>
              </div>
              <button className="p-1.5 text-slate-400 hover:text-slate-700">
                <MoreVertical className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Centered Donut with 100% and colorful slices */}
          <div className="py-4 flex items-center justify-center">
            <DonutChart data={charts.planDistribution || []} />
          </div>

          <div className="pt-3 border-t border-slate-200 text-center">
            <Link
              to="/super-admin/subscriptions"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 hover:underline"
            >
              <span>Manage all subscriptions</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 4: New Organizations Growth & Revenue by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Organizations Bar Chart */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 stroke-[2]" />
                <span>New Organization Registrations</span>
              </h3>
              <p className="text-xs font-normal text-slate-500 mt-0.5">Tenant onboarding trend over time</p>
            </div>
          </div>
          <div className="mt-4">
            <BarChart data={charts.organizationsTrend || []} height={180} color="#10b981" />
          </div>
        </div>

        {/* Revenue by Plan Breakdown */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Revenue by Plan
              </h3>
              <p className="text-xs font-normal text-slate-500 mt-0.5">Total collected revenue by tier</p>
            </div>
            <Link to="/super-admin/plans" className="text-xs font-medium text-blue-600 hover:underline">
              View Plans
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {charts.revenueByPlan && charts.revenueByPlan.length > 0 ? (
              charts.revenueByPlan.map((p, i) => (
                <div key={i} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="font-medium text-slate-800">{p.plan_name}</span>
                    <span className="text-xs text-slate-400">({p.transactions_count} orders)</span>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm">₹{parseFloat(p.revenue || 0).toLocaleString('en-IN')}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No plan billing records yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Recent Organizations Data Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              Recently Enrolled Organizations
            </h3>
            <p className="text-xs font-normal text-slate-500 mt-0.5">Latest customer companies added to the SaaS platform</p>
          </div>
          <Link
            to="/super-admin/organizations"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 hover:underline"
          >
            <span>View All Organizations</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50">
                <th className="py-4 px-4 rounded-l-xl">Company Name</th>
                <th className="py-4 px-4">Owner</th>
                <th className="py-4 px-4">Contact Email</th>
                <th className="py-4 px-4">Current Plan</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {recentOrgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 font-black text-slate-950 text-sm">
                    <Link to={`/super-admin/organizations/${org.id}`} className="hover:text-blue-600 transition-colors">
                      {org.name}
                    </Link>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-800">{org.owner_name || 'Admin'}</td>
                  <td className="py-4 px-4 font-semibold text-slate-600">{org.email}</td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                      {org.plan_name || 'Pro'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={org.status}>{org.status}</Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link
                      to={`/super-admin/organizations/${org.id}`}
                      className="text-blue-700 hover:text-blue-900 font-extrabold underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
