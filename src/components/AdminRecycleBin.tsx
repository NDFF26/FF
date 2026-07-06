/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { Transaction, TransactionType } from '../types';
import {
  Trash2,
  Undo2,
  AlertCircle,
  Loader2,
  Info,
  Calendar
} from 'lucide-react';

interface DeletedTransactionWithMeta extends Transaction {
  userEmail: string;
  categoryName: string;
  walletName: string;
}

export default function AdminRecycleBin() {
  const [deletedTxList, setDeletedTxList] = useState<DeletedTransactionWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeleted = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getDeletedTransactions();
      setDeletedTxList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deleted records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeleted();
  }, []);

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this transaction? It will reappear in the user\'s active balance.')) {
      return;
    }

    try {
      await ApiClient.restoreTransaction(id);
      await loadDeleted();
      alert('Transaction has been successfully restored.');
    } catch (err: any) {
      alert(err.message || 'Failed to restore transaction.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Recycle Bin & Data Recovery
        </h1>
        <p className="text-sm text-gray-500">
          Administrator workshop to inspect soft-deleted transaction history and restore them safely.
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
            <p className="text-sm font-semibold">Error Loading Deleted Transactions</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : deletedTxList.length === 0 ? (
        <div id="recycle-bin-empty-alert" className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
            <Trash2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-800">Recycle Bin is Empty</p>
          <p className="text-xs text-gray-400">There are no soft-deleted transactions currently in the system.</p>
        </div>
      ) : (
        /* Recycle Bin Table */
        <div id="recycle-bin-card" className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/70">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Original Date</th>
                  <th className="py-3.5 px-6">Owner Account</th>
                  <th className="py-3.5 px-6">Account Type</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Wallet / Bank</th>
                  <th className="py-3.5 px-6">Notes</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {deletedTxList.map((tx) => {
                  const isIncome = tx.type === TransactionType.INCOME;
                  return (
                    <tr key={tx.id} className="hover:bg-red-50/10">
                      <td className="py-4 px-6 font-mono text-xs text-gray-500 shrink-0">
                        {tx.date}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-gray-800">{tx.userEmail}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                          {tx.accountId}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-800">
                        {tx.categoryName}
                      </td>
                      <td className="py-4 px-6 text-gray-500">
                        {tx.walletName}
                      </td>
                      <td className="py-4 px-6 text-gray-400 max-w-xs truncate">
                        {tx.notes || '—'}
                      </td>
                      <td className={`py-4 px-6 font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right shrink-0">
                        <button
                          id={`restore-tx-${tx.id}-btn`}
                          onClick={() => handleRestore(tx.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Restore
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
