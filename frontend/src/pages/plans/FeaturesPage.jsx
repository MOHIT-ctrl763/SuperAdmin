import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Sliders, Plus, CheckCircle, XCircle, ShieldCheck, Layers, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FeaturesPage() {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const toast = useToast();

  const fetchFeatures = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/features');
      if (res.success && res.data) {
        setFeatures(res.data);
      }
    } catch (err) {
      toast.error('Failed to load features: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/features', form);
      if (res.success) {
        toast.success(`Feature '${res.data.name}' added.`);
        setCreateModalOpen(false);
        setForm({ name: '', key: '', description: '' });
        fetchFeatures();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add feature');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (feat) => {
    try {
      const res = await api.patch(`/features/${feat.id}/toggle-status`);
      if (res.success) {
        toast.success(`Feature ${res.data.isActive ? 'enabled' : 'disabled'}.`);
        fetchFeatures();
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/super-admin/plans" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-purple-600 stroke-[2]" />
            <span>Platform Feature Directory</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Define system capability gates that can be enabled or disabled per subscription tier.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2]" />
          <span>New Feature Key</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feat) => (
          <div
            key={feat.id}
            className="rounded-2xl p-5 border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-semibold text-slate-900 text-base">{feat.name}</span>
                <Badge variant={feat.is_active ? 'ACTIVE' : 'DEACTIVATED'}>
                  {feat.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>

              <div className="mt-3">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                  {feat.key}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-2.5 leading-relaxed">
                  {feat.description || 'Global capability flag evaluated in backend middleware.'}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">
                Active in {feat.enabled_in_plans_count || 0} plan(s)
              </span>

              <button
                onClick={() => handleToggle(feat)}
                className={`p-1.5 rounded-lg transition-colors ${feat.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                title={feat.is_active ? 'Disable globally' : 'Enable globally'}
              >
                {feat.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE FEATURE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register System Feature Key"
        subtitle="Feature keys are checked in middleware (checkFeature) to restrict access."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Feature Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. AI Sales Assistant"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Feature Key *</label>
            <input
              type="text"
              required
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="ai_assistant (snake_case)"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enables automated client follow-ups using language models."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              Register Feature
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
