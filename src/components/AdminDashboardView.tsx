/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import {
  Users,
  Wallet,
  Coins,
  History,
  Activity,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function AdminDashboardView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getAdminDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch administrator statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Error Loading Admin Stats</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          System-wide diagnostic reports, user demographics, and service metrics.
        </p>
      </div>

      {/* Admin stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Registered Users */}
        <div id="admin-card-users" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Users</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-gray-900 truncate">
              {stats?.totalUsers}
            </h3>
          </div>
        </div>

        {/* Total Wallets */}
        <div id="admin-card-wallets" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Wallets</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-gray-900 truncate">
              {stats?.totalWallets}
            </h3>
          </div>
        </div>

        {/* Total Active Transactions */}
        <div id="admin-card-txs" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <History className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Transactions</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-gray-900 truncate">
              {stats?.totalTransactions}
            </h3>
          </div>
        </div>

        {/* Global Volume */}
        <div id="admin-card-volume" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">System Volume</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-gray-900 truncate">
              ₹{(stats?.totalVolume ?? 0).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Activity Logs table widget */}
        <div id="latest-audit-logs-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Latest Security Events</h3>
            <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-gray-400" />
              Realtime Logs
            </span>
          </div>

          <div className="space-y-3">
            {stats?.latestLogs && stats.latestLogs.length > 0 ? (
              stats.latestLogs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="flex items-start justify-between gap-4 p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl transition-all border border-gray-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800">
                      {log.userEmail} <span className="font-normal text-gray-400">performed</span> {log.action}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-gray-400 text-xs">No active events found.</p>
            )}
          </div>
        </div>

        {/* User Status Demographics Chart panel */}
        <div id="demographics-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 mb-4">User Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-600">Active Seats</span>
              <span>{stats?.userBreakdown?.active || 0}</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{
                  width: `${
                    stats?.totalUsers > 0
                      ? Math.round(((stats.userBreakdown?.active || 0) / stats.totalUsers) * 100)
                      : 0
                  }%`
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-semibold pt-2">
              <span className="text-red-500">Disabled Seats</span>
              <span>{stats?.userBreakdown?.disabled || 0}</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full"
                style={{
                  width: `${
                    stats?.totalUsers > 0
                      ? Math.round(((stats.userBreakdown?.disabled || 0) / stats.totalUsers) * 100)
                      : 0
                  }%`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
