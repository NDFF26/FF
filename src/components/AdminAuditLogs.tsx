/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { AuditLog } from '../types';
import {
  ScrollText,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  User,
  Activity
} from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Security & Audit Logs
        </h1>
        <p className="text-sm text-gray-500">
          Comprehensive, immutable record of user login attempts, administrative changes, and system modifications.
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
            <p className="text-sm font-semibold">Error Loading System Audit Logs</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-xs text-gray-400 text-sm">
          No audit logs recorded yet.
        </div>
      ) : (
        /* Audit Logs list card */
        <div id="audit-logs-card" className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/70">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">User / Actor</th>
                  <th className="py-3.5 px-6">Operation</th>
                  <th className="py-3.5 px-6">IP Address</th>
                  <th className="py-3.5 px-6">Details & Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/30">
                    <td className="py-4 px-6 font-mono text-xs text-gray-400">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-semibold text-gray-800">{log.userEmail}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-gray-400">
                      {log.ipAddress}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500 font-mono">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
