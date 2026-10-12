import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export function ProtectedRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase">Verifying Super Admin Authorization...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
  }

  // Authorize any internal Super Admin staff user (Super Admin, Finance Admin, Support Admin, etc., or custom internal roles)
  const normalizedRole = String(user?.role || user?.role_name || user?.roleName || '')
    .trim()
    .toLowerCase()
    .replace(/[-_ ]/g, '');

  const isInternalStaff =
    user?.isSuperAdmin === true ||
    normalizedRole === 'superadmin' ||
    user?.roleId === 1 ||
    user?.role_id === 1 ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'super_admin' ||
    user?.organization_id === null ||
    (Array.isArray(user?.roles) && user.roles.length > 0) ||
    normalizedRole.includes('admin');

  if (!isInternalStaff) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
          <ShieldAlert className="w-12 h-12 mx-auto" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Access Denied</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md">
          This portal is strictly reserved for SaaS Platform Super Administrators. Your current role does not have authorization to view this resource.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('saas_super_admin_token');
            localStorage.removeItem('saas_super_admin_user');
            window.location.href = '/super-admin/login';
          }}
          className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return children;
}
