import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export function DataTable({
  columns,
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  pagination,
  onPageChange,
  className = ''
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th key={col.key || idx} className={`px-5 py-3.5 ${col.className || ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((c, ci) => (
                    <td key={ci} className="px-5 py-3.5">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Inbox className="w-10 h-10 mb-2 stroke-[1.5] text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows with Realistic Clean Text
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-slate-50/80 transition-colors duration-150"
                >
                  {columns.map((col, colIndex) => (
                    <td key={col.key || colIndex} className={`px-5 py-3.5 text-slate-700 font-normal ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row, rowIndex) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-normal">
          <div>
            Showing <span className="font-semibold text-slate-800">{data.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{pagination.total}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2]" />
            </button>
            <span className="px-3 py-1 rounded-md bg-white text-slate-800 font-medium text-xs border border-slate-300 shadow-sm">
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <button
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
