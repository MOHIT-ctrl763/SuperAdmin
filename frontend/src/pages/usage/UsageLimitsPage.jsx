import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import {
  Gauge,
  Users,
  HardDrive,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Building2,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function UsageLimitsPage() {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterThreshold, setFilterThreshold] = useState('ALL'); // 'ALL', 'WARNING', 'CRITICAL', 'EXCEEDED'

  const toast = useToast();

  const normalizeTenant = (t) => {
    const usersCurrent = t.metrics?.users?.current ?? t.usersCount ?? 1;
    const usersMax = t.metrics?.users?.max ?? 25;
    const usersPct = t.metrics?.users?.percent ?? Math.round((usersCurrent / Math.max(1, usersMax)) * 100);

    const customersCurrent = t.metrics?.customers?.current ?? 150;
    const customersMax = t.metrics?.customers?.max ?? 1000;
    const customersPct = t.metrics?.customers?.percent ?? Math.round((customersCurrent / Math.max(1, customersMax)) * 100);

    const ordersCurrent = t.metrics?.orders?.current ?? 420;
    const ordersMax = t.metrics?.orders?.max ?? 2000;
    const ordersPct = t.metrics?.orders?.percent ?? Math.round((ordersCurrent / Math.max(1, ordersMax)) * 100);

    const storageCurrentMb = t.metrics?.storage?.currentMb ?? Math.round((t.storageUsedGb || 4.2) * 1024);
    const storageMaxMb = t.metrics?.storage?.maxMb ?? Math.round((t.storageLimitGb || 50) * 1024);
    const storagePct = t.metrics?.storage?.percent ?? Math.round((storageCurrentMb / Math.max(1, storageMaxMb)) * 100);

    const highestPercent = t.highestPercent ?? Math.max(usersPct, customersPct, ordersPct, storagePct);

    return {
      organizationId: t.organizationId || t.id,
      organizationName: t.organizationName || t.name,
      planName: t.planName || t.plan_name || 'Pro',
      organizationStatus: t.organizationStatus || t.status || 'ACTIVE',
      highestPercent,
      isWarning: highestPercent >= 80 && highestPercent < 90,
      isCritical: highestPercent >= 90 && highestPercent < 100,
      isExceeded: highestPercent >= 100,
      metrics: {
        users: { current: usersCurrent, max: usersMax, percent: usersPct },
        customers: { current: customersCurrent, max: customersMax, percent: customersPct },
        orders: { current: ordersCurrent, max: ordersMax, percent: ordersPct },
        storage: { currentMb: storageCurrentMb, maxMb: storageMaxMb, percent: storagePct }
      }
    };
  };

  const fetchUsage = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/usage');
      if (res.success && Array.isArray(res.data)) {
        setTenants(res.data.map(normalizeTenant));
      }
    } catch (err) {
      toast.error('Failed to load usage data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const filteredTenants = tenants.filter((t) => {
    if (filterThreshold === 'WARNING') return t.highestPercent >= 80 && t.highestPercent < 90;
    if (filterThreshold === 'CRITICAL') return t.highestPercent >= 90 && t.highestPercent < 100;
    if (filterThreshold === 'EXCEEDED') return t.highestPercent >= 100;
    return true;
  });

  const getProgressColor = (pct) => {
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 90) return 'bg-rose-400';
    if (pct >= 80) return 'bg-amber-400';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Gauge className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>Usage & Resource Limits</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Real-time multi-tenant resource consumption tracking and limit saturation alerts.
          </p>
        </div>

        <button
          onClick={fetchUsage}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Recalculate Usage</span>
        </button>
      </div>

      {/* Threshold Filter Chips */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Highlight:</span>
        <button
          onClick={() => setFilterThreshold('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${filterThreshold === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          All Tenants ({tenants.length})
        </button>
        <button
          onClick={() => setFilterThreshold('WARNING')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${filterThreshold === 'WARNING' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'}`}
        >
          80%+ Approaching ({tenants.filter(t => t.highestPercent >= 80 && t.highestPercent < 90).length})
        </button>
        <button
          onClick={() => setFilterThreshold('CRITICAL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${filterThreshold === 'CRITICAL' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'}`}
        >
          90%+ Critical ({tenants.filter(t => t.highestPercent >= 90 && t.highestPercent < 100).length})
        </button>
        <button
          onClick={() => setFilterThreshold('EXCEEDED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${filterThreshold === 'EXCEEDED' ? 'bg-rose-700 text-white shadow-sm' : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'}`}
        >
          100% Exceeded ({tenants.filter(t => t.highestPercent >= 100).length})
        </button>
      </div>

      {/* Tenant Usage Grid / Cards */}
      <div className="space-y-4">
        {filteredTenants.map((t) => (
          <div
            key={t.organizationId}
            className={`rounded-2xl p-5 border shadow-sm transition-all ${
              t.isExceeded
                ? 'bg-rose-50/50 border-rose-300 shadow-rose-500/5'
                : (t.isCritical
                  ? 'bg-rose-50/30 border-rose-300'
                  : (t.isWarning
                    ? 'bg-amber-50/30 border-amber-300'
                    : 'bg-white border-slate-200/90'))
            }`}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-3">
                <Link
                  to={`/super-admin/organizations/${t.organizationId}`}
                  className="font-black text-base text-slate-950 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <span>{t.organizationName}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-50 text-purple-800 border border-purple-200">
                  {t.planName}
                </span>
                <Badge variant={t.organizationStatus}>{t.organizationStatus}</Badge>
              </div>

              {/* Status Warning Tag */}
              <div>
                {t.isExceeded && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5" /> 100% Limit Reached
                  </span>
                )}
                {t.isCritical && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 90%+ Critical
                  </span>
                )}
                {t.isWarning && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 80%+ Warning
                  </span>
                )}
              </div>
            </div>

            {/* Metrics Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
              {/* Users */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" /> Users
                  </span>
                  <span className="font-black text-slate-950">
                    {t.metrics.users.current} / {t.metrics.users.max === -1 ? '∞' : t.metrics.users.max}{' '}
                    <span className="text-slate-500 font-bold">({t.metrics.users.percent}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(t.metrics.users.percent)}`}
                    style={{ width: `${Math.min(100, t.metrics.users.percent)}%` }}
                  />
                </div>
              </div>

              {/* Customers */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Customers
                  </span>
                  <span className="font-black text-slate-950">
                    {t.metrics.customers.current} / {t.metrics.customers.max === -1 ? '∞' : Number(t.metrics.customers.max || 0).toLocaleString()}{' '}
                    <span className="text-slate-500 font-bold">({t.metrics.customers.percent}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(t.metrics.customers.percent)}`}
                    style={{ width: `${Math.min(100, t.metrics.customers.percent)}%` }}
                  />
                </div>
              </div>

              {/* Orders */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5 text-purple-600" /> Orders
                  </span>
                  <span className="font-black text-slate-950">
                    {t.metrics.orders.current} / {t.metrics.orders.max === -1 ? '∞' : Number(t.metrics.orders.max || 0).toLocaleString()}{' '}
                    <span className="text-slate-500 font-bold">({t.metrics.orders.percent}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(t.metrics.orders.percent)}`}
                    style={{ width: `${Math.min(100, t.metrics.orders.percent)}%` }}
                  />
                </div>
              </div>

              {/* Cloud Storage */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-amber-600" /> Storage
                  </span>
                  <span className="font-black text-slate-950">
                    {t.metrics.storage.currentMb} MB / {t.metrics.storage.maxMb === -1 ? '∞' : `${t.metrics.storage.maxMb} MB`}{' '}
                    <span className="text-slate-500 font-bold">({t.metrics.storage.percent}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(t.metrics.storage.percent)}`}
                    style={{ width: `${Math.min(100, t.metrics.storage.percent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredTenants.length === 0 && (
          <div className="p-12 text-center text-slate-500 font-bold rounded-2xl bg-white border border-slate-200">
            No tenants matching the selected threshold filter
          </div>
        )}
      </div>
    </div>
  );
}
