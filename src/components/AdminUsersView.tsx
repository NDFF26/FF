/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { User, UserRole, UserStatus, Wallet, Category, TransactionType } from '../types';
import {
  Users,
  Plus,
  Edit,
  KeyRound,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  Loader2,
  Calendar,
  Briefcase,
  Building2,
  Trash2,
  Landmark,
  Check,
  Settings,
  ShieldAlert
} from 'lucide-react';

export default function AdminUsersView() {
  const [users, setUsers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.USER);
  const [newPassword, setNewPassword] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Reset Password Modal State
  const [resetUser, setResetUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // User Profile Setup Modal State
  const [profileUser, setProfileUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [profileAccountType, setProfileAccountType] = useState<'personal' | 'professional'>('personal');
  const [profileWallets, setProfileWallets] = useState<Wallet[]>([]);
  const [profileCategories, setProfileCategories] = useState<Category[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // New Wallet form state
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletDefault, setNewWalletDefault] = useState(false);
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  // New Category form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Inline editing state
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletName, setEditingWalletName] = useState('');
  const [editingWalletDefault, setEditingWalletDefault] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Custom Alert and Confirmation Modal States
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string; type?: 'info' | 'error' | 'success' } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const loadUserProfileData = async (userId: string, accountType: 'personal' | 'professional') => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const [wallets, categories] = await Promise.all([
        ApiClient.getAdminUserWallets(userId, accountType),
        ApiClient.getAdminUserCategories(userId, accountType)
      ]);
      setProfileWallets(wallets);
      setProfileCategories(categories);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to fetch profile settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (profileUser) {
      loadUserProfileData(profileUser.id, profileAccountType);
    }
  }, [profileUser, profileAccountType]);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUser || !newWalletName.trim()) return;
    setWalletSubmitting(true);
    setProfileError(null);
    try {
      await ApiClient.addAdminUserWallet(profileUser.id, {
        name: newWalletName.trim(),
        isDefault: newWalletDefault,
        accountId: profileAccountType
      });
      setNewWalletName('');
      setNewWalletDefault(false);
      await loadUserProfileData(profileUser.id, profileAccountType);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to add wallet/bank.');
    } finally {
      setWalletSubmitting(false);
    }
  };

  const handleUpdateWallet = async (walletId: string) => {
    if (!profileUser || !editingWalletName.trim()) return;
    setProfileError(null);
    try {
      await ApiClient.updateAdminUserWallet(profileUser.id, walletId, {
        name: editingWalletName.trim(),
        isDefault: editingWalletDefault
      });
      setEditingWalletId(null);
      await loadUserProfileData(profileUser.id, profileAccountType);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update wallet.');
    }
  };

  const handleDeleteWallet = (walletId: string) => {
    if (!profileUser) return;
    setCustomConfirm({
      title: 'Delete Wallet/Bank',
      message: 'Are you sure you want to delete this wallet/bank? This cannot be undone and will fail if the wallet is already linked to transactions.',
      confirmText: 'Delete Wallet',
      onConfirm: async () => {
        setProfileError(null);
        try {
          await ApiClient.deleteAdminUserWallet(profileUser.id, walletId);
          await loadUserProfileData(profileUser.id, profileAccountType);
        } catch (err: any) {
          setProfileError(err.message || 'Failed to delete wallet.');
        }
      }
    });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUser || !newCategoryName.trim()) return;
    setCategorySubmitting(true);
    setProfileError(null);
    try {
      await ApiClient.addAdminUserCategory(profileUser.id, {
        name: newCategoryName.trim(),
        type: newCategoryType,
        accountId: profileAccountType
      });
      setNewCategoryName('');
      await loadUserProfileData(profileUser.id, profileAccountType);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to add category.');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!profileUser || !editingCategoryName.trim()) return;
    setProfileError(null);
    try {
      await ApiClient.updateAdminUserCategory(profileUser.id, categoryId, {
        name: editingCategoryName.trim()
      });
      setEditingCategoryId(null);
      await loadUserProfileData(profileUser.id, profileAccountType);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update category.');
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!profileUser) return;
    setCustomConfirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This cannot be undone and will fail if the category is already linked to transactions.',
      confirmText: 'Delete Category',
      onConfirm: async () => {
        setProfileError(null);
        try {
          await ApiClient.deleteAdminUserCategory(profileUser.id, categoryId);
          await loadUserProfileData(profileUser.id, profileAccountType);
        } catch (err: any) {
          setProfileError(err.message || 'Failed to delete category.');
        }
      }
    });
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = (user: Omit<User, 'passwordHash'>) => {
    if (user.role === UserRole.ADMIN) {
      setCustomAlert({
        title: 'Action Prohibited',
        message: 'Administrative accounts cannot be disabled to prevent system lockouts.',
        type: 'error'
      });
      return;
    }

    const newStatus = user.status === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE;
    const confirmMessage = `Are you sure you want to ${
      newStatus === UserStatus.DISABLED ? 'disable' : 'enable'
    } user "${user.name}"?`;

    setCustomConfirm({
      title: `${newStatus === UserStatus.DISABLED ? 'Disable' : 'Enable'} User Account`,
      message: confirmMessage,
      confirmText: newStatus === UserStatus.DISABLED ? 'Disable Account' : 'Enable Account',
      onConfirm: async () => {
        try {
          await ApiClient.updateAdminUser(user.id, { status: newStatus });
          await loadUsers();
          setCustomAlert({
            title: 'Account Status Updated',
            message: `User "${user.name}" has been successfully ${newStatus === UserStatus.DISABLED ? 'disabled' : 'enabled'}.`,
            type: 'success'
          });
        } catch (err: any) {
          setCustomAlert({
            title: 'Update Failed',
            message: err.message || 'Failed to update user status.',
            type: 'error'
          });
        }
      }
    });
  };

  const handleDeleteUser = (user: Omit<User, 'passwordHash'>) => {
    if (user.role === UserRole.ADMIN) {
      setCustomAlert({
        title: 'Action Prohibited',
        message: 'Administrative accounts cannot be deleted to prevent system breakdown.',
        type: 'error'
      });
      return;
    }

    const confirmMessage = `Are you sure you want to permanently delete user "${user.name}" (${user.email})?\n\nWARNING: This will permanently delete all of their transactions, wallets, and categories. This action cannot be undone!`;
    
    setCustomConfirm({
      title: 'Delete User Account',
      message: confirmMessage,
      confirmText: 'Permanently Delete User',
      onConfirm: async () => {
        try {
          await ApiClient.deleteAdminUser(user.id);
          await loadUsers();
          setCustomAlert({
            title: 'User Deleted',
            message: `User "${user.name}" has been successfully deleted along with all their records.`,
            type: 'success'
          });
        } catch (err: any) {
          setCustomAlert({
            title: 'Delete Failed',
            message: err.message || 'Failed to delete user.',
            type: 'error'
          });
        }
      }
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newEmail || !newName || !newPassword) {
      setAddError('Please fill in all mandatory fields.');
      return;
    }

    setAddLoading(true);
    try {
      await ApiClient.createAdminUser({
        email: newEmail,
        name: newName,
        displayName: newDisplayName || newName,
        status: UserStatus.ACTIVE,
        role: newRole,
        password: newPassword
      });

      // Clear Form & Close
      setNewEmail('');
      setNewName('');
      setNewDisplayName('');
      setNewPassword('');
      setShowAddModal(false);

      await loadUsers();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create user.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;

    if (!resetPassword || resetPassword.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      await ApiClient.resetUserPassword(resetUser.id, resetPassword);
      setResetPassword('');
      setResetUser(null);
      setCustomAlert({
        title: 'Password Updated',
        message: 'Password has been successfully updated.',
        type: 'success'
      });
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            User Operations & Directory
          </h1>
          <p className="text-sm text-gray-500">
            System Administrator workspace to manage users, reset accounts, and control system roles.
          </p>
        </div>
        <button
          id="open-add-user-modal-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Error loading user list</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : (
        /* Users Table Card */
        <div id="users-directory-card" className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/70">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">User Info</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Registered Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {users.map((u) => {
                  const isActive = u.status === UserStatus.ACTIVE;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/40">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs">
                            {u.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400">"{u.displayName}"</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-500 font-mono text-xs select-all">
                        {u.email}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          {u.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400 font-mono text-xs">
                        {u.createdDate ? new Date(u.createdDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-right space-x-3">
                        <button
                          id={`configure-profile-for-${u.id}-btn`}
                          onClick={() => {
                            setProfileUser(u);
                            setProfileAccountType('personal');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Setup Profile
                        </button>
                        <button
                          id={`reset-pwd-for-${u.id}-btn`}
                          onClick={() => setResetUser(u)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset Password
                        </button>
                        {u.role !== UserRole.ADMIN ? (
                          <>
                            <button
                              id={`toggle-status-for-${u.id}-btn`}
                              onClick={() => handleToggleStatus(u)}
                              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                isActive ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'
                              }`}
                            >
                              {isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              id={`delete-user-${u.id}-btn`}
                              onClick={() => handleDeleteUser(u)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic select-none">Protected Admin</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showAddModal && (
        <div id="create-user-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full relative z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-indigo-50/40">
              <h2 className="text-lg font-bold text-gray-900">Create New System User</h2>
              <button
                id="close-add-user-modal-btn"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label htmlFor="user-email" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Email Address
                </label>
                <input
                  id="user-email"
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="user-fullname" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Full Name
                </label>
                <input
                  id="user-fullname"
                  type="text"
                  required
                  placeholder="E.g. Rohan Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="user-displayname" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Display Name
                </label>
                <input
                  id="user-displayname"
                  type="text"
                  placeholder="E.g. Rohan (Defaults to Full Name if blank)"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* User Role */}
                <div>
                  <label htmlFor="user-role" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    System Role
                  </label>
                  <select
                    id="user-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value={UserRole.USER}>Standard User</option>
                    <option value={UserRole.ADMIN}>Administrator</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="user-pwd" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Password
                  </label>
                  <input
                    id="user-pwd"
                    type="text"
                    required
                    placeholder="password123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex gap-3 justify-end">
                <button
                  id="cancel-create-user-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-create-user-btn"
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div id="reset-password-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => setResetUser(null)} />

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full relative z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-indigo-50/40">
              <h2 className="text-sm font-bold text-gray-900">Reset User Password</h2>
              <button
                id="close-reset-modal-btn"
                onClick={() => setResetUser(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs">
                  {resetError}
                </div>
              )}

              <p className="text-xs text-gray-500">
                You are performing a master password reset for <span className="font-semibold text-gray-900">{resetUser.name}</span> ({resetUser.email}).
              </p>

              <div>
                <label htmlFor="new-reset-pwd" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  New Password
                </label>
                <input
                  id="new-reset-pwd"
                  type="text"
                  required
                  placeholder="Enter new password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-50 flex gap-3 justify-end">
                <button
                  id="cancel-reset-btn"
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-reset-btn"
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Setup Modal */}
      {profileUser && (
        <div id="profile-setup-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => setProfileUser(null)} />

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-4xl w-full relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-amber-50/40 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-amber-500" />
                  Configure Profile & Financial Accounts
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set up user-specific banks, cash wallets, and custom transaction categories for <span className="font-semibold text-gray-700">{profileUser.name}</span> ({profileUser.email})
                </p>
              </div>
              <button
                id="close-profile-modal-btn"
                onClick={() => setProfileUser(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Selection Tabs */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                <button
                  id="tab-profile-personal"
                  onClick={() => setProfileAccountType('personal')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    profileAccountType === 'personal'
                      ? 'bg-white text-indigo-600 shadow-xs border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  Personal Profile Setup
                </button>
                <button
                  id="tab-profile-professional"
                  onClick={() => setProfileAccountType('professional')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    profileAccountType === 'professional'
                      ? 'bg-white text-indigo-600 shadow-xs border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Professional Profile Setup
                </button>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
                ADMIN ACCESS
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {profileError && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-xs text-gray-500">Loading user configuration data...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left Column: Wallets / Banks */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-indigo-600" />
                        Wallets & Bank Accounts
                      </h3>
                      <span className="text-xs text-gray-400">({profileWallets.length} active)</span>
                    </div>

                    {/* Add Wallet Form */}
                    <form onSubmit={handleAddWallet} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Add Wallet or Bank</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          id="new-wallet-name"
                          type="text"
                          required
                          placeholder="E.g. SBI Savings, Cash Wallet"
                          value={newWalletName}
                          onChange={(e) => setNewWalletName(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newWalletDefault}
                              onChange={(e) => setNewWalletDefault(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            Set as Default
                          </label>
                          <button
                            id="add-wallet-btn"
                            type="submit"
                            disabled={walletSubmitting}
                            className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            {walletSubmitting ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Wallets List */}
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {profileWallets.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">No wallets configured.</p>
                      ) : (
                        profileWallets.map(w => {
                          const isEditing = editingWalletId === w.id;
                          return (
                            <div key={w.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-100 transition-colors shadow-2xs">
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingWalletName}
                                    onChange={(e) => setEditingWalletName(e.target.value)}
                                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                                  />
                                  <label className="flex items-center gap-1 text-[11px] text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={editingWalletDefault}
                                      onChange={(e) => setEditingWalletDefault(e.target.checked)}
                                      className="rounded border-gray-300 h-3 w-3"
                                    />
                                    Default
                                  </label>
                                  <button
                                    onClick={() => handleUpdateWallet(w.id)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingWalletId(null)}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-800 text-xs">{w.name}</span>
                                    {w.isDefault && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingWalletId(w.id);
                                        setEditingWalletName(w.name);
                                        setEditingWalletDefault(w.isDefault);
                                      }}
                                      className="p-1 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 rounded transition-colors"
                                      title="Edit Wallet Name"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteWallet(w.id)}
                                      className="p-1 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded transition-colors"
                                      title="Delete Wallet"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Categories */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-emerald-600" />
                        Custom Transaction Categories
                      </h3>
                      <span className="text-xs text-gray-400">({profileCategories.length} active)</span>
                    </div>

                    {/* Add Category Form */}
                    <form onSubmit={handleAddCategory} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Add Category</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          id="new-category-name"
                          type="text"
                          required
                          placeholder="E.g. Food, Client Project"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={newCategoryType}
                            onChange={(e) => setNewCategoryType(e.target.value as TransactionType)}
                            className="block rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 bg-white"
                          >
                            <option value={TransactionType.EXPENSE}>Expense</option>
                            <option value={TransactionType.INCOME}>Income</option>
                          </select>
                          <button
                            id="add-category-btn"
                            type="submit"
                            disabled={categorySubmitting}
                            className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            {categorySubmitting ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Categories List (Grouped by type) */}
                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                      {profileCategories.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">No categories configured.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {/* Expense Group */}
                          <div>
                            <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">
                              Expense Categories
                            </div>
                            <div className="space-y-1.5">
                              {profileCategories.filter(c => c.type === TransactionType.EXPENSE).map(c => {
                                const isEditing = editingCategoryId === c.id;
                                return (
                                  <div key={c.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-lg hover:border-red-100 transition-colors shadow-2xs">
                                    {isEditing ? (
                                      <div className="flex-1 flex gap-2">
                                        <input
                                          type="text"
                                          value={editingCategoryName}
                                          onChange={(e) => setEditingCategoryName(e.target.value)}
                                          className="flex-1 rounded-lg border border-gray-300 px-2 py-0.5 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                                        />
                                        <button
                                          onClick={() => handleUpdateCategory(c.id)}
                                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingCategoryId(null)}
                                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-semibold"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-xs text-gray-800 font-medium">{c.name}</span>
                                        <div className="flex gap-1.5">
                                          <button
                                            onClick={() => {
                                              setEditingCategoryId(c.id);
                                              setEditingCategoryName(c.name);
                                            }}
                                            className="p-0.5 hover:bg-gray-50 text-gray-400 hover:text-indigo-600 rounded"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteCategory(c.id)}
                                            className="p-0.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Income Group */}
                          <div>
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">
                              Income Categories
                            </div>
                            <div className="space-y-1.5">
                              {profileCategories.filter(c => c.type === TransactionType.INCOME).map(c => {
                                const isEditing = editingCategoryId === c.id;
                                return (
                                  <div key={c.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-lg hover:border-emerald-100 transition-colors shadow-2xs">
                                    {isEditing ? (
                                      <div className="flex-1 flex gap-2">
                                        <input
                                          type="text"
                                          value={editingCategoryName}
                                          onChange={(e) => setEditingCategoryName(e.target.value)}
                                          className="flex-1 rounded-lg border border-gray-300 px-2 py-0.5 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                                        />
                                        <button
                                          onClick={() => handleUpdateCategory(c.id)}
                                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingCategoryId(null)}
                                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-semibold"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-xs text-gray-800 font-medium">{c.name}</span>
                                        <div className="flex gap-1.5">
                                          <button
                                            onClick={() => {
                                              setEditingCategoryId(c.id);
                                              setEditingCategoryName(c.name);
                                            }}
                                            className="p-0.5 hover:bg-gray-50 text-gray-400 hover:text-indigo-600 rounded"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteCategory(c.id)}
                                            className="p-0.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0 flex justify-end gap-3">
              <button
                id="close-profile-modal-footer-btn"
                onClick={() => setProfileUser(null)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {customConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => setCustomConfirm(null)} />
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full relative z-10 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-indigo-50/40">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">{customConfirm.title}</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{customConfirm.message}</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex justify-end gap-3">
              <button
                onClick={() => setCustomConfirm(null)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                {customConfirm.cancelText || 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const onConfirm = customConfirm.onConfirm;
                  setCustomConfirm(null);
                  await onConfirm();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-xs"
              >
                {customConfirm.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => setCustomAlert(null)} />
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full relative z-10 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-indigo-50/40">
              <AlertCircle className={`h-5 w-5 ${customAlert.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`} />
              <h2 className="text-lg font-bold text-gray-900">{customAlert.title}</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 leading-relaxed">{customAlert.message}</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex justify-end">
              <button
                onClick={() => setCustomAlert(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-xs"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
