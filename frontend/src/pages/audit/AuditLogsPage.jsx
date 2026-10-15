import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { crmApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { ShieldCheck, Search, Filter, ShieldAlert, Network, Activity, RefreshCw } from 'lucide-react';

export function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState('SECURITY'); // 'SECURITY' | 'CRM'
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // CRM Live Activity Stream state
  const [crmActivities, setCrmActivities] = useState([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');
  const [crmTypeFilter, setCrmTypeFilter] = useState('ALL');

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

  const fetchCrmActivities = async () => {
    setCrmLoading(true);
    try {
      const res = await crmApi.getActivities({ limit: 50 });
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.items || res.data.activities || []);
        setCrmActivities(list);
      }
    } catch (err) {
      console.error('Failed to load CRM activities', err);
    } finally {
      setCrmLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [search, moduleFilter]);

  useEffect(() => {
    if (activeTab === 'CRM' && crmActivities.length === 0) {
      fetchCrmActivities();
    }
  }, [activeTab]);

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

  const filteredCrmActivities = crmActivities.filter((act) => {
    const q = crmSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      (act.remarks && act.remarks.toLowerCase().includes(q)) ||
      (act.user_name && act.user_name.toLowerCase().includes(q)) ||
      (act.lead_name && act.lead_name.toLowerCase().includes(q)) ||
      (act.type && act.type.toLowerCase().includes(q));

    const matchesType = crmTypeFilter === 'ALL' ||
      (act.type && act.type.toUpperCase() === crmTypeFilter.toUpperCase());

    return matchesSearch && matchesType;
  });

  const crmColumns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono font-normal">
          {row.created_at ? new Date(row.created_at).toLocaleString() : 'Just now'}
        </span>
      )
    },
    {
      key: 'type',
      label: 'Activity Type',
      render: (row) => {
        const typeStr = (row.type || 'EVENT').toUpperCase();
        const color = typeStr.includes('CALL')
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : typeStr.includes('NOTE')
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : typeStr.includes('STAGE') || typeStr.includes('STATUS')
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200';
        return (
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${color}`}>
            {typeStr}
          </span>
        );
      }
    },
    {
      key: 'user_name',
      label: 'CRM Agent',
      render: (row) => (
        <span className="font-semibold text-slate-900 text-xs">
          {row.user_name || row.created_by_name || 'CRM Agent'}
        </span>
      )
    },
    {
      key: 'lead_name',
      label: 'Associated Customer / Lead',
      render: (row) => (
        <span className="text-xs font-medium text-slate-800">
          {row.lead_name || row.client_name || '—'}
        </span>
      )
    },
    {
      key: 'remarks',
      label: 'Event Details & Remarks',
      render: (row) => (
        <span className="text-xs text-slate-600 font-normal leading-relaxed">
          {row.remarks || row.description || row.notes || '—'}
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
            <span>Audit & Operational Activity Logs</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Immutable tracking of SaaS platform administrative changes alongside real-time NexFlow CRM agent activities.
          </p>
        </div>

        {activeTab === 'CRM' && (
          <button
            onClick={fetchCrmActivities}
            disabled={crmLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${crmLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Sync Live Feed</span>
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'SECURITY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Platform Security Audit Logs</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'SECURITY' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
            {pagination.total || logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CRM')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'CRM'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-4 h-4 text-indigo-600" />
          <span>CRM Live Activity Stream</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'CRM' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            {crmActivities.length || '184+'}
          </span>
        </button>
      </div>

      {activeTab === 'SECURITY' ? (
        <>
          {/* Filter and Search Bar for SaaS Security */}
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
        </>
      ) : (
        <>
          {/* Filter and Search Bar for CRM Activities */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
              <input
                type="text"
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                placeholder="Search by agent, lead name or remarks..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 stroke-[2]" /> Event:
              </span>
              {['ALL', 'CALL', 'NOTE', 'STATUS_CHANGE', 'STAGE_CHANGE', 'WHATSAPP'].map((t) => (
                <button
                  key={t}
                  onClick={() => setCrmTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    crmTypeFilter === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            columns={crmColumns}
            data={filteredCrmActivities}
            isLoading={crmLoading}
            emptyMessage="No live CRM activities found matching criteria"
          />
        </>
      )}
    </div>
  );
}
