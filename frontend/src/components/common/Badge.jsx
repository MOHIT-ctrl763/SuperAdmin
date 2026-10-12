import React from 'react';

export function Badge({ children, variant, size = 'sm', className = '' }) {
  const text = (typeof children === 'string' ? children : variant || '').toUpperCase();

  let styles = 'bg-slate-100 text-slate-800 border-slate-300';

  if (['ACTIVE', 'SUCCESS', 'PAID', 'APPROVED', 'OPEN'].includes(text)) {
    styles = 'bg-emerald-100 text-emerald-900 border-emerald-300';
  } else if (['TRIAL', 'PENDING', 'IN_PROGRESS', 'MEDIUM'].includes(text)) {
    styles = 'bg-sky-100 text-sky-900 border-sky-300';
  } else if (['SUSPENDED', 'FAILED', 'HIGH', 'URGENT', 'CRITICAL'].includes(text)) {
    styles = 'bg-rose-100 text-rose-900 border-rose-300';
  } else if (['EXPIRED', 'PAST_DUE', 'GRACE_PERIOD', 'WARNING', 'LOW'].includes(text)) {
    styles = 'bg-amber-100 text-amber-900 border-amber-300';
  } else if (['CANCELLED', 'CLOSED', 'REFUNDED', 'DEACTIVATED'].includes(text)) {
    styles = 'bg-slate-200 text-slate-800 border-slate-300';
  } else if (['PRO', 'ENTERPRISE', 'FEATURED'].includes(text)) {
    styles = 'bg-purple-100 text-purple-900 border-purple-300';
  } else if (['BASIC'].includes(text)) {
    styles = 'bg-blue-100 text-blue-900 border-blue-300';
  }

  const sizes = {
    xs: 'px-2 py-0.5 text-[11px] font-medium',
    sm: 'px-2.5 py-0.5 text-xs font-medium',
    md: 'px-3 py-1 text-sm font-medium'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-xs ${sizes[size] || sizes.sm} ${styles} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-90" />
      {children}
    </span>
  );
}
