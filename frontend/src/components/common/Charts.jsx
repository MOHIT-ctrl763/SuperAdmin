import React from 'react';

/**
 * Smooth SVG Area Chart with Light Clean Grid Lines (Matches Screenshot)
 */
export function AreaChart({ data = [], height = 220, color = '#2563eb' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-slate-400">
        No trend data available
      </div>
    );
  }

  const values = data.map((d) => parseFloat(d.revenue || d.value || 0));
  const max = Math.max(...values, 100);
  const min = 0;
  const range = max - min || 1;

  const width = 600;
  const paddingX = 24;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const coords = values.map((val, idx) => {
    const x = paddingX + (idx / Math.max(1, values.length - 1)) * chartWidth;
    const y = height - paddingY - ((val - min) / range) * chartHeight;
    return { x, y };
  });

  // Generate smooth cubic bezier curve path
  const curveD = coords.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, '');

  const areaD = `${curveD} L ${paddingX + chartWidth},${height - paddingY} L ${paddingX},${height - paddingY} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = height - paddingY - pct * chartHeight;
          return (
            <line
              key={i}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGradientLight)" />

        {/* Smooth line stroke */}
        <path d={curveD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Active Tooltip Indicator on peak */}
        {coords.length > 1 && (
          <g transform={`translate(${coords[Math.floor(coords.length / 2)].x}, ${coords[Math.floor(coords.length / 2)].y})`}>
            <circle r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" className="shadow-md" />
          </g>
        )}
      </svg>

      {/* X Axis Labels */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-2 mt-2">
        {data.slice(0, 5).map((d, i) => (
          <span key={i}>{d.label || `0${i + 1}`}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Bar Chart for Onboarding Trend
 */
export function BarChart({ data = [], height = 180, color = '#10b981' }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-6 text-xs text-slate-400">No data available</div>;
  }

  const values = data.map((d) => parseInt(d.count || d.value || 0, 10));
  const max = Math.max(...values, 5);

  return (
    <div className="w-full flex flex-col justify-end" style={{ height }}>
      <div className="flex items-end justify-between gap-2.5 h-full pt-4">
        {data.map((d, i) => {
          const val = parseInt(d.count || d.value || 0, 10);
          const heightPct = Math.max(10, Math.round((val / max) * 100));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
              <span className="text-[10px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {val}
              </span>
              <div
                style={{ height: `${heightPct}%`, backgroundColor: color }}
                className="w-full max-w-[32px] rounded-t-lg transition-all duration-300 shadow-sm opacity-90 group-hover:opacity-100"
              />
              <span className="text-[10px] font-medium text-slate-400 truncate w-full text-center">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Donut Chart with Centered Stat & Vibrant Slices (Matches Screenshot)
 */
export function DonutChart({
  data = [],
  colors = ['#0ea5e9', '#f97316', '#22c55e', '#d946ef', '#6366f1']
}) {
  if (!data || data.length === 0) {
    return <div className="text-center py-6 text-xs text-slate-400">No segment data</div>;
  }

  const total = data.reduce((acc, d) => acc + (parseInt(d.count, 10) || parseFloat(d.revenue, 10) || 0), 0);
  let accumulated = 0;

  const segments = data.map((d, i) => {
    const val = parseInt(d.count, 10) || parseFloat(d.revenue, 10) || 0;
    const pct = total > 0 ? (val / total) * 100 : 0;
    const offset = accumulated;
    accumulated += pct;
    return {
      label: d.plan_name || d.name || d.label,
      value: val,
      percent: Math.round(pct),
      color: colors[i % colors.length],
      offset,
      length: pct
    };
  });

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full">
      {/* Centered Donut with 100% or Total */}
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4" />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke={seg.color}
              strokeWidth="4"
              strokeDasharray={`${seg.length} ${100 - seg.length}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-extrabold text-slate-800 tracking-tight">100%</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Distribution</span>
        </div>
      </div>

      {/* Legend Pills like the image */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
