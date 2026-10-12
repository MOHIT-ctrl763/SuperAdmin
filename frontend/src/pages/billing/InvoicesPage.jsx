import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { FileText, Search, Filter, Eye, Printer, Building2, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const toast = useToast();

  const fetchInvoices = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/invoices', {
        page,
        limit: 10,
        search,
        status: statusFilter
      });
      if (res.success && res.data) {
        setInvoices(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load invoices: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
  }, [search, statusFilter]);

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-blue-600">
          {row.invoice_number}
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
            {row.organization_name}
          </Link>
          <span className="text-xs font-normal text-slate-500">{row.billing_email || row.organization_email}</span>
        </div>
      )
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {row.plan_name || 'Pro Plan'}
        </span>
      )
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      render: (row) => <span className="font-medium text-slate-600">₹{Number(row.subtotal ?? row.amount ?? 0).toLocaleString('en-IN')}</span>
    },
    {
      key: 'tax',
      label: 'GST / Tax',
      render: (row) => <span className="font-medium text-slate-600">₹{Number(row.tax ?? 0).toLocaleString('en-IN')}</span>
    },
    {
      key: 'total',
      label: 'Total',
      render: (row) => (
        <span className="font-semibold text-slate-900">
          ₹{Number(row.total ?? row.amount ?? 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>
    },
    {
      key: 'invoice_date',
      label: 'Date',
      render: (row) => (
        <span className="text-xs font-normal text-slate-500">
          {new Date(row.invoice_date || row.created_at || Date.now()).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedInvoice(row);
            setInvoiceModalOpen(true);
          }}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="View Invoice"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>Invoices & Billing Statements</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Official tax invoices generated for all subscription purchases and renewals.
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
            placeholder="Search by invoice number or organization..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-normal text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 stroke-[2]" /> Status:
          </span>
          {['ALL', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'].map((st) => (
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
        data={invoices}
        isLoading={isLoading}
        emptyMessage="No invoices found matching current criteria"
        pagination={pagination}
        onPageChange={(p) => fetchInvoices(p)}
      />

      {/* INVOICE VIEW / PRINT MODAL */}
      {selectedInvoice && (
        <Modal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title={`Tax Invoice: ${selectedInvoice.invoice_number}`}
          maxWidth="max-w-2xl"
        >
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-slate-800 text-xs space-y-6">
            {/* Invoice Top Header */}
            <div className="flex justify-between items-start pb-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">OrderFlow Technologies Inc.</h2>
                <p className="text-slate-500 font-normal mt-0.5">SaaS CRM & Fulfillment Cloud Platform</p>
                <p className="text-slate-400 font-normal mt-1">GSTIN: 27AABCT1234F1Z8 • support@orderflow.io</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold text-blue-600 block">{selectedInvoice.invoice_number}</span>
                <span className="text-slate-500 font-normal block mt-0.5">Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span>
                <div className="mt-2">
                  <Badge variant={selectedInvoice.status}>{selectedInvoice.status}</Badge>
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="grid grid-cols-2 gap-4 pb-5 border-b border-slate-200">
              <div>
                <span className="font-semibold text-slate-400 uppercase tracking-wider block text-[10px] mb-1">Billed To (Customer Organization)</span>
                <p className="font-semibold text-slate-900 text-sm">{selectedInvoice.billing_name || selectedInvoice.organization_name}</p>
                <p className="text-slate-500 font-normal mt-0.5">{selectedInvoice.billing_email || selectedInvoice.organization_email}</p>
                <p className="text-slate-500 font-normal mt-0.5">{selectedInvoice.billing_address || 'India'}</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block text-[10px] mb-1">Billing Period</span>
                <p className="text-slate-600 font-medium">
                  {selectedInvoice.billing_period_start ? new Date(selectedInvoice.billing_period_start).toLocaleDateString() : 'Current Period'} to{' '}
                  {selectedInvoice.billing_period_end ? new Date(selectedInvoice.billing_period_end).toLocaleDateString() : 'Renewal'}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Taxable Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3">
                    <p className="font-medium text-slate-900">{selectedInvoice.plan_name || 'Pro Plan'} Subscription</p>
                    <p className="text-slate-500 font-normal text-[11px]">SaaS multi-tenant access, unlimited CRM deals, storage and operations module.</p>
                  </td>
                  <td className="py-3 text-right font-medium text-slate-900">₹{Number(selectedInvoice.subtotal ?? selectedInvoice.amount ?? 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <div className="w-64 space-y-1.5 text-right">
                <div className="flex justify-between text-slate-500 font-normal">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-900">₹{Number(selectedInvoice.subtotal ?? selectedInvoice.amount ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-normal">
                  <span>CGST + SGST (18%):</span>
                  <span className="font-medium text-slate-900">₹{Number(selectedInvoice.tax || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Paid:</span>
                  <span className="text-emerald-600 font-semibold">₹{Number(selectedInvoice.total ?? selectedInvoice.amount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
