import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Settings, Shield, CreditCard, Save, Globe, Lock } from 'lucide-react';

export function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [general, setGeneral] = useState({
    saasName: 'OrderFlow SaaS CRM & OMS Platform',
    supportEmail: 'support@orderflow.io',
    supportPhone: '+91 1800 200 4567',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    currencySymbol: '₹'
  });

  const [subscription, setSubscription] = useState({
    defaultTrialDays: 14,
    gracePeriodDays: 5,
    renewalReminderDays: '7, 3, 1',
    trialReminderDays: '3, 1',
    autoSuspendAfterGrace: true,
    allowDowngrade: true,
    allowCancellation: true
  });

  const [security, setSecurity] = useState({
    sessionTimeoutMinutes: 1440,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    requirePasswordSpecialChar: true
  });

  const toast = useToast();

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const res = await api.get('/settings');
        if (res.success && res.data) {
          if (res.data.general_settings) setGeneral(res.data.general_settings);
          if (res.data.subscription_settings) {
            const subData = res.data.subscription_settings;
            setSubscription(prev => ({
              ...prev,
              ...subData,
              renewalReminderDays: Array.isArray(subData.renewalReminderDays)
                ? subData.renewalReminderDays.join(', ')
                : (subData.renewalReminderDays || '7, 3, 1'),
              trialReminderDays: Array.isArray(subData.trialReminderDays)
                ? subData.trialReminderDays.join(', ')
                : (subData.trialReminderDays || '3, 1'),
              autoSuspendAfterGrace: subData.autoSuspendAfterGrace !== false
            }));
          }
          if (res.data.security_settings) setSecurity(res.data.security_settings);
        }
      } catch (err) {
        toast.error('Failed to load system settings: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings', {
        key: 'general_settings',
        value: general,
        category: 'GENERAL'
      });
      toast.success('General settings saved.');
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedRenewalDays = String(subscription.renewalReminderDays || '7, 3, 1')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n > 0);

      const parsedTrialDays = String(subscription.trialReminderDays || '3, 1')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n > 0);

      const payload = {
        ...subscription,
        defaultTrialDays: parseInt(subscription.defaultTrialDays, 10) || 14,
        gracePeriodDays: parseInt(subscription.gracePeriodDays, 10) || 5,
        renewalReminderDays: parsedRenewalDays.length ? parsedRenewalDays : [7, 3, 1],
        trialReminderDays: parsedTrialDays.length ? parsedTrialDays : [3, 1],
        autoSuspendAfterGrace: !!subscription.autoSuspendAfterGrace
      };

      await api.put('/settings', {
        key: 'subscription_settings',
        value: payload,
        category: 'SUBSCRIPTION'
      });
      toast.success('Subscription and automation policies saved.');
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings', {
        key: 'security_settings',
        value: security,
        category: 'SECURITY'
      });
      toast.success('Security settings saved.');
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const [isTestingRun, setIsTestingRun] = useState(false);
  const [lastRunResult, setLastRunResult] = useState(null);

  const handleRunAutomationCheck = async () => {
    setIsTestingRun(true);
    try {
      const res = await api.post('/subscriptions/automation/run-check', {});
      if (res.success) {
        setLastRunResult(res.data);
        toast.success('Subscription lifecycle check executed successfully.');
      }
    } catch (err) {
      toast.error('Automation check failed: ' + err.message);
    } finally {
      setIsTestingRun(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-blue-600 stroke-[2]" />
            <span>SaaS System Settings</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500">
            Configure global brand identity, billing grace period policies, and platform security rules.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4 stroke-[2]" />
          <span>General Platform</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'subscription'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4 stroke-[2]" />
          <span>Subscription & Billing</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4 stroke-[2]" />
          <span>Security & Policies</span>
        </button>
      </div>

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Platform SaaS Name</label>
              <input
                type="text"
                value={general.saasName}
                onChange={(e) => setGeneral({ ...general, saasName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={general.supportEmail}
                onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Phone (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                value={general.supportPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setGeneral({ ...general, supportPhone: val });
                }}
                placeholder="9876543210"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
              {general.supportPhone && general.supportPhone.length !== 10 && (
                <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
                  Must be exactly 10 digits ({general.supportPhone.length}/10)
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Timezone</label>
              <input
                type="text"
                value={general.timezone}
                onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Currency</label>
              <input
                type="text"
                value={general.currency}
                onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={general.currencySymbol}
                onChange={(e) => setGeneral({ ...general, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save General Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div className="space-y-6 max-w-3xl">
          <form onSubmit={handleSaveSubscription} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-slate-500">Lifecycle & Grace Period Configuration</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Free Trial Duration (Days)</label>
                <input
                  type="number"
                  value={subscription.defaultTrialDays}
                  onChange={(e) => setSubscription({ ...subscription, defaultTrialDays: parseInt(e.target.value, 10) || 14 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Grace Period (Days)</label>
                <input
                  type="number"
                  value={subscription.gracePeriodDays}
                  onChange={(e) => setSubscription({ ...subscription, gracePeriodDays: parseInt(e.target.value, 10) || 5 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Renewal Reminder Triggers (Days before renewal)</label>
                <input
                  type="text"
                  placeholder="7, 3, 1"
                  value={subscription.renewalReminderDays || ''}
                  onChange={(e) => setSubscription({ ...subscription, renewalReminderDays: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">Comma-separated days before period end to dispatch email & alerts</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trial Expiry Triggers (Days before expiry)</label>
                <input
                  type="text"
                  placeholder="3, 1"
                  value={subscription.trialReminderDays || ''}
                  onChange={(e) => setSubscription({ ...subscription, trialReminderDays: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">Comma-separated days before trial expiry to alert prospect</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscription.autoSuspendAfterGrace}
                  onChange={(e) => setSubscription({ ...subscription, autoSuspendAfterGrace: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span>Automatically suspend organization access if grace period passes without payment</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscription.allowDowngrade}
                  onChange={(e) => setSubscription({ ...subscription, allowDowngrade: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span>Allow Plan Downgrades</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscription.allowCancellation}
                  onChange={(e) => setSubscription({ ...subscription, allowCancellation: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span>Allow Customer Self-Cancellation</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Subscription Policies</span>
              </button>
            </div>
          </form>

          {/* Manual Lifecycle Trigger Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Subscription Lifecycle Engine Execution</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The automation worker runs periodically every hour. You can trigger an on-demand audit check now to process renewals, grace periods, and scheduled changes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAutomationCheck}
                disabled={isTestingRun}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <Settings className={`w-3.5 h-3.5 ${isTestingRun ? 'animate-spin' : ''}`} />
                <span>{isTestingRun ? 'Running Check...' : 'Run Lifecycle Check Now'}</span>
              </button>
            </div>

            {lastRunResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <span>Last Execution Summary ({lastRunResult.triggerSource})</span>
                  <span className={lastRunResult.success ? 'text-emerald-600' : 'text-amber-600'}>
                    {lastRunResult.success ? '✓ Completed' : '⚠ Completed with warnings'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-slate-600">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Renewal Alerts</span>
                    <span className="font-bold text-slate-900 text-sm">{lastRunResult.sentRenewalReminders || 0}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Trial Alerts</span>
                    <span className="font-bold text-slate-900 text-sm">{lastRunResult.sentTrialAlerts || 0}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Grace Periods</span>
                    <span className="font-bold text-slate-900 text-sm">{lastRunResult.processedGracePeriods || 0}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Plan Transitions</span>
                    <span className="font-bold text-slate-900 text-sm">{lastRunResult.appliedScheduledPlanChanges || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === 'security' && (
        <form onSubmit={handleSaveSecurity} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Session Timeout (Minutes)</label>
              <input
                type="number"
                value={security.sessionTimeoutMinutes}
                onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: parseInt(e.target.value, 10) || 1440 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Failed Login Attempts</label>
              <input
                type="number"
                value={security.maxLoginAttempts}
                onChange={(e) => setSecurity({ ...security, maxLoginAttempts: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={security.requirePasswordSpecialChar}
                onChange={(e) => setSecurity({ ...security, requirePasswordSpecialChar: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <span>Require Special Characters & Numbers in User Passwords</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Security Policies</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
