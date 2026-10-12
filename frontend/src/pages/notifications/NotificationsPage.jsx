import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Bell, Send, CheckCheck, ShieldAlert, Sparkles, Building2 } from 'lucide-react';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', organizationId: '' });
  const [organizations, setOrganizations] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const toast = useToast();

  const fetchNotifs = async () => {
    setIsLoading(true);
    try {
      const [res, orgsRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/organizations', { limit: 100 })
      ]);
      if (res.success && res.data) {
        setNotifications(res.data.items || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data.items || []);
      }
    } catch (err) {
      toast.error('Failed to load notifications: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-read', { all: true });
      toast.success('All notifications marked as read.');
      fetchNotifs();
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/notifications/broadcast', {
        title: form.title,
        message: form.message,
        organizationId: form.organizationId ? parseInt(form.organizationId, 10) : null
      });
      toast.success('Broadcast notification dispatched.');
      setBroadcastModalOpen(false);
      setForm({ title: '', message: '', organizationId: '' });
      fetchNotifs();
    } catch (err) {
      toast.error(err.message || 'Broadcast failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>Platform Alerts & Notifications</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            System announcements, renewal warnings, high usage alarms, and customer broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600 stroke-[2]" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => setBroadcastModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5 stroke-[2]" />
            <span>Broadcast Alert</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-2xl border shadow-sm transition-all flex items-start gap-3.5 ${
              !n.is_read
                ? 'bg-blue-50/60 border-blue-200'
                : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-900">{n.title}</h4>
                <span className="text-[11px] text-slate-500 font-normal">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs font-normal text-slate-600 mt-1 leading-relaxed">{n.message}</p>
              {n.organization_name && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 mt-2 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                  <Building2 className="w-3 h-3 text-slate-500" /> {n.organization_name}
                </span>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="p-12 text-center text-slate-500 font-normal rounded-2xl bg-white border border-slate-200">
            No system notifications recorded
          </div>
        )}
      </div>

      {/* BROADCAST MODAL */}
      <Modal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        title="Send Platform Broadcast Announcement"
        subtitle="Dispatches notifications to all client organizations or a targeted company."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Audience</label>
            <select
              value={form.organizationId}
              onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="">All Organizations (Platform-wide)</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Alert Headline *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Scheduled Infrastructure Maintenance"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Message Content *</label>
            <textarea
              rows={3}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Detailed notification announcement for users..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-normal text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              Send Broadcast
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
