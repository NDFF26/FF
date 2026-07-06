/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { SystemSettings } from '../types';
import {
  Settings,
  AlertCircle,
  Loader2,
  Save,
  CheckCircle,
  ShieldAlert,
  Trash2
} from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Custom Factory Reset States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [verificationInput, setVerificationInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Form Fields
  const [currency, setCurrency] = useState('INR');
  const [allowRegistration, setAllowRegistration] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(24);
  const [require2FA, setRequire2FA] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getSystemSettings();
      setSettings(data);
      setCurrency(data.currency || 'INR');
      setAllowRegistration(!!data.allowUserRegistration);
      setSessionTimeout(data.sessionTimeoutHours !== undefined && data.sessionTimeoutHours !== null ? data.sessionTimeoutHours : 24);
      setRequire2FA(!!data.requireTwoFactor);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await ApiClient.updateSystemSettings({
        ...settings,
        allowUserRegistration: allowRegistration,
        defaultCurrency: currency,
        currency,
        sessionTimeoutHours: sessionTimeout,
        requireTwoFactor: require2FA
      } as SystemSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Global System Settings
        </h1>
        <p className="text-sm text-gray-500">
          Administrator command room to update currency parameters, security configurations, and system protocols.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Error Loading System Settings</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="max-w-xl">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            {success && (
              <div id="settings-success-alert" className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                Settings saved successfully! Changes applied immediately.
              </div>
            )}

            {/* General Configurations */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">General</h3>
              
              <div>
                <label htmlFor="sys-currency" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  System Default Currency
                </label>
                <select
                  id="sys-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="INR">Indian Rupee (₹ / INR)</option>
                  <option value="USD">US Dollar ($ / USD)</option>
                  <option value="EUR">Euro (€ / EUR)</option>
                  <option value="GBP">British Pound (£ / GBP)</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <label htmlFor="sys-allow-reg" className="text-sm font-semibold text-gray-700">Allow Self User Registration</label>
                  <p className="text-xs text-gray-400">Let non-admin guest users sign up from the landing screen.</p>
                </div>
                <input
                  id="sys-allow-reg"
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Security Settings */}
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Security & Authentication</h3>

              <div>
                <label htmlFor="sys-session-timeout" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Session Expiration Timeout (Hours)
                </label>
                <input
                  id="sys-session-timeout"
                  type="number"
                  min="1"
                  max="720"
                  required
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <label htmlFor="sys-2fa" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-500 inline" />
                    Enforce Multifactor Authentication (MFA)
                  </label>
                  <p className="text-xs text-gray-400">Require full verification codes during session handshakes.</p>
                </div>
                <input
                  id="sys-2fa"
                  type="checkbox"
                  checked={require2FA}
                  onChange={(e) => setRequire2FA(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                id="save-settings-btn"
                type="submit"
                disabled={saving || resetting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Danger Zone: Factory Reset */}
          <div id="danger-zone-settings-card" className="mt-8 bg-red-50/40 p-6 rounded-2xl border border-red-200/60 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">Danger Zone</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  Perform a complete system reset. This action will permanently erase all other user accounts, transactions, history, wallets, and custom categories, reverting the system to its clean factory state. Only your current administrator account will be preserved.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                id="factory-reset-btn"
                type="button"
                disabled={resetting || saving}
                onClick={() => {
                  setResetStep(1);
                  setVerificationInput('');
                  setResetError(null);
                  setResetSuccess(false);
                  setShowResetModal(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Perform Factory Reset (Erase All Data)
              </button>
            </div>
          </div>

          {/* Custom Factory Reset Step-by-Step Modal */}
          {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => !resetting && !resetSuccess && setShowResetModal(false)} />
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full relative z-10 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-red-50">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                  <h2 className="text-base font-bold text-red-900">System Factory Reset</h2>
                </div>

                <div className="p-6 space-y-4">
                  {resetStep === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">⚠️ Phase 1: Danger Zone Confirmation</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        You are initiating a complete system database wipe. This will:
                      </p>
                      <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
                        <li>Permanently delete <strong>all other user accounts</strong>.</li>
                        <li>Erase all income & expense <strong>transactions</strong> and logs.</li>
                        <li>Wipe all wallets, custom bank setups, and categories.</li>
                        <li><strong>Preserve only your current administrator account</strong> and reset core system configurations to default.</li>
                      </ul>
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowResetModal(false)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetStep(2)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Understood, Proceed
                        </button>
                      </div>
                    </div>
                  )}

                  {resetStep === 2 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-red-600">🚨 Phase 2: Irreversible Action Warning</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Are you 100% positive you want to do this? This action cannot be undone under any circumstances. Once executed, all production transaction history is gone forever.
                      </p>
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResetStep(1)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetStep(3)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Yes, I am absolutely sure
                        </button>
                      </div>
                    </div>
                  )}

                  {resetStep === 3 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">🔒 Phase 3: Administrator Authorization</p>
                      <p className="text-xs text-gray-600">
                        Please type <strong className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-700">RESET</strong> in the box below to authorize:
                      </p>
                      <input
                        type="text"
                        value={verificationInput}
                        onChange={(e) => setVerificationInput(e.target.value)}
                        placeholder="Type RESET here"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500 font-mono text-center"
                      />
                      {resetError && (
                        <p className="text-xs text-red-600 font-medium">{resetError}</p>
                      )}
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={resetting}
                          onClick={() => setResetStep(2)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold disabled:opacity-50 cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={resetting || verificationInput !== 'RESET'}
                          onClick={async () => {
                            setResetting(true);
                            setResetError(null);
                            try {
                              await ApiClient.factoryReset();
                              setResetSuccess(true);
                              setResetStep(4);
                            } catch (err: any) {
                              setResetError(err.message || 'Failed to execute factory reset.');
                              setResetting(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer font-sans"
                        >
                          {resetting ? (
                            <>
                              <Loader2 className="animate-spin h-3.5 w-3.5" />
                              Wiping Database...
                            </>
                          ) : (
                            'Authorize & Wipe System'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {resetStep === 4 && (
                    <div className="space-y-3 text-center py-2">
                      <p className="text-sm font-bold text-emerald-600 font-sans">✨ Reset Complete!</p>
                      <p className="text-xs text-gray-600 leading-relaxed font-sans">
                        All other user logs, setups, and accounts have been successfully terminated. The system is back to factory default.
                      </p>
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetModal(false);
                            window.location.reload();
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer font-sans"
                        >
                          Reload System Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
