import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Layers
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const BOTTOM_NAV_ITEMS = [
  {
    path: '/super-admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view'
  },
  {
    path: '/super-admin/organizations',
    label: 'Organizations',
    icon: Building2,
    permission: 'organizations.view'
  },
  {
    path: '/super-admin/users',
    label: 'Users',
    icon: Users,
    permission: 'users.view'
  },
  {
    path: '/super-admin/plans',
    label: 'Plans',
    icon: Layers,
    permission: 'plans.view'
  }
];

export function BottomNav() {
  const { hasPermission } = useAuth();
  const visibleItems = BOTTOM_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 lg:hidden px-3 pointer-events-none flex justify-center">
      <nav
        aria-label="Mobile Bottom Navigation"
        className="pointer-events-auto w-full max-w-md bg-white/75 border border-white/60 shadow-[0_12px_40px_-5px_rgba(15,23,42,0.16)] rounded-2xl px-2 py-1.5 flex items-center justify-around ring-1 ring-slate-900/5 transition-all"
        style={{
          backdropFilter: 'blur(20px) saturate(190%)',
          WebkitBackdropFilter: 'blur(20px) saturate(190%)'
        }}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 relative group
                ${isActive
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/35 scale-105 -translate-y-0.5'
                        : 'text-slate-600 group-hover:text-slate-900 group-hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.3]" />
                  </div>
                  <span
                    className={`text-[10px] tracking-tight mt-1 transition-all ${
                      isActive ? 'font-semibold text-blue-600' : 'font-medium text-slate-500'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5 animate-pulse" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
