import React from 'react';
import { ArrowUpRight, ArrowDownRight, MoreVertical } from 'lucide-react';

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  featured = false,
  color = 'brand',
  className = ''
}) {
  const iconBgs = {
    brand: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    purple: 'bg-purple-100 text-purple-700',
    rose: 'bg-rose-100 text-rose-700'
  };

  if (featured) {
    return (
      <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 text-white shadow-lg shadow-blue-500/25 flex flex-col justify-between ${className}`}>
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-white/25 text-white flex items-center justify-center backdrop-blur-sm shadow-sm">
                <Icon className="w-5 h-5 stroke-[2.5]" />
              </div>
            )}
            <span className="text-sm font-medium text-white/90">{title}</span>
          </div>
          <button className="text-white/80 hover:text-white p-1">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Numbers & Badge */}
        <div className="mt-5 flex items-baseline justify-between gap-2">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{value}</span>
          {trend && (
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm shadow-sm">
              {trendPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 stroke-[2]" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 stroke-[2]" />}
              {trend}
            </span>
          )}
        </div>

        {subtitle && <p className="mt-2 text-xs font-normal text-white/80 truncate">{subtitle}</p>}
      </div>
    );
  }

  // Standard Clean White Card with Realistic Modern SaaS Styling
  return (
    <div className={`rounded-2xl p-5 bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${iconBgs[color] || iconBgs.brand}`}>
              <Icon className="w-5 h-5 stroke-[2]" />
            </div>
          )}
          <span className="text-sm font-medium text-slate-600">{title}</span>
        </div>
        <button className="text-slate-400 hover:text-slate-700 p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Value & Trend */}
      <div className="mt-5 flex items-baseline justify-between gap-2">
        <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{value}</span>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${
              trendPositive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {trendPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 stroke-[2]" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 stroke-[2]" />}
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs font-normal text-slate-500 truncate">{subtitle}</p>}
    </div>
  );
}
