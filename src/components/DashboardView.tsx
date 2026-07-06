/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { TransactionType, Wallet, Category, Transaction } from '../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Plus,
  X,
  CreditCard,
  Loader2,
  Calendar,
  AlertCircle,
  Clock
} from 'lucide-react';

interface DashboardViewProps {
  activeAccount: 'personal' | 'professional';
}

export default function DashboardView({ activeAccount }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'standard' | 'self-transfer' | 'user-transfer'>('standard');
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [modalDate, setModalDate] = useState(new Date().toISOString().substring(0, 10));
  const [modalAmount, setModalAmount] = useState('');
  const [modalCategory, setModalCategory] = useState('');
  const [modalWallet, setModalWallet] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Self Transfer specific states
  const [selfSourceWallet, setSelfSourceWallet] = useState('');
  const [selfDestWallet, setSelfDestWallet] = useState('');

  // User Transfer specific states
  const [transferTargets, setTransferTargets] = useState<any[]>([]);
  const [destUserId, setDestUserId] = useState('');
  const [destAccountType, setDestAccountType] = useState<'personal' | 'professional'>('personal');
  const [destWalletId, setDestWalletId] = useState('');

  // Wallets & Categories for dropdown
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchTransferTargets = async () => {
    try {
      const targets = await ApiClient.getTransferTargets();
      setTransferTargets(targets);
      if (targets.length > 0) {
        setDestUserId(targets[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load transfer targets:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardStats = await ApiClient.getDashboardStats(activeAccount);
      const userWallets = await ApiClient.getWallets(activeAccount);
      const userCats = await ApiClient.getCategories(activeAccount);

      setStats(dashboardStats);
      setWallets(userWallets);
      setCategories(userCats);

      // Default wallet auto-selection mapping
      const defaultWallet = userWallets.find(w => w.isDefault);
      if (defaultWallet) {
        setModalWallet(defaultWallet.id);
      } else if (userWallets.length > 0) {
        setModalWallet(userWallets[0].id);
      }

      if (userWallets.length > 0) {
        setSelfSourceWallet(userWallets[0].id);
        if (userWallets.length > 1) {
          setSelfDestWallet(userWallets[1].id);
        } else {
          setSelfDestWallet(userWallets[0].id);
        }
      }

      // Default category setting
      const relevantCats = userCats.filter(c => c.type === modalType);
      if (relevantCats.length > 0) {
        setModalCategory(relevantCats[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to account switch events from sidebar
    const handleAccountChange = () => {
      loadData();
    };

    window.addEventListener('account_changed', handleAccountChange);
    return () => {
      window.removeEventListener('account_changed', handleAccountChange);
    };
  }, [activeAccount]);

  // Handle modal category update when modalType switches
  useEffect(() => {
    const relevantCats = categories.filter(c => c.type === modalType);
    if (relevantCats.length > 0) {
      setModalCategory(relevantCats[0].id);
    } else {
      setModalCategory('');
    }
  }, [modalType, categories]);

  // Load transfer targets on modal show
  useEffect(() => {
    if (showAddModal) {
      fetchTransferTargets();
    }
  }, [showAddModal]);

  // Set recipient wallet automatically when selection changes
  useEffect(() => {
    const selectedTarget = transferTargets.find(t => t.id === destUserId);
    const targetWallets = selectedTarget 
      ? (destAccountType === 'personal' ? selectedTarget.personalWallets : selectedTarget.professionalWallets)
      : [];
    if (targetWallets.length > 0) {
      setDestWalletId(targetWallets[0].id);
    } else {
      setDestWalletId('');
    }
  }, [destUserId, destAccountType, transferTargets]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalAmount || Number(modalAmount) <= 0) {
      setModalError('Please enter a valid positive transaction amount.');
      return;
    }

    setModalLoading(true);
    try {
      if (modalMode === 'standard') {
        if (!modalCategory) {
          setModalError('Please choose a valid category.');
          setModalLoading(false);
          return;
        }
        if (!modalWallet) {
          setModalError('Please choose a valid wallet.');
          setModalLoading(false);
          return;
        }

        await ApiClient.createTransaction({
          accountId: activeAccount,
          type: modalType,
          date: modalDate,
          categoryId: modalCategory,
          walletId: modalWallet,
          amount: Number(modalAmount),
          notes: modalNotes
        });
      } else if (modalMode === 'self-transfer') {
        if (!selfSourceWallet) {
          setModalError('Please select a source wallet.');
          setModalLoading(false);
          return;
        }
        if (!selfDestWallet) {
          setModalError('Please select a destination wallet.');
          setModalLoading(false);
          return;
        }
        if (selfSourceWallet === selfDestWallet) {
          setModalError('Source and destination wallets must be different.');
          setModalLoading(false);
          return;
        }

        await ApiClient.createSelfTransfer({
          accountId: activeAccount,
          sourceWalletId: selfSourceWallet,
          destWalletId: selfDestWallet,
          amount: Number(modalAmount),
          date: modalDate,
          notes: modalNotes
        });
      } else if (modalMode === 'user-transfer') {
        if (!modalWallet) {
          setModalError('Please select your source wallet.');
          setModalLoading(false);
          return;
        }
        if (!destUserId) {
          setModalError('Please select a recipient user.');
          setModalLoading(false);
          return;
        }
        if (!destWalletId) {
          setModalError('Please select the recipient\'s wallet.');
          setModalLoading(false);
          return;
        }

        await ApiClient.createUserTransfer({
          sourceAccountId: activeAccount,
          sourceWalletId: modalWallet,
          destUserId,
          destAccountId: destAccountType,
          destWalletId,
          amount: Number(modalAmount),
          date: modalDate,
          notes: modalNotes
        });
      }

      // Clear form & close
      setModalAmount('');
      setModalNotes('');
      setShowAddModal(false);
      setModalMode('standard');

      // Reload dashboard
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'An error occurred while creating transaction.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mt-4">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Error Loading Dashboard</h4>
          <p className="text-xs mt-1">{error}</p>
          <button onClick={loadData} className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate high quality custom chart metrics
  const maxVal = Math.max(...(stats?.chartData?.map((d: any) => Math.max(d.income, d.expense)) || [10000]), 10000);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 capitalize">
            {activeAccount} Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Real-time insights and summary of your {activeAccount} financial operations.
          </p>
        </div>
        <button
          id="open-add-transaction-modal-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Transaction
        </button>
      </div>

      {/* Bento Grid Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Balance Card */}
        <div id="stats-card-balance" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Net Account Balance</p>
            <h3 className={`text-2xl font-bold mt-1 tracking-tight truncate ${(stats?.netBalance ?? 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              ₹{(stats?.netBalance ?? 0).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>

        {/* Total Income Card */}
        <div id="stats-card-income" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Income</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-emerald-600 truncate">
              ₹{(stats?.totalIncome ?? 0).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>

        {/* Total Expense Card */}
        <div id="stats-card-expense" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Expense</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-red-600 truncate">
              ₹{(stats?.totalExpense ?? 0).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>

        {/* Net Savings % Card */}
        <div id="stats-card-savings" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Savings Rate</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-gray-900 truncate">
              {stats?.totalIncome > 0
                ? `${Math.max(0, Math.round(((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100))}%`
                : '0%'}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Custom Monthly Comparison Chart */}
        <div id="monthly-chart-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs lg:col-span-2">
          <h3 className="text-base font-bold text-gray-900 mb-4">6-Month Trend (Income vs Expense)</h3>
          
          {stats?.chartData && stats.chartData.length > 0 ? (
            <div className="space-y-4">
              {/* SVG Layout Chart */}
              <div className="h-64 w-full relative flex items-end justify-between px-2 pt-6 border-b border-l border-gray-100">
                {stats.chartData.map((d: any, index: number) => {
                  const incHeight = (d.income / maxVal) * 180; // Scale to fit max 200px
                  const expHeight = (d.expense / maxVal) * 180;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end h-full px-2 group">
                      {/* Tooltip Hover effect */}
                      <div className="absolute top-0 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg transition-opacity pointer-events-none z-10 text-center shadow-md">
                        <p className="font-semibold">{d.month}</p>
                        <p className="text-emerald-400">Income: ₹{d.income.toLocaleString()}</p>
                        <p className="text-red-400">Expense: ₹{d.expense.toLocaleString()}</p>
                      </div>

                      {/* Bars Container */}
                      <div className="flex gap-1.5 items-end w-full justify-center">
                        {/* Income Bar */}
                        <div
                          className="w-4 bg-emerald-500 rounded-t-xs hover:bg-emerald-600 transition-all duration-300 shadow-xs"
                          style={{ height: `${Math.max(4, incHeight)}px` }}
                        />
                        {/* Expense Bar */}
                        <div
                          className="w-4 bg-red-500 rounded-t-xs hover:bg-red-600 transition-all duration-300 shadow-xs"
                          style={{ height: `${Math.max(4, expHeight)}px` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 mt-2 block truncate w-full text-center">
                        {d.month}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 bg-emerald-500 rounded-xs" />
                  <span className="text-gray-600">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 bg-red-500 rounded-xs" />
                  <span className="text-gray-600">Expense</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No historical data found.
            </div>
          )}
        </div>

        {/* Wallets & Category Distributions */}
        <div className="space-y-6">
          {/* Wallet List Card */}
          <div id="wallets-balances-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4">Wallets & Liquidity</h3>
            <div className="space-y-3.5">
              {stats?.walletBalances?.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {w.name}
                      </p>
                      {w.isDefault && (
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${w.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    ₹{w.balance.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Categories Distribution */}
          <div id="top-expense-categories-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4">Top Spending Categories</h3>
            <div className="space-y-3">
              {stats?.categoryExpenses && stats.categoryExpenses.length > 0 ? (
                stats.categoryExpenses.slice(0, 3).map((c: any) => {
                  const percentage = stats.totalExpense > 0 ? Math.round((c.total / stats.totalExpense) * 100) : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-700">
                        <span className="truncate max-w-[70%]">{c.name}</span>
                        <span>₹{c.total.toLocaleString()} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-gray-400">
                  No expenditure recorded this month.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div id="recent-transactions-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
          <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Last 5 Transactions
          </span>
        </div>

        {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 px-4">Category</th>
                  <th className="pb-3 px-4">Wallet</th>
                  <th className="pb-3 px-4">Notes</th>
                  <th className="pb-3 pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{tx.date}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{tx.categoryName}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {tx.walletName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate">{tx.notes || '—'}</td>
                    <td className={`py-3 pl-4 text-right font-bold ${
                      tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {tx.type === TransactionType.INCOME ? '+' : '-'}₹{tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            No transactions found for this account. Click "Add Transaction" to create one.
          </div>
        )}
      </div>

      {/* Add Transaction Modal Dialog */}
      {showAddModal && (
        <div id="add-transaction-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full relative z-10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-indigo-50/40">
              <h2 className="text-lg font-bold text-gray-900">Log Transaction or Transfer</h2>
              <button
                id="close-add-modal-btn"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Mode Selector Tab */}
            <div className="flex border-b border-gray-100 bg-gray-50/30">
              <button
                type="button"
                onClick={() => setModalMode('standard')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  modalMode === 'standard'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                Standard Entry
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMode('self-transfer');
                  if (wallets.length > 0) {
                    setSelfSourceWallet(wallets[0].id);
                    setSelfDestWallet(wallets[1]?.id || wallets[0].id);
                  }
                }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  modalMode === 'self-transfer'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                Self Transfer
              </button>
              <button
                type="button"
                onClick={() => setModalMode('user-transfer')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  modalMode === 'user-transfer'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                User to User
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Date Input */}
              <div>
                <label htmlFor="tx-date" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <input
                    id="tx-date"
                    type="date"
                    required
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Standard Mode Fields */}
              {modalMode === 'standard' && (
                <>
                  {/* Transaction Type Select */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Transaction Type
                    </label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setModalType(TransactionType.EXPENSE)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                          modalType === TransactionType.EXPENSE
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Expense
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalType(TransactionType.INCOME)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                          modalType === TransactionType.INCOME
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Income
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category Dropdown */}
                    <div>
                      <label htmlFor="tx-category" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Category
                      </label>
                      <select
                        id="tx-category"
                        required={modalMode === 'standard'}
                        value={modalCategory}
                        onChange={(e) => setModalCategory(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        {categories
                          .filter(c => c.type === modalType)
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Wallet Dropdown */}
                    <div>
                      <label htmlFor="tx-wallet" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Wallet / Bank
                      </label>
                      <select
                        id="tx-wallet"
                        required={modalMode === 'standard'}
                        value={modalWallet}
                        onChange={(e) => setModalWallet(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Self-Transfer Mode Fields */}
              {modalMode === 'self-transfer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Source Wallet Dropdown */}
                  <div>
                    <label htmlFor="self-source-wallet" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Source Wallet (From)
                    </label>
                    <select
                      id="self-source-wallet"
                      required={modalMode === 'self-transfer'}
                      value={selfSourceWallet}
                      onChange={(e) => setSelfSourceWallet(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination Wallet Dropdown */}
                  <div>
                    <label htmlFor="self-dest-wallet" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Destination Wallet (To)
                    </label>
                    <select
                      id="self-dest-wallet"
                      required={modalMode === 'self-transfer'}
                      value={selfDestWallet}
                      onChange={(e) => setSelfDestWallet(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* User Wise Transfer Mode Fields */}
              {modalMode === 'user-transfer' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Source Wallet Dropdown */}
                    <div>
                      <label htmlFor="user-source-wallet" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Your Source Wallet
                      </label>
                      <select
                        id="user-source-wallet"
                        required={modalMode === 'user-transfer'}
                        value={modalWallet}
                        onChange={(e) => setModalWallet(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Destination User Dropdown */}
                    <div>
                      <label htmlFor="dest-user-select" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Recipient User
                      </label>
                      <select
                        id="dest-user-select"
                        required={modalMode === 'user-transfer'}
                        value={destUserId}
                        onChange={(e) => setDestUserId(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        {transferTargets.length === 0 ? (
                          <option value="" disabled>No active target users</option>
                        ) : (
                          transferTargets.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.displayName} ({t.email})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recipient Account Type Selector */}
                    <div>
                      <label htmlFor="dest-account-type-select" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Recipient Account Type
                      </label>
                      <select
                        id="dest-account-type-select"
                        required={modalMode === 'user-transfer'}
                        value={destAccountType}
                        onChange={(e) => setDestAccountType(e.target.value as 'personal' | 'professional')}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        <option value="personal">Personal Account</option>
                        <option value="professional">Professional Account</option>
                      </select>
                    </div>

                    {/* Recipient's Wallet / Bank Selection */}
                    <div>
                      <label htmlFor="dest-wallet-select" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Recipient's Wallet / Bank
                      </label>
                      <select
                        id="dest-wallet-select"
                        required={modalMode === 'user-transfer'}
                        value={destWalletId}
                        onChange={(e) => setDestWalletId(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        {transferTargets.find(t => t.id === destUserId)
                          ? (destAccountType === 'personal' 
                              ? transferTargets.find(t => t.id === destUserId).personalWallets 
                              : transferTargets.find(t => t.id === destUserId).professionalWallets
                            ).map((w: any) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))
                          : <option value="" disabled>No wallets available</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label htmlFor="tx-amount" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount (INR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-semibold">₹</span>
                  </div>
                  <input
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    placeholder="0.00"
                    className="block w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-900"
                  />
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label htmlFor="tx-notes" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="tx-notes"
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="E.g. Online to Cash, transfer, payment, etc."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button
                  id="cancel-add-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-transaction-btn"
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {modalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
