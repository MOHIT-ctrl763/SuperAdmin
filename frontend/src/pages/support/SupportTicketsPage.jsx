import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LifeBuoy, MessageSquare, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Thread Modal State
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [actionLoading, setActionLoading] = useState(false);

  const toast = useToast();

  const fetchTickets = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get('/support', {
        page,
        limit: 10,
        status: statusFilter
      });
      if (res.success && res.data) {
        setTickets(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load tickets: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
  }, [statusFilter]);

  const openThread = async (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setThreadModalOpen(true);
    try {
      const res = await api.get(`/support/${ticket.id}`);
      if (res.success && res.data) {
        setThreadMessages(res.data.messages || []);
      }
    } catch (err) {
      toast.error('Failed to load message thread');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/support/${selectedTicket.id}/reply`, {
        message: replyMessage,
        status: newStatus
      });
      if (res.success) {
        toast.success('Reply submitted.');
        setReplyMessage('');
        // Refresh thread
        const updatedRes = await api.get(`/support/${selectedTicket.id}`);
        if (updatedRes.success) {
          setThreadMessages(updatedRes.data.messages || []);
        }
        fetchTickets(pagination.page);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit reply');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'ticket_number',
      label: 'Ticket #',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {row.ticket_number}
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
          <span className="text-xs font-normal text-slate-500">{row.user_name || 'Organization Member'}</span>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (row) => (
        <span className="font-medium text-slate-800 line-clamp-1">
          {row.subject}
        </span>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <Badge variant={row.priority}>{row.priority}</Badge>
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>
    },
    {
      key: 'created_at',
      label: 'Opened',
      render: (row) => (
        <span className="text-xs font-normal text-slate-500">
          {new Date(row.created_at).toLocaleDateString()}
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
          onClick={() => openThread(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all shadow-sm"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Reply</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="w-7 h-7 text-sky-600 stroke-[2]" />
            <span>Customer Support Tickets</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Provide direct customer assistance, SLA responses, and escalation resolution.
          </p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Filter:</span>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
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

      <DataTable
        columns={columns}
        data={tickets}
        isLoading={isLoading}
        emptyMessage="No customer support tickets found"
        pagination={pagination}
        onPageChange={(p) => fetchTickets(p)}
      />

      {/* THREAD MODAL */}
      {selectedTicket && (
        <Modal
          isOpen={threadModalOpen}
          onClose={() => setThreadModalOpen(false)}
          title={`Ticket: ${selectedTicket.ticket_number}`}
          subtitle={`${selectedTicket.organization_name} • ${selectedTicket.subject}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Initial description */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Original Ticket Issue</span>
              <p className="text-xs font-normal text-slate-700 mt-1 leading-relaxed">{selectedTicket.description}</p>
            </div>

            {/* Message Thread */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {threadMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border text-xs max-w-[85%] ${
                    msg.sender_type === 'SUPER_ADMIN'
                      ? 'ml-auto bg-blue-50 border-blue-200 text-blue-950 font-normal'
                      : 'bg-slate-100 border-slate-200 text-slate-900 font-normal'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500 font-normal">
                    <span className="font-semibold text-slate-900">{msg.sender_type === 'SUPER_ADMIN' ? '🛡️ Super Admin Support' : msg.sender_name || 'Customer'}</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="leading-relaxed">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleReply} className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-700">Update Status:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <textarea
                  rows={3}
                  required
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type official response to customer organization..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Response</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
