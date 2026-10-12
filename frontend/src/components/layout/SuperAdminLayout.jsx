import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, ExternalLink } from 'lucide-react';

export function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sa_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sa_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col antialiased">
      {/* Dark Modern Collapsible Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main App Container with dynamic smooth margin/padding transition */}
      <div
        className={`flex flex-col flex-1 min-h-screen transition-[padding] duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Navbar */}
        <Navbar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onToggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
        />

        {/* Impersonation Banner if active */}
        {user?.isImpersonated && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800 shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You are currently impersonating <strong className="text-amber-950 font-bold">{user.name}</strong> for organization <strong className="text-amber-950 font-bold">{user.organizationName || 'Tenant'}</strong>.
              </span>
            </div>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-900 underline ml-4"
            >
              Open Impersonated CRM <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Dynamic Page Content on soft canvas (with pb-24 on small screens to accommodate floating glass nav) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Instagram-style Glass Bottom Navigation for Mobile / Small Screens */}
      <BottomNav />
    </div>
  );
}
