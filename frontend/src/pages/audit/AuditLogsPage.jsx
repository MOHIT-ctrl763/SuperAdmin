import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { ShieldCheck, Search, Filter, ShieldAlert } from 'lucide-react';

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/audit-logs', {
        page,
        limit: 15,
        search,
        module: moduleFilter
      });
      if (res.success && res.data) {
        setLogs(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load audit logs: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [search, moduleFilter]);

  const columns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono font-normal">
          {new Date(row.created_at).toLocaleString()}
        </span>
      )
    },
    {
      key: 'user_name',
      label: 'Actor',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 text-sm">{row.user_name || 'System Actor'}</span>
          <span className="text-[10px] text-slate-500 font-normal uppercase">{row.role || 'SYSTEM'}</span>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
          {row.action}
        </span>
      )
    },
    {
      key: 'module',
      label: 'Module',
      render: (row) => (
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">
          {row.module}
        </span>
      )
    },
    {
      key: 'details',
      label: 'Activity Details',
      render: (row) => (
        <span className="text-xs text-slate-600 font-normal leading-relaxed">
          {row.details || '—'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600 stroke-[2]" />
            <span>Platform Security Audit Logs</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Immutable tracking of all plan changes, suspensions, activations, impersonations and financial events.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action or module..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 stroke-[2]" /> Module:
          </span>
          {['ALL', 'AUTH', 'ORGANIZATIONS', 'USERS', 'PLANS', 'SUBSCRIPTIONS', 'PAYMENTS', 'SETTINGS'].map((m) => (
            <button
              key={m}
              onClick={() => setModuleFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                moduleFilter === m
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="No audit logs recorded"
        pagination={pagination}
        onPageChange={(p) => fetchLogs(p)}
      />
    </div>
  );
}
