import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  ExternalLink,
  ShieldCheck,
  LogOut,
  Search,
  X,
  Building2,
  Users,
  Layers,
  ArrowRight,
  Loader2,
  FileText,
  CreditCard,
  HardDrive,
  Settings,
  HelpCircle,
  ShieldAlert,
  Tag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../common/Badge';

const QUICK_PAGES = [
  { title: 'Dashboard', path: '/super-admin/dashboard', keywords: 'dashboard home analytics metrics overview', icon: Layers },
  { title: 'Organizations', path: '/super-admin/organizations', keywords: 'organizations tenants companies accounts clients', icon: Building2 },
  { title: 'Users Directory', path: '/super-admin/users', keywords: 'users team members staff people admins', icon: Users },
  { title: 'Subscription Plans', path: '/super-admin/plans', keywords: 'plans tiers pricing packages catalog', icon: Layers },
  { title: 'Active Subscriptions', path: '/super-admin/subscriptions', keywords: 'subscriptions recurring billing memberships cycles', icon: CreditCard },
  { title: 'Features & Entitlements', path: '/super-admin/features', keywords: 'features gates flags capabilities permissions', icon: ShieldCheck },
  { title: 'Billing Invoices', path: '/super-admin/invoices', keywords: 'invoices receipts billing statements paid unpaid', icon: FileText },
  { title: 'Payments & Transactions', path: '/super-admin/payments', keywords: 'payments transactions razorpay gateway stripe money', icon: CreditCard },
  { title: 'Usage Limits & Quotas', path: '/super-admin/usage', keywords: 'usage limits quotas bandwidth storage api calls', icon: HardDrive },
  { title: 'Discount Coupons', path: '/super-admin/coupons', keywords: 'coupons vouchers discounts promotions codes', icon: Tag },
  { title: 'Support Helpdesk', path: '/super-admin/support', keywords: 'support tickets help desk issues customer tickets', icon: HelpCircle },
  { title: 'Audit Logs', path: '/super-admin/audit-logs', keywords: 'audit logs activity history events compliance security', icon: ShieldAlert },
  { title: 'System Settings', path: '/super-admin/settings', keywords: 'settings system config email security preferences', icon: Settings }
];

export function Navbar({ onMenuToggle, onToggleCollapse, isCollapsed }) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Notifications state
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ organizations: [], users: [], plans: [] });
  const [filteredPages, setFilteredPages] = useState([]);
  const searchContainerRef = useRef(null);

  // Poll notifications
  useEffect(() => {
    if (!hasPermission('notifications.view')) return;

    async function fetchNotifs() {
      try {
        const res = await api.get('/notifications');
        if (res.success && res.data) {
          setUnreadCount(res.data.unreadCount || 0);
          setNotifications(res.data.items?.slice(0, 5) || []);
        }
      } catch (err) {
        // silent fail
      }
    }

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000);
    return () => clearInterval(interval);
  }, [hasPermission]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Search Input & Debounce Query
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults({ organizations: [], users: [], plans: [] });
      setFilteredPages([]);
      setIsSearching(false);
      return;
    }

    // Filter Quick Navigation Pages instantly
    const pages = QUICK_PAGES.filter(
      p => p.title.toLowerCase().includes(q) || p.keywords.toLowerCase().includes(q)
    ).slice(0, 4);
    setFilteredPages(pages);

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/search', { q });
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        // fallback search using organizations endpoint
        try {
          const orgRes = await api.get('/organizations', { search: q, limit: 5 });
          if (orgRes.success && orgRes.data?.items) {
            setSearchResults({ organizations: orgRes.data.items, users: [], plans: [] });
          }
        } catch (e) {
          // ignore
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Submit on Enter
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // 1. If single organization found, go directly to it
    if (searchResults.organizations.length === 1) {
      navigate(`/super-admin/organizations/${searchResults.organizations[0].id}`);
      handleCloseSearch();
      return;
    }

    // 2. If quick page matches, go to it
    if (filteredPages.length > 0) {
      navigate(filteredPages[0].path);
      handleCloseSearch();
      return;
    }

    // 3. Otherwise navigate to organizations directory with filter
    navigate(`/super-admin/organizations?search=${encodeURIComponent(q)}`);
    handleCloseSearch();
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const hasAnyResults =
    filteredPages.length > 0 ||
    searchResults.organizations.length > 0 ||
    searchResults.users.length > 0 ||
    searchResults.plans.length > 0;

  return (
    <header className="h-16 px-4 sm:px-8 sticky top-0 z-30 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
      {/* Left: Mobile Menu & Desktop Collapse Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile toggle */}
        <button
          onClick={onMenuToggle}
          title="Toggle Navigation Menu"
          className="p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Welcome back, <span className="text-blue-600 font-semibold">{user?.name || 'Administrator'}</span>
          </span>
        </div>
      </div>

      {/* Center: Interactive Global Search Bar */}
      <div className="flex-1 flex justify-center max-w-xl mx-2 sm:mx-6">
        <div ref={searchContainerRef} className="relative w-full max-w-md">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 rounded-xl px-3.5 py-1.5 shadow-xs text-xs gap-2.5 w-full focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
            ) : (
              <Search className="w-3.5 h-3.5 text-slate-400 stroke-[2] shrink-0" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearchOpen(true);
              }}
              placeholder="Search organizations, plans, users..."
              className="bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 font-medium text-xs w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {/* Search Results Dropdown Panel */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-full sm:w-[32rem] rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 z-50 animate-fade-in max-h-[28rem] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Search Results for "{searchQuery}"</span>
                <span className="text-[10px] text-slate-400 font-normal">Press Enter to Jump</span>
              </div>

              {/* 1. Quick Navigation Pages */}
              {filteredPages.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider px-2 block mb-1">
                    System Navigation
                  </span>
                  <div className="space-y-1">
                    {filteredPages.map((page, idx) => {
                      const IconComp = page.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            navigate(page.path);
                            handleCloseSearch();
                          }}
                          className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                              {page.title}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Organizations Results */}
              {searchResults.organizations.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider px-2 block mb-1">
                    Organizations ({searchResults.organizations.length})
                  </span>
                  <div className="space-y-1">
                    {searchResults.organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => {
                          navigate(`/super-admin/organizations/${org.id}`);
                          handleCloseSearch();
                        }}
                        className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/50 transition-colors text-xs group border border-transparent hover:border-purple-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-bold text-xs">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 group-hover:text-purple-700 truncate">
                              {org.name}
                            </p>
                            <p className="text-[10px] text-slate-600 truncate font-medium">
                              {org.slug} • {org.plan_name || 'Active'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={org.status} size="xs">{org.status}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Subscription Plans Results */}
              {searchResults.plans.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider px-2 block mb-1">
                    Subscription Plans ({searchResults.plans.length})
                  </span>
                  <div className="space-y-1">
                    {searchResults.plans.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          navigate('/super-admin/plans');
                          handleCloseSearch();
                        }}
                        className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/50 transition-colors text-xs group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-emerald-700">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-600 block">
                              ₹{p.price_monthly}/mo
                            </span>
                          </div>
                        </div>
                        <Badge variant={p.is_active ? 'ACTIVE' : 'INACTIVE'} size="xs">
                          {p.is_active ? 'Active' : 'Archived'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Users Results */}
              {searchResults.users.length > 0 && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider px-2 block mb-1">
                    Platform Users ({searchResults.users.length})
                  </span>
                  <div className="space-y-1">
                    {searchResults.users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          navigate('/super-admin/users');
                          handleCloseSearch();
                        }}
                        className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-600 truncate">{u.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-600 font-semibold">{u.role_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {!hasAnyResults && !isSearching && (
                <div className="py-6 text-center text-xs text-slate-500">
                  <p className="font-bold text-slate-700">No matching results found</p>
                  <p className="text-[11px] mt-1 text-slate-600">Try searching for an organization name, slug, plan or section.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Open Live Customer CRM Portal in new tab */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:text-blue-700 hover:border-blue-300 transition-all shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-600 stroke-[2.2]" />
          <span>Customer CRM</span>
        </a>

        {/* Notifications Dropdown */}
        {hasPermission('notifications.view') && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:border-slate-400 transition-colors shadow-sm"
            >
              <Bell className="w-4 h-4 stroke-[2.2]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Platform Alerts</span>
                  <Link
                    to="/super-admin/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    View All
                  </Link>
                </div>
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No recent notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <p className="font-semibold text-slate-800">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Avatar Chip */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] font-semibold text-blue-600 leading-tight">
              {user?.isSuperAdmin ? 'Super Admin' : (user?.organizationName || 'Company Admin')}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
