/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Transaction,
  User,
  Wallet,
  Category,
  AuditLog,
  SystemSettings,
  TransactionType
} from '../types';
import { MockDatabase, hashPassword } from './mockDb';

const TOKEN_KEY = 'ems_auth_token';
const USER_KEY = 'ems_auth_user';
const ACCOUNT_KEY = 'ems_active_account';

// Automatically detect local-only environments like GitHub Pages (sub-folders or root domains)
export const isLocalMode = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('github.io') ||
  window.location.hostname.includes('github') ||
  localStorage.getItem('ems_force_local') === 'true'
);

export class ApiClient {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  static getActiveAccount(): 'personal' | 'professional' {
    return (localStorage.getItem(ACCOUNT_KEY) as 'personal' | 'professional') || 'personal';
  }

  static setActiveAccount(account: 'personal' | 'professional') {
    localStorage.setItem(ACCOUNT_KEY, account);
  }

  static setAuth(token: string, user: Omit<User, 'passwordHash'>) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  static clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  }

  static notifyUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('database_updated'));
    }
  }

  static getSavedUser(): Omit<User, 'passwordHash'> | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      if (user && user.email && user.email.endsWith('@ems.com')) {
        user.email = user.email.replace('@ems.com', '@ff.com');
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      return user;
    } catch {
      return null;
    }
  }

  private static async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${path}`;
    const headers = { ...this.getHeaders(), ...options.headers };
    
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      let message = 'An error occurred';
      try {
        const errorData = await response.json();
        message = errorData.error || message;
      } catch {
        // Fallback
      }
      if (response.status === 401) {
        this.clearAuth();
        // Redirect to login if on client
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth_session_expired'));
        }
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  // Auth Operations
  static async login(email: string, password: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    if (isLocalMode) {
      const hashedPassword = hashPassword(password);
      const data = MockDatabase.login(email, hashedPassword);
      this.setAuth(data.token, data.user);
      return data;
    }

    const data = await this.request<{ token: string; user: Omit<User, 'passwordHash'> }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  static async logout(): Promise<void> {
    if (isLocalMode) {
      const user = this.getSavedUser();
      if (user) {
        MockDatabase.logAction(user.id, user.email, 'LOGOUT', 'User logged out (local-mode)');
      }
      this.clearAuth();
      return;
    }

    try {
      await this.request<void>('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearAuth();
    }
  }

  static async getMe(): Promise<Omit<User, 'passwordHash'>> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      return MockDatabase.getUserById(saved.id);
    }

    return this.request<Omit<User, 'passwordHash'>>('/api/auth/me');
  }

  // Dashboard Stats
  static async getDashboardStats(accountId: 'personal' | 'professional'): Promise<any> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      return MockDatabase.getDashboardStats(saved.id, accountId);
    }

    return this.request<any>(`/api/dashboard?accountId=${accountId}`);
  }

  static async getAdminDashboardStats(): Promise<any> {
    if (isLocalMode) {
      return MockDatabase.getAdminDashboardStats();
    }

    return this.request<any>('/api/admin/dashboard');
  }

  // Wallets & Categories
  static async getWallets(accountId: 'personal' | 'professional'): Promise<Wallet[]> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      return MockDatabase.getWallets(saved.id, accountId);
    }

    return this.request<Wallet[]>(`/api/wallets?accountId=${accountId}`);
  }

  static async getCategories(accountId: 'personal' | 'professional'): Promise<Category[]> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      return MockDatabase.getCategories(saved.id, accountId);
    }

    return this.request<Category[]>(`/api/categories?accountId=${accountId}`);
  }

  // Transactions CRUD
  static async getTransactions(
    accountId: 'personal' | 'professional',
    filters: {
      search?: string;
      category?: string;
      wallet?: string;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<Transaction[]> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      return MockDatabase.getTransactions(saved.id, accountId, saved.role, filters);
    }

    let query = `accountId=${accountId}`;
    if (filters.search) query += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.category) query += `&category=${filters.category}`;
    if (filters.wallet) query += `&wallet=${filters.wallet}`;
    if (filters.type) query += `&type=${filters.type}`;
    if (filters.startDate) query += `&startDate=${filters.startDate}`;
    if (filters.endDate) query += `&endDate=${filters.endDate}`;

    return this.request<Transaction[]>(`/api/transactions?${query}`);
  }

  static async createTransaction(tx: {
    accountId: 'personal' | 'professional';
    type: TransactionType;
    date: string;
    categoryId: string;
    walletId: string;
    amount: number;
    notes: string;
  }): Promise<Transaction> {
    let result: Transaction;
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      result = MockDatabase.createTransaction(saved.id, saved.email, tx);
    } else {
      result = await this.request<Transaction>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(tx),
      });
    }
    this.notifyUpdate();
    return result;
  }

  static async updateTransaction(
    id: string,
    tx: {
      date: string;
      categoryId: string;
      walletId: string;
      amount: number;
      notes: string;
    }
  ): Promise<Transaction> {
    let result: Transaction;
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      result = MockDatabase.updateTransaction(id, saved.id, saved.email, saved.role, tx);
    } else {
      result = await this.request<Transaction>(`/api/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(tx),
      });
    }
    this.notifyUpdate();
    return result;
  }

  static async deleteTransaction(id: string): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.deleteTransaction(id, saved.id, saved.email, saved.role);
    } else {
      await this.request<void>(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
    }
    this.notifyUpdate();
  }

  // Transfers
  static async getTransferTargets(): Promise<any[]> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      return MockDatabase.getTransferTargets(saved.id);
    }

    return this.request<any[]>('/api/users/transfer-targets');
  }

  static async createSelfTransfer(data: {
    accountId: 'personal' | 'professional';
    sourceWalletId: string;
    destWalletId: string;
    amount: number;
    date: string;
    notes: string;
  }): Promise<any> {
    let result: any;
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      result = MockDatabase.createSelfTransfer(saved.id, saved.email, data);
    } else {
      result = await this.request<any>('/api/transactions/self-transfer', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
    this.notifyUpdate();
    return result;
  }

  static async createUserTransfer(data: {
    sourceAccountId: 'personal' | 'professional';
    sourceWalletId: string;
    destUserId: string;
    destAccountId: 'personal' | 'professional';
    destWalletId: string;
    amount: number;
    date: string;
    notes: string;
  }): Promise<any> {
    let result: any;
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      result = MockDatabase.createUserTransfer(saved.id, saved.email, data);
    } else {
      result = await this.request<any>('/api/transactions/user-transfer', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
    this.notifyUpdate();
    return result;
  }

  // Admin User CRUD
  static async getAdminUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    if (isLocalMode) {
      return MockDatabase.getAdminUsers();
    }

    return this.request<Omit<User, 'passwordHash'>[]>('/api/admin/users');
  }

  static async createAdminUser(user: Partial<User> & { password?: string }): Promise<User> {
    let result: User;
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      result = MockDatabase.createAdminUser(saved.id, saved.email, user);
    } else {
      result = await this.request<User>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    }
    this.notifyUpdate();
    return result;
  }

  static async updateAdminUser(id: string, updates: Partial<User>): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.updateAdminUser(saved.id, saved.email, id, updates);
    } else {
      await this.request<void>(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    }
    this.notifyUpdate();
  }

  static async deleteAdminUser(id: string): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.deleteAdminUser(saved.id, saved.email, id);
    } else {
      await this.request<void>(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
    }
    this.notifyUpdate();
  }

  static async factoryReset(): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.factoryReset(saved.id, saved.email);
      this.clearAuth();
      return;
    }

    await this.request<void>('/api/admin/factory-reset', {
      method: 'POST',
    });
  }

  static async resetUserPassword(id: string, newPasswordPlain: string): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.resetUserPassword(saved.id, saved.email, id, newPasswordPlain);
    } else {
      await this.request<void>(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPasswordPlain }),
      });
    }
    this.notifyUpdate();
  }

  // Admin Wallets & Categories Management
  static async getAdminUserWallets(userId: string, accountId: 'personal' | 'professional'): Promise<Wallet[]> {
    if (isLocalMode) {
      return MockDatabase.getAdminUserWallets(userId, accountId);
    }

    return this.request<Wallet[]>(`/api/admin/users/${userId}/wallets?accountId=${accountId}`);
  }

  static async addAdminUserWallet(userId: string, wallet: { name: string; isDefault: boolean; accountId: 'personal' | 'professional' }): Promise<Wallet> {
    let result: Wallet;
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      result = MockDatabase.addAdminUserWallet(saved.id, saved.email, userId, wallet);
    } else {
      result = await this.request<Wallet>(`/api/admin/users/${userId}/wallets`, {
        method: 'POST',
        body: JSON.stringify(wallet)
      });
    }
    this.notifyUpdate();
    return result;
  }

  static async updateAdminUserWallet(userId: string, walletId: string, wallet: { name: string; isDefault: boolean }): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.updateAdminUserWallet(saved.id, saved.email, userId, walletId, wallet);
    } else {
      await this.request<void>(`/api/admin/users/${userId}/wallets/${walletId}`, {
        method: 'PUT',
        body: JSON.stringify(wallet)
      });
    }
    this.notifyUpdate();
  }

  static async deleteAdminUserWallet(userId: string, walletId: string): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.deleteAdminUserWallet(saved.id, saved.email, userId, walletId);
    } else {
      await this.request<void>(`/api/admin/users/${userId}/wallets/${walletId}`, {
        method: 'DELETE'
      });
    }
    this.notifyUpdate();
  }

  static async getAdminUserCategories(userId: string, accountId: 'personal' | 'professional'): Promise<Category[]> {
    if (isLocalMode) {
      return MockDatabase.getAdminUserCategories(userId, accountId);
    }

    return this.request<Category[]>(`/api/admin/users/${userId}/categories?accountId=${accountId}`);
  }

  static async addAdminUserCategory(userId: string, category: { name: string; type: TransactionType; accountId: 'personal' | 'professional'; targetAmount?: number }): Promise<Category> {
    let result: Category;
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      result = MockDatabase.addAdminUserCategory(saved.id, saved.email, userId, category);
    } else {
      result = await this.request<Category>(`/api/admin/users/${userId}/categories`, {
        method: 'POST',
        body: JSON.stringify(category)
      });
    }
    this.notifyUpdate();
    return result;
  }

  static async updateAdminUserCategory(userId: string, categoryId: string, category: { name: string; targetAmount?: number }): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.updateAdminUserCategory(saved.id, saved.email, userId, categoryId, category);
    } else {
      await this.request<void>(`/api/admin/users/${userId}/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(category)
      });
    }
    this.notifyUpdate();
  }

  static async deleteAdminUserCategory(userId: string, categoryId: string): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.deleteAdminUserCategory(saved.id, saved.email, userId, categoryId);
    } else {
      await this.request<void>(`/api/admin/users/${userId}/categories/${categoryId}`, {
        method: 'DELETE'
      });
    }
    this.notifyUpdate();
  }

  // Admin Recycle Bin / Restore
  static async getDeletedTransactions(): Promise<(Transaction & { userEmail: string; categoryName: string; walletName: string })[]> {
    if (isLocalMode) {
      return MockDatabase.getDeletedTransactionsAdmin();
    }

    return this.request<(Transaction & { userEmail: string; categoryName: string; walletName: string })[]>('/api/admin/deleted-transactions');
  }

  static async restoreTransaction(id: string): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.restoreTransaction(saved.id, saved.email, id);
    } else {
      await this.request<void>(`/api/admin/restore-transaction/${id}`, {
        method: 'POST',
      });
    }
    this.notifyUpdate();
  }

  static async deleteTransactionPermanently(id: string): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.deleteTransactionPermanently(saved.id, saved.email, id);
    } else {
      await this.request<void>(`/api/admin/delete-transaction-permanent/${id}`, {
        method: 'DELETE',
      });
    }
    this.notifyUpdate();
  }

  // Admin System Logs & Settings
  static async getAuditLogs(): Promise<AuditLog[]> {
    if (isLocalMode) {
      return MockDatabase.getAuditLogs();
    }

    return this.request<AuditLog[]>('/api/admin/audit-logs');
  }

  static async getSystemSettings(): Promise<SystemSettings> {
    if (isLocalMode) {
      return MockDatabase.getSystemSettings();
    }

    return this.request<SystemSettings>('/api/admin/settings');
  }

  static async updateSystemSettings(settings: SystemSettings): Promise<void> {
    if (isLocalMode) {
      const saved = this.getSavedUser();
      if (!saved) throw new Error('Unauthorized');
      MockDatabase.updateSystemSettings(saved.id, saved.email, settings);
    } else {
      await this.request<void>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    }
    this.notifyUpdate();
  }

  // Google Sheets Cloud Sync Methods
  static getGoogleSheetsUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ff_google_sheets_sync_url') || 'https://script.google.com/macros/s/AKfycbxkSZsrgVBi3Sj5t3sOXfnKfgo-ML9qx-X93_7Lfc-y1htGOPJ6jeWKYRnH5at4Ck0/exec';
  }

  static setGoogleSheetsUrl(url: string | null) {
    if (typeof window === 'undefined') return;
    if (url) {
      localStorage.setItem('ff_google_sheets_sync_url', url);
    } else {
      localStorage.removeItem('ff_google_sheets_sync_url');
    }
  }

  static async getSyncUrlFromServer(): Promise<string | null> {
    if (isLocalMode) return null;
    try {
      const data = await this.request<{ googleSheetsUrl: string | null }>('/api/sheets/sync-url');
      return data.googleSheetsUrl;
    } catch (e) {
      console.warn('Failed to fetch sync URL from server', e);
      return null;
    }
  }

  static async pushToGoogleSheets(): Promise<void> {
    const url = this.getGoogleSheetsUrl();
    if (!url) throw new Error('No Google Sheets Sync URL configured.');

    if (isLocalMode) {
      const db = MockDatabase.load();
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors', // Avoid CORS preflight OPTIONS block and follow redirects
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify({ action: 'sync', db }),
        });
        
        // Clear dirty flag and update last sync time upon successful fetch submission
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ems_mock_database_dirty');
          localStorage.setItem('ems_last_sync_time', new Date().toISOString());
        }
      } catch (err: any) {
        throw new Error('Sync failed: ' + (err.message || err));
      }
    } else {
      const response = await fetch('/api/admin/sheets/push', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server sync failed with status: ' + response.status);
      }
    }
  }

  static async pullFromGoogleSheets(): Promise<boolean> {
    const url = this.getGoogleSheetsUrl();
    if (!url) return false;

    // Safety: In local mode, if the database is dirty, try to push first.
    // This ensures local changes made on mobile are NOT overwritten by older pulled data.
    if (isLocalMode && typeof window !== 'undefined' && localStorage.getItem('ems_mock_database_dirty') === 'true') {
      console.log('[Sync] Local database has unsynced changes. Attempting auto-push before pull...');
      try {
        await this.pushToGoogleSheets();
        console.log('[Sync] Auto-push succeeded. Safe to proceed with pull.');
      } catch (err) {
        console.warn('[Sync] Auto-push failed. Skipping pull to protect local modifications:', err);
        return false;
      }
    }

    try {
      if (isLocalMode) {
        const targetUrl = url.includes('?') ? `${url}&action=get&_t=${Date.now()}` : `${url}?action=get&_t=${Date.now()}`;
        const response = await fetch(targetUrl);
        if (!response.ok) return false;
        const result = await response.json();
        if (result && result.success && result.data) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('ems_last_sync_time', new Date().toISOString());
          }

          // Double-check dirty status before overwriting
          if (typeof window !== 'undefined' && localStorage.getItem('ems_mock_database_dirty') === 'true') {
            console.warn('[Sync] Aborted importing database: local database became dirty during pull.');
            return false;
          }
          
          const localDb = MockDatabase.load();
          const remoteDb = result.data;
          
          const localTime = localDb.lastUpdated ? new Date(localDb.lastUpdated).getTime() : 0;
          const remoteTime = remoteDb.lastUpdated ? new Date(remoteDb.lastUpdated).getTime() : 0;
          
          if (localTime > 0 && remoteTime <= localTime) {
            console.log('[Sync] Remote database is equal or older than local database. Skipping import to protect local data.', {
              local: localDb.lastUpdated,
              remote: remoteDb.lastUpdated
            });
            return false;
          }
          
          MockDatabase.importDatabase(remoteDb);
          return true;
        }
      } else {
        const response = await fetch('/api/admin/sheets/pull', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ url }),
        });
        if (response.ok) {
          const result = await response.json();
          return !!result.success;
        }
      }
    } catch (err) {
      console.error('Failed to pull from Google Sheets:', err);
    }
    return false;
  }

  static async bootstrapFromServer(url: string): Promise<boolean> {
    if (isLocalMode) {
      return this.pullFromGoogleSheets();
    }
    try {
      const response = await fetch('/api/sheets/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      if (response.ok) {
        const result = await response.json();
        return !!result.success;
      }
    } catch (err) {
      console.error('Failed to bootstrap server from Google Sheets:', err);
    }
    return false;
  }
}
