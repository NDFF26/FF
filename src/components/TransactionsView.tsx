/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { Transaction, TransactionType, Category, Wallet } from '../types';
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  Plus
} from 'lucide-react';

interface TransactionsViewProps {
  activeAccount: 'personal' | 'professional';
}

type SortField = 'date' | 'amount';
type SortOrder = 'desc' | 'asc';

export default function TransactionsView({ activeAccount }: TransactionsViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting States
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Edit Modal State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editWallet, setEditWallet] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        wallet: selectedWallet || undefined,
        type: selectedType ? (selectedType as TransactionType) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const txList = await ApiClient.getTransactions(activeAccount, filters);
      const catList = await ApiClient.getCategories(activeAccount);
      const walList = await ApiClient.getWallets(activeAccount);

      setTransactions(txList);
      setCategories(catList);
      setWallets(walList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to account changes from sidebar
    const handleAccountChange = () => {
      loadData();
    };
    window.addEventListener('account_changed', handleAccountChange);
    return () => {
      window.removeEventListener('account_changed', handleAccountChange);
    };
  }, [activeAccount]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedWallet('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
    // Trigger list reload immediately
    setTimeout(() => {
      loadData();
    }, 50);
  };

  const handleSoftDelete = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? (It can be restored by an administrator).')) {
      return;
    }

    try {
      await ApiClient.deleteTransaction(txId);
      // Reload current list
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction.');
    }
  };

  // Sort transactions locally
  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Edit Handlers
  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDate(tx.date);
    setEditCategory(tx.categoryId);
    setEditWallet(tx.walletId);
    setEditAmount(tx.amount.toString());
    setEditNotes(tx.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    if (!editAmount || Number(editAmount) <= 0) {
      setEditError('Please enter a valid positive amount.');
      return;
    }
    if (!editCategory) {
      setEditError('Category is required.');
      return;
    }
    if (!editWallet) {
      setEditError('Wallet/Bank is required.');
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      await ApiClient.updateTransaction(editingTx.id, {
        date: editDate,
        categoryId: editCategory,
        walletId: editWallet,
        amount: Number(editAmount),
        notes: editNotes
      });

      setEditingTx(null);
      await loadData();
    } catch (err: any) {
      setEditError(err.message || 'An error occurred while updating the transaction.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Transaction Registry
        </h1>
        <p className="text-sm text-gray-500">
          Search, filter, edit, and organize all active transactions for your {activeAccount} account.
        </p>
      </div>

      {/* Filter and Search Panel */}
      <form onSubmit={handleApplyFilters} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword Search */}
          <div>
            <label htmlFor="filter-search" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Search Notes</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="filter-search"
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Type Select */}
          <div>
            <label htmlFor="filter-type" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Transaction Type</label>
            <select
              id="filter-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TransactionType | '')}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Types</option>
              <option value={TransactionType.INCOME}>Incomes (+)</option>
              <option value={TransactionType.EXPENSE}>Expenses (-)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="filter-category" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Category</label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Wallet Filter */}
          <div>
            <label htmlFor="filter-wallet" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Wallet / Bank</label>
            <select
              id="filter-wallet"
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Wallets</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div>
            <label htmlFor="filter-start-date" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">From Date</label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div>
            <label htmlFor="filter-end-date" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">To Date</label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div className="sm:col-span-2 flex items-end justify-end gap-3 pt-3 sm:pt-0">
            <button
              id="clear-filters-btn"
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              id="apply-filters-btn"
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5" />
              Apply Filters
            </button>
          </div>
        </div>
      </form>

      {/* Transaction List Container */}
      <div id="transactions-list-card" className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 flex flex-col items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No transactions matched your filter guidelines.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/70">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-6 cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Wallet / Bank</th>
                  <th className="py-3 px-6">Notes</th>
                  <th className="py-3 px-6 cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('amount')}>
                    <div className="flex items-center gap-1">
                      Amount
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {sortedTransactions.map((tx) => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  const wal = wallets.find(w => w.id === tx.walletId);
                  const isIncome = tx.type === TransactionType.INCOME;

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-6 font-mono text-xs text-gray-500 shrink-0">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-gray-800">
                        {cat ? cat.name : 'Unknown'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <CreditCard className="h-3 w-3 text-gray-500" />
                          {wal ? wal.name : 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-gray-500 max-w-xs truncate">
                        {tx.notes || <span className="text-gray-300 font-mono">—</span>}
                      </td>
                      <td className={`py-3.5 px-6 font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2.5 shrink-0">
                        <button
                          id={`edit-tx-${tx.id}-btn`}
                          onClick={() => openEditModal(tx)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          id={`delete-tx-${tx.id}-btn`}
                          onClick={() => handleSoftDelete(tx.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal Dialog */}
      {editingTx && (
        <div id="edit-transaction-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => setEditingTx(null)} />

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full relative z-10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-indigo-50/40">
              <h2 className="text-lg font-bold text-gray-900">Edit Transaction</h2>
              <button
                id="close-edit-modal-btn"
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Immutable Transaction Type display */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Type (Immutable)
                </span>
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                  editingTx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {editingTx.type}
                </span>
              </div>

              {/* Date Input */}
              <div>
                <label htmlFor="edit-tx-date" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Date
                </label>
                <input
                  id="edit-tx-date"
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <label htmlFor="edit-tx-category" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Category
                  </label>
                  <select
                    id="edit-tx-category"
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {categories
                      .filter(c => c.type === editingTx.type)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Wallet Selection */}
                <div>
                  <label htmlFor="edit-tx-wallet" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Wallet / Bank
                  </label>
                  <select
                    id="edit-tx-wallet"
                    required
                    value={editWallet}
                    onChange={(e) => setEditWallet(e.target.value)}
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

              {/* Amount Input */}
              <div>
                <label htmlFor="edit-tx-amount" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount (INR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-semibold">₹</span>
                  </div>
                  <input
                    id="edit-tx-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-900"
                  />
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label htmlFor="edit-tx-notes" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="edit-tx-notes"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button
                  id="cancel-edit-btn"
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-edit-tx-btn"
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
