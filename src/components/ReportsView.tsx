/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { Category, Wallet, Transaction, TransactionType } from '../types';
import {
  Calendar,
  AlertCircle,
  Loader2,
  PieChart,
  BarChart4,
  ArrowUpRight,
  ArrowDownRight,
  WalletCards,
  BookOpen
} from 'lucide-react';

interface ReportsViewProps {
  activeAccount: 'personal' | 'professional';
}

export default function ReportsView({ activeAccount }: ReportsViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeframe selector
  const [timeframe, setTimeframe] = useState<'this-month' | 'last-30' | 'this-year' | 'custom'>('this-month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Calculate date filters based on selected timeframe
      let start = '';
      let end = '';

      const today = new Date();
      if (timeframe === 'this-month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = firstDay.toISOString().substring(0, 10);
        end = today.toISOString().substring(0, 10);
      } else if (timeframe === 'last-30') {
        const past30 = new Date();
        past30.setDate(today.getDate() - 30);
        start = past30.toISOString().substring(0, 10);
        end = today.toISOString().substring(0, 10);
      } else if (timeframe === 'this-year') {
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        start = firstDayOfYear.toISOString().substring(0, 10);
        end = today.toISOString().substring(0, 10);
      } else if (timeframe === 'custom') {
        start = startDate;
        end = endDate;
      }

      const txList = await ApiClient.getTransactions(activeAccount, {
        startDate: start || undefined,
        endDate: end || undefined
      });
      const catList = await ApiClient.getCategories(activeAccount);
      const walList = await ApiClient.getWallets(activeAccount);

      setTransactions(txList);
      setCategories(catList);
      setWallets(walList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reporting analytics.');
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
  }, [activeAccount, timeframe, startDate, endDate]);

  // Aggregate Reporting Calculations
  let totalIncome = 0;
  let totalExpense = 0;

  const categoryAggregation: Record<string, { id: string; name: string; type: TransactionType; total: number; count: number }> = {};
  const walletAggregation: Record<string, { id: string; name: string; income: number; expense: number; net: number }> = {};

  // Setup initial category aggregates
  categories.forEach(c => {
    categoryAggregation[c.id] = { id: c.id, name: c.name, type: c.type, total: 0, count: 0 };
  });

  // Setup initial wallet aggregates
  wallets.forEach(w => {
    walletAggregation[w.id] = { id: w.id, name: w.name, income: 0, expense: 0, net: 0 };
  });

  // Aggregate values
  transactions.forEach(t => {
    if (t.type === TransactionType.INCOME) {
      totalIncome += t.amount;
      if (walletAggregation[t.walletId]) {
        walletAggregation[t.walletId].income += t.amount;
        walletAggregation[t.walletId].net += t.amount;
      }
    } else {
      totalExpense += t.amount;
      if (walletAggregation[t.walletId]) {
        walletAggregation[t.walletId].expense += t.amount;
        walletAggregation[t.walletId].net -= t.amount;
      }
    }

    if (categoryAggregation[t.categoryId]) {
      categoryAggregation[t.categoryId].total += t.amount;
      categoryAggregation[t.categoryId].count += 1;
    }
  });

  const netSavings = totalIncome - totalExpense;
  const savingsPercent = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Convert aggregates to lists for rendering
  const categoryExpenses = Object.values(categoryAggregation)
    .filter(c => c.type === TransactionType.EXPENSE && c.total > 0)
    .sort((a, b) => b.total - a.total);

  const categoryIncomes = Object.values(categoryAggregation)
    .filter(c => c.type === TransactionType.INCOME && c.total > 0)
    .sort((a, b) => b.total - a.total);

  const walletReports = Object.values(walletAggregation);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Financial Analytics & Reports
          </h1>
          <p className="text-sm text-gray-500">
            Dynamically calculate income rates, expense distributions, and net balances.
          </p>
        </div>

        {/* Timeframe Select */}
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setTimeframe('this-month')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              timeframe === 'this-month' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 hover:text-gray-950'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeframe('last-30')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              timeframe === 'last-30' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 hover:text-gray-950'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeframe('this-year')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              timeframe === 'this-year' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 hover:text-gray-950'
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => setTimeframe('custom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              timeframe === 'custom' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 hover:text-gray-950'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Custom Date Inputs if 'custom' is active */}
      {timeframe === 'custom' && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-wrap gap-4 items-end">
          <div>
            <label htmlFor="report-start-date" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">From Date</label>
            <input
              id="report-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div>
            <label htmlFor="report-end-date" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">To Date</label>
            <input
              id="report-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
          <button
            id="report-reload-btn"
            onClick={loadData}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Fetch Range
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Failed to build report</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* High-Level Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Inflow */}
            <div id="report-card-income" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Income Flow</p>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                ₹{totalIncome.toLocaleString()}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Calculated from {transactions.filter(t => t.type === TransactionType.INCOME).length} entries</p>
            </div>

            {/* Total Outflow */}
            <div id="report-card-expense" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Expense Flow</p>
                <span className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                  <ArrowDownRight className="h-4 w-4" />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                ₹{totalExpense.toLocaleString()}
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-sans">Calculated from {transactions.filter(t => t.type === TransactionType.EXPENSE).length} entries</p>
            </div>

            {/* Net Balance */}
            <div id="report-card-savings" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Net Period Savings</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${netSavings >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {savingsPercent}% Rate
                </span>
              </div>
              <h3 className={`text-2xl font-bold mt-2 ${netSavings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ₹{netSavings.toLocaleString()}
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-sans">Net surplus of cash during period</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Categories breakdown */}
            <div id="report-category-expense-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <BarChart4 className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Spending by Category</h3>
              </div>

              {categoryExpenses.length > 0 ? (
                <div className="space-y-4">
                  {categoryExpenses.map(c => {
                    const percentage = totalExpense > 0 ? Math.round((c.total / totalExpense) * 100) : 0;
                    return (
                      <div key={c.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-700 truncate">{c.name}</span>
                          <span className="text-gray-900 font-mono">₹{c.total.toLocaleString()} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">{c.count} transactions recorded</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No expenditures found in selected period.
                </div>
              )}
            </div>

            {/* Income Categories breakdown */}
            <div id="report-category-income-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">Income by Category</h3>
              </div>

              {categoryIncomes.length > 0 ? (
                <div className="space-y-4">
                  {categoryIncomes.map(c => {
                    const percentage = totalIncome > 0 ? Math.round((c.total / totalIncome) * 100) : 0;
                    return (
                      <div key={c.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-700 truncate">{c.name}</span>
                          <span className="text-gray-900 font-mono">₹{c.total.toLocaleString()} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">{c.count} transactions recorded</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No incomes found in selected period.
                </div>
              )}
            </div>
          </div>

          {/* Wallet Report Flow Card */}
          <div id="report-wallet-flow-card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <WalletCards className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900">Wallet Liquidity Flows</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Wallet Name</th>
                    <th className="pb-3 px-4 text-emerald-600">Total Incomes (+)</th>
                    <th className="pb-3 px-4 text-red-600">Total Expenses (-)</th>
                    <th className="pb-3 pl-4 text-right">Surplus / Deficit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {walletReports.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50/50">
                      <td className="py-3 pr-4 font-semibold text-gray-800">{w.name}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">+₹{w.income.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-red-600">-₹{w.expense.toLocaleString()}</td>
                      <td className={`py-3 pl-4 text-right font-bold font-mono ${w.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {w.net >= 0 ? '+' : ''}₹{w.net.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
