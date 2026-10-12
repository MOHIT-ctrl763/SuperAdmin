import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PermissionGuard } from '../../components/auth/PermissionGuard';

export function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const toast = useToast();

  const fetchPayments = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/payments', {
        page,
        limit: 10,
        search,
        status: statusFilter
      });
      if (res.success && res.data) {
        setPayments(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load payments: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [search, statusFilter]);

  const handleRefund = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/payments/${selectedPayment.id}/refund`, {
        reason: refundReason
      });
      if (res.success) {
        toast.success('Payment marked as refunded.');
        setRefundModalOpen(false);
        setSelectedPayment(null);
        setRefundReason('');
        fetchPayments(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Refund processing failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'transaction_id',
      label: 'Transaction ID',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {row.transaction_id || row.payment_id || `PAY-${row.id}`}
        </span>
      )
    },
    {
      key: 'organization_name',
      label: 'Organization',
      render: (row) => (
        <div className="flex flex-col">
          <Link
            to={`/super-admin/organizations/${row.organization_id}`}
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
          >
            {row.organization_name || `Org #${row.organization_id}`}
          </Link>
          <span className="text-xs font-normal text-slate-500">{row.email || 'billing@org.com'}</span>
        </div>
      )
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          {row.plan_name || 'Pro Tier'}
        </span>
      )
    },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (row) => (
        <span className="font-semibold text-slate-900">
          ₹{Number(row.total_amount ?? row.amount ?? 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'gateway',
      label: 'Gateway / Mode',
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium uppercase tracking-wider">
          {row.gateway || row.method || 'GATEWAY'} ({row.payment_method || row.method || 'ONLINE'})
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (row) => (
        <span className="text-xs text-slate-500 font-normal">
          {new Date(row.created_at || Date.now()).toLocaleString()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedPayment(row);
              setDetailsModalOpen(true);
            }}
            title="View Details"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {row.status === 'SUCCESS' && (
            <PermissionGuard permission="payments.refund">
              <button
                onClick={() => {
                  setSelectedPayment(row);
                  setRefundModalOpen(true);
                }}
                title="Issue Refund"
                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </PermissionGuard>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-purple-600 stroke-[2]" />
            <span>SaaS Payments Ledger</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Real-time transaction logs, gateways, automated webhooks, and billing reconciliation.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute inset-y-0 left-0 pl-3.5 my-auto w-4 h-4 text-slate-400 stroke-[2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID or company..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 stroke-[2]" /> Status:
          </span>
          {['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        emptyMessage="No payment records found"
        pagination={pagination}
        onPageChange={(p) => fetchPayments(p)}
      />

      {/* PAYMENT DETAILS MODAL */}
      {selectedPayment && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title="Payment Transaction Details"
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-500">Transaction ID</span>
              <span className="font-mono font-medium text-slate-800">{selectedPayment.transaction_id || selectedPayment.payment_id || `PAY-${selectedPayment.id}`}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-500">Organization</span>
              <span className="font-semibold text-slate-900">{selectedPayment.organization_name || `Org #${selectedPayment.organization_id}`}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-500">Subtotal Amount</span>
              <span className="font-medium text-slate-800">₹{Number(selectedPayment.amount ?? selectedPayment.total_amount ?? 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-500">GST / Tax (18%)</span>
              <span className="font-medium text-slate-800">₹{Number(selectedPayment.tax_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-semibold text-slate-700">Total Charged</span>
              <span className="font-semibold text-emerald-600 text-sm">₹{Number(selectedPayment.total_amount ?? selectedPayment.amount ?? 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-500">Gateway / Mode</span>
              <span className="font-medium text-slate-800">{selectedPayment.gateway || selectedPayment.method || 'GATEWAY'} ({selectedPayment.payment_method || selectedPayment.method || 'ONLINE'})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-500">Status</span>
              <Badge variant={selectedPayment.status}>{selectedPayment.status}</Badge>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="font-medium text-slate-500">Timestamp</span>
              <span className="font-normal text-slate-600">{new Date(selectedPayment.created_at || Date.now()).toLocaleString()}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* REFUND MODAL */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="Refund Payment"
        subtitle={`Process refund for Transaction ${selectedPayment?.transaction_id || selectedPayment?.payment_id || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRefund} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Refund Reason *</label>
            <textarea
              rows={2}
              required
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Accidental charge or customer refund request."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRefundModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !refundReason.trim()}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium shadow-md shadow-rose-500/20 disabled:opacity-50"
            >
              Confirm Refund
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
