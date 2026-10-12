import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import {
  Key,
  Search,
  Filter,
  Shield,
  Layers,
  Lock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Sliders,
  Gauge,
  Receipt,
  FileText,
  Tag,
  Clock,
  Bell,
  LifeBuoy,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MODULE_ICONS = {
  dashboard: Layers,
  organizations: Building2,
  users: Users,
  plans: Layers,
  subscriptions: CreditCard,
  payments: Receipt,
  invoices: FileText,
  coupons: Tag,
  trials: Clock,
  features: Sliders,
  usage: Gauge,
  notifications: Bell,
  support: LifeBuoy,
  auditLogs: ShieldCheck,
  settings: Settings,
  roles: Shield,
  permissions: Key
};

export function PermissionsListPage() {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');

  const toast = useToast();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [permsRes, rolesRes] = await Promise.all([
          api.get('/permissions'),
          api.get('/roles')
        ]);

        if (permsRes.success && permsRes.data) {
          setPermissions(permsRes.data);
        }
        if (rolesRes.success && rolesRes.data) {
          setRoles(rolesRes.data);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to fetch permissions catalog');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Unique list of modules
  const modulesList = useMemo(() => {
    const set = new Set();
    permissions.forEach((p) => {
      if (p.module) set.add(p.module);
    });
    return Array.from(set).sort();
  }, [permissions]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchSearch =
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.action || '').toLowerCase().includes(search.toLowerCase());

      const matchModule = selectedModule === 'ALL' || p.module === selectedModule;

      return matchSearch && matchModule;
    });
  }, [permissions, search, selectedModule]);

  // Group filtered permissions by module
  const groupedPermissions = useMemo(() => {
    const groups = {};
    filteredPermissions.forEach((p) => {
      const mod = p.module || 'other';
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    });
    return groups;
  }, [filteredPermissions]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">System Permissions</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              {permissions.length} Granular Actions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Complete catalog of immutable security capabilities grouped across all 17 system modules.
          </p>
        </div>

        <Link
          to="/super-admin/roles"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-sm transition-all"
        >
          <Shield className="w-4 h-4 stroke-[2]" />
          Configure Roles
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">Total Granular Permissions</p>
            <p className="text-base font-semibold text-slate-900">{permissions.length} Defined</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">Core Functional Modules</p>
            <p className="text-base font-semibold text-slate-900">{modulesList.length} Protected Modules</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">Security Guard Status</p>
            <p className="text-base font-semibold text-emerald-600">Active Enforcement</p>
          </div>
        </div>
      </div>

      {/* Search & Module Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions by name, code or action..."
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 capitalize"
          >
            <option value="ALL">All Modules ({permissions.length})</option>
            {modulesList.map((m) => {
              const count = permissions.filter((p) => p.module === m).length;
              return (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Permissions Grouped Display */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-bold bg-white rounded-2xl border border-slate-200">
          Loading permissions schema...
        </div>
      ) : Object.keys(groupedPermissions).length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 text-xs font-bold">
          No permissions matched your query.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
            const ModIcon = MODULE_ICONS[moduleName] || Layers;

            return (
              <div
                key={moduleName}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Module Header */}
                <div className="px-5 py-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                      <ModIcon className="w-4 h-4 stroke-[2.3]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        {moduleName} Module
                      </h3>
                      <p className="text-[11px] text-slate-400 font-semibold">
                        {perms.length} granular action{perms.length > 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-200 text-slate-800">
                    {moduleName}.*
                  </span>
                </div>

                {/* Permissions Grid */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((p) => (
                    <div
                      key={p.code}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-extrabold text-slate-900 line-clamp-1">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded">
                            {p.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {p.description || `Grants capability to execute ${p.action} on ${p.module}.`}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <code className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {p.code}
                        </code>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          Protected
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PermissionsListPage;
