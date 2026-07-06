/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ApiClient } from '../lib/api';
import { User } from '../types';
import { Wallet, KeyRound, AlertCircle, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: Omit<User, 'passwordHash'>) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Cloud Sync setup states
  const [showSyncForm, setShowSyncForm] = useState(false);
  const [syncUrl, setSyncUrl] = useState(() => ApiClient.getGoogleSheetsUrl() || '');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await ApiClient.login(email, password);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncConnect = async () => {
    if (!syncUrl.trim()) return;
    setSyncLoading(true);
    setSyncSuccess(null);
    setSyncError(null);

    try {
      // 1. Save URL in client LocalStorage
      ApiClient.setGoogleSheetsUrl(syncUrl.trim());

      // 2. Trigger bootstrapping
      const success = await ApiClient.bootstrapFromServer(syncUrl.trim());
      if (success) {
        setSyncSuccess('✅ Connected! Database has been successfully loaded from Google Sheets. You can now sign in using your accounts.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setSyncError('❌ Connection failed. Ensure your Google Sheets Web App is active and authorized.');
      }
    } catch (err: any) {
      setSyncError('❌ Sync connection failed. ' + (err.message || err));
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div id="login-page" className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center mb-4">
            {!logoError ? (
              <img
                src="./logo.png"
                alt="FinanceFlow Logo"
                className="h-16 w-16 object-contain"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Wallet className="h-6 w-6" id="login-logo-icon" />
              </div>
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight font-sans">
            <span className="text-[#07274c]">Finance</span>
            <span className="text-[#179743]">Flow</span>
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to manage your Personal & Professional accounts
          </p>
        </div>

        {error && (
          <div id="login-error-alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="name@company.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5 text-white" />
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </div>
        </form>

        {/* Optional Google Sheets Cloud Sync Settings Card - Hidden from UI as requested */}
        <div id="login-sync-container" className="hidden mt-6 pt-6 border-t border-gray-100 space-y-3">
          <button
            id="login-sync-toggle"
            type="button"
            onClick={() => setShowSyncForm(!showSyncForm)}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>🔗 DEVICE CLOUD SYNC CONFIGURATION</span>
            <span>{showSyncForm ? 'Hide' : 'Show'}</span>
          </button>

          {showSyncForm && (
            <div id="login-sync-form" className="bg-gray-50 p-4 rounded-xl border border-gray-200/50 space-y-3 text-left">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Using a new device or restoring your data? Paste your Google Apps Script Web App URL below to instantly download and boot your full account, wallets, categories, and histories.
              </p>
              
              <div>
                <input
                  id="sync-sheets-url"
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={syncUrl}
                  onChange={(e) => {
                    setSyncUrl(e.target.value);
                    setSyncSuccess(null);
                    setSyncError(null);
                  }}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900"
                  disabled={syncLoading}
                />
              </div>

              {syncSuccess && (
                <div id="login-sync-success-alert" className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-[11px] font-medium leading-relaxed">
                  {syncSuccess}
                </div>
              )}

              {syncError && (
                <div id="login-sync-error-alert" className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-700 text-[11px] font-medium leading-relaxed">
                  {syncError}
                </div>
              )}

              <button
                id="login-sync-btn"
                type="button"
                disabled={syncLoading || !syncUrl.trim()}
                onClick={handleSyncConnect}
                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {syncLoading ? (
                  <>
                    <Loader2 className="animate-spin h-3.5 w-3.5" />
                    Connecting...
                  </>
                ) : (
                  'Connect & Pull Database'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
