import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

/**
 * PermissionGuard
 * 
 * Conditionally renders content based on whether the current user
 * has the required RBAC permission(s).
 * 
 * Props:
 * - permission: string (e.g. 'organizations.create')
 * - permissions: string[] (array of permission codes)
 * - requireAll: boolean (default false, meaning any permission matches)
 * - pageGuard: boolean (if true and denied, renders full-page Access Denied UI)
 * - fallback: ReactNode (rendered when permission is missing and pageGuard is false)
 * - children: ReactNode
 */
export function PermissionGuard({
  permission,
  permissions = [],
  requireAll = false,
  pageGuard = false,
  fallback = null,
  children
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin, user } = useAuth();

  // If no permission specified, allow
  if (!permission && (!permissions || permissions.length === 0)) {
    return <>{children}</>;
  }

  // Super Admin always passes
  if (user?.isSuperAdmin || isSuperAdmin) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (pageGuard) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
          Your assigned role does not grant permission to view this module.
          {permission && (
            <span className="block mt-1 font-mono text-xs text-rose-300/80 bg-rose-950/40 py-1 px-2.5 rounded-lg border border-rose-800/40 w-fit mx-auto">
              Missing: {permission}
            </span>
          )}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/super-admin/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return fallback ? <>{fallback}</> : null;
}

export default PermissionGuard;
