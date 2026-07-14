/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  UserRole,
  UserStatus,
  Wallet,
  Category,
  Transaction,
  TransactionType,
  TransactionStatus,
  AuditLog,
  SystemSettings
} from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Simple deterministic password hash for browser and server environment to align with Google Sheets
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'mock-hash-' + Math.abs(hash).toString(16);
}

export interface DBStructure {
  users: User[];
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  lastUpdated?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  allowUserRegistration: false,
  maintenanceMode: false,
  defaultCurrency: 'INR',
  backupFrequency: 'Daily',
  googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbxkSZsrgVBi3Sj5t3sOXfnKfgo-ML9qx-X93_7Lfc-y1htGOPJ6jeWKYRnH5at4Ck0/exec'
};

// Seed initial data
function generateSeedData(): DBStructure {
  const adminId = 'u-admin';
  const user1Id = 'u-user1';
  const user2Id = 'u-user2';

  const users: User[] = [
    {
      id: adminId,
      email: 'admin@ff.com',
      passwordHash: hashPassword('admin123'),
      name: 'System Admin',
      displayName: 'Administrator',
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
      createdDate: new Date('2026-01-01').toISOString()
    },
    {
      id: user1Id,
      email: 'user1@ff.com',
      passwordHash: hashPassword('user123'),
      name: 'Rohan Sharma',
      displayName: 'Rohan',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdDate: new Date('2026-05-15').toISOString()
    },
    {
      id: user2Id,
      email: 'user2@ff.com',
      passwordHash: hashPassword('user123'),
      name: 'Priya Patel',
      displayName: 'Priya',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      createdDate: new Date('2026-06-01').toISOString()
    }
  ];

  // Wallets setup
  const wallets: Wallet[] = [
    // User 1 - Rohan - Personal
    { id: 'w-rohan-cash', userId: user1Id, accountId: 'personal', name: 'Cash', isDefault: true },
    { id: 'w-rohan-sbi', userId: user1Id, accountId: 'personal', name: 'SBI Bank', isDefault: false },
    { id: 'w-rohan-hdfc', userId: user1Id, accountId: 'personal', name: 'HDFC Bank', isDefault: false },
    // User 1 - Rohan - Professional
    { id: 'w-rohan-icici', userId: user1Id, accountId: 'professional', name: 'ICICI Current', isDefault: true },
    { id: 'w-rohan-axis', userId: user1Id, accountId: 'professional', name: 'Axis Business', isDefault: false },

    // User 2 - Priya - Personal
    { id: 'w-priya-cash', userId: user2Id, accountId: 'personal', name: 'Cash', isDefault: true },
    { id: 'w-priya-hdfc', userId: user2Id, accountId: 'personal', name: 'HDFC Savings', isDefault: false },
    // User 2 - Priya - Professional
    { id: 'w-priya-sbi-current', userId: user2Id, accountId: 'professional', name: 'SBI Current', isDefault: true }
  ];

  // Categories setup
  const categories: Category[] = [
    // User 1 - Rohan - Personal - Expense
    { id: 'c-rohan-p-food', userId: user1Id, accountId: 'personal', name: 'Food & Dining', type: TransactionType.EXPENSE },
    { id: 'c-rohan-p-fuel', userId: user1Id, accountId: 'personal', name: 'Fuel & Travel', type: TransactionType.EXPENSE },
    { id: 'c-rohan-p-shop', userId: user1Id, accountId: 'personal', name: 'Shopping', type: TransactionType.EXPENSE },
    { id: 'c-rohan-p-med', userId: user1Id, accountId: 'personal', name: 'Medical', type: TransactionType.EXPENSE },
    // User 1 - Rohan - Personal - Income
    { id: 'c-rohan-p-sal', userId: user1Id, accountId: 'personal', name: 'Salary', type: TransactionType.INCOME },
    { id: 'c-rohan-p-inv', userId: user1Id, accountId: 'personal', name: 'Investments', type: TransactionType.INCOME },

    // User 1 - Rohan - Professional - Expense
    { id: 'c-rohan-b-office', userId: user1Id, accountId: 'professional', name: 'Office Rent', type: TransactionType.EXPENSE },
    { id: 'c-rohan-b-salary', userId: user1Id, accountId: 'professional', name: 'Employee Salary', type: TransactionType.EXPENSE },
    { id: 'c-rohan-b-marketing', userId: user1Id, accountId: 'professional', name: 'Marketing', type: TransactionType.EXPENSE },
    { id: 'c-rohan-b-travel', userId: user1Id, accountId: 'professional', name: 'Business Travel', type: TransactionType.EXPENSE },
    // User 1 - Rohan - Professional - Income
    { id: 'c-rohan-b-sales', userId: user1Id, accountId: 'professional', name: 'Client Sales', type: TransactionType.INCOME },
    { id: 'c-rohan-b-retainer', userId: user1Id, accountId: 'professional', name: 'Retainers', type: TransactionType.INCOME },

    // User 2 - Priya - Personal - Expense
    { id: 'c-priya-p-food', userId: user2Id, accountId: 'personal', name: 'Food', type: TransactionType.EXPENSE },
    { id: 'c-priya-p-rent', userId: user2Id, accountId: 'personal', name: 'Rent', type: TransactionType.EXPENSE },
    // User 2 - Priya - Personal - Income
    { id: 'c-priya-p-freelance', userId: user2Id, accountId: 'personal', name: 'Freelance', type: TransactionType.INCOME }
  ];

  // Transactions setup (Realistic sample transactions)
  const transactions: Transaction[] = [
    // Rohan - Personal - Active
    {
      id: 'tx-1',
      userId: user1Id,
      accountId: 'personal',
      type: TransactionType.INCOME,
      date: '2026-06-01',
      categoryId: 'c-rohan-p-sal',
      walletId: 'w-rohan-hdfc',
      amount: 95000,
      notes: 'Monthly Corporate Salary Credit',
      status: TransactionStatus.ACTIVE,
      createdDate: new Date('2026-06-01T10:00:00Z').toISOString(),
      updatedDate: new Date('2026-06-01T10:00:00Z').toISOString()
    },
    {
      id: 'tx-2',
      userId: user1Id,
      accountId: 'personal',
      type: TransactionType.EXPENSE,
      date: '2026-06-02',
      categoryId: 'c-rohan-p-food',
      walletId: 'w-rohan-cash',
      amount: 1200,
      notes: 'Family dinner at Olive Garden',
      status: TransactionStatus.ACTIVE,
      createdDate: new Date('2026-06-02T20:30:00Z').toISOString(),
      updatedDate: new Date('2026-06-02T20:30:00Z').toISOString()
    },
    {
      id: 'tx-3',
      userId: user1Id,
      accountId: 'personal',
      type: TransactionType.EXPENSE,
      date: '2026-06-03',
      categoryId: 'c-rohan-p-fuel',
      walletId: 'w-rohan-sbi',
      amount: 3500,
      notes: 'Car fuel refill full tank',
      status: TransactionStatus.ACTIVE,
      createdDate: new Date('2026-06-03T11:15:00Z').toISOString(),
      updatedDate: new Date('2026-06-03T11:15:00Z').toISOString()
    },
    {
      id: 'tx-4',
      userId: user1Id,
      accountId: 'personal',
      type: TransactionType.EXPENSE,
      date: '2026-06-05',
      categoryId: 'c-rohan-p-shop',
      walletId: 'w-rohan-hdfc',
      amount: 12500,
      notes: 'Noise-cancelling headphones',
      status: TransactionStatus.ACTIVE,
      createdDate: new Date('2026-06-05T15:45:00Z').toISOString(),
      updatedDate: new Date('2026-06-05T15:45:00Z').toISOString()
    },
    // Rohan - Personal - Soft Deleted (for testing)
    {
      id: 'tx-del-1',
      userId: user1Id,
      accountId: 'personal',
      type: TransactionType.EXPENSE,
      date: '2026-06-06',
      categoryId: 'c-rohan-p-food',
      walletId: 'w-rohan-cash',
      amount: 500,
      notes: 'Accidental double entry cafe payment',
      status: TransactionStatus.DELETED,
      createdDate: new Date('2026-06-06T08:10:00Z').toISOString(),
      updatedDate: new Date('2026-06-06T08:15:00Z').toISOString()
    },

    // Rohan - Professional - Active
    {
      id: 'tx-5',
      userId: user1Id,
      accountId: 'professional',
      type: TransactionType.INCOME,
      date: '2026-06-01',
      categoryId: 'c-rohan-b-sales',
      walletId: 'w-rohan-icici',
      amount: 250000,
      notes: 'Client payment - TechCorp Software Project Delivery',
      status: TransactionStatus.ACTIVE,
      createdDate: new Date('2026-06-01T09:00:00Z').toISOString(),
      updatedDate: new Date('2026-06-01T09:00:00Z').toISOString()
    },
    {
      id: 'tx-6',
      userId: user1Id,
      accountId: 'professional',
      type: TransactionType.EXPENSE,
      date: '2026-06-05',
      categoryId: 'c-rohan-b-office',
      walletId: 'w-rohan-icici',
      amount: 45000,
      notes: 'Office rent for Sector-62 space',
      status: TransactionStatus.ACTIVE,
      createdDate: new Date('2026-06-05T10:00:00Z').toISOString(),
      updatedDate: new Date('2026-06-05T10:00:00Z').toISOString()
    },
    {
      id: 'tx-7',
      userId: user1Id,
      accountId: 'professional',
      type: TransactionType.EXPENSE,
      date: '2026-06-06',
      categoryId: 'c-rohan-b-marketing',
      walletId: 'w-rohan-axis',
      amount: 30000,
      notes: 'Google Ads & LinkedIn campaign spending',
      status: TransactionStatus.ACTIVE,
      createdDate: new Date('2026-06-06T18:20:00Z').toISOString(),
      updatedDate: new Date('2026-06-06T18:20:00Z').toISOString()
    }
  ];

  // Audit Logs
  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: new Date('2026-05-15T12:00:00Z').toISOString(),
      userId: adminId,
      userEmail: 'admin@ff.com',
      action: 'USER_CREATED',
      description: 'Created user Rohan Sharma (user1@ff.com)'
    },
    {
      id: 'log-2',
      timestamp: new Date('2026-06-01T09:00:00Z').toISOString(),
      userId: adminId,
      userEmail: 'admin@ff.com',
      action: 'SYSTEM_SETTINGS_UPDATE',
      description: 'Configured default system currency to INR'
    }
  ];

  return {
    users,
    wallets,
    categories,
    transactions,
    auditLogs,
    settings: DEFAULT_SETTINGS
  };
}

export class DBManager {
  static load(): DBStructure {
    if (!fs.existsSync(DB_FILE)) {
      const initial = generateSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading DB, resetting to defaults:', err);
      const initial = generateSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
  }

  private static lastPullTime = 0;
  private static PULL_THROTTLE_MS = 15000; // 15 seconds

  static getSyncUrl(): string | undefined {
    const db = this.load();
    const url = (db.settings as any)?.googleSheetsUrl || process.env.GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbxkSZsrgVBi3Sj5t3sOXfnKfgo-ML9qx-X93_7Lfc-y1htGOPJ6jeWKYRnH5at4Ck0/exec';
    if (!url) return undefined;
    const trimmed = url.trim();
    if (trimmed.includes('docs.google.com/spreadsheets')) {
      console.log(`[Sync URL Check] Configured URL is a standard Google Spreadsheet. Skipping sync. (URL: "${trimmed}")`);
      return undefined;
    }
    return trimmed;
  }

  static save(data: DBStructure, isImport = false) {
    if (!isImport) {
      data.lastUpdated = new Date().toISOString();
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');

    // Auto-background push to Google Sheets if configured in settings or env fallback
    if (!isImport) {
      const syncUrl = this.getSyncUrl();
      if (syncUrl) {
        fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'sync', db: data })
        }).catch(err => {
          console.warn('Google Sheets background sync failed on server:', err);
        });
      }
    }
  }

  static mergeDatabases(localDb: DBStructure, remoteDb: DBStructure): DBStructure {
    const localTime = localDb.lastUpdated ? new Date(localDb.lastUpdated).getTime() : 0;
    const remoteTime = remoteDb.lastUpdated ? new Date(remoteDb.lastUpdated).getTime() : 0;

    const merged: DBStructure = {
      users: localDb.users ? [...localDb.users] : [],
      wallets: localDb.wallets ? [...localDb.wallets] : [],
      categories: localDb.categories ? [...localDb.categories] : [],
      transactions: localDb.transactions ? [...localDb.transactions] : [],
      auditLogs: localDb.auditLogs ? [...localDb.auditLogs] : [],
      settings: { ...localDb.settings, ...remoteDb.settings },
      lastUpdated: new Date().toISOString()
    };

    if (remoteTime > localTime) {
      console.log(`[Sync Merge] Remote is newer (${new Date(remoteTime).toISOString()} > ${new Date(localTime).toISOString()}). Overwriting users, wallets, and categories with remote state.`);
      // Remote is strictly newer, overwrite administrative structures with remote's state
      // to correctly preserve any deletions done on remote.
      if (remoteDb.users && Array.isArray(remoteDb.users)) {
        merged.users = [...remoteDb.users];
      }
      if (remoteDb.wallets && Array.isArray(remoteDb.wallets)) {
        merged.wallets = [...remoteDb.wallets];
      }
      if (remoteDb.categories && Array.isArray(remoteDb.categories)) {
        merged.categories = [...remoteDb.categories];
      }
    } else {
      console.log(`[Sync Merge] Local is newer or equal (${new Date(localTime).toISOString()} >= ${new Date(remoteTime).toISOString()}). Keeping local users, wallets, and categories.`);
      // Local is newer or timestamps are equal, keep local administrative structures.
      // We don't merge/revive deleted items from remote since local is newer or equal.
    }

    // Merge transactions
    if (remoteDb && remoteDb.transactions && Array.isArray(remoteDb.transactions)) {
      for (const rTx of remoteDb.transactions) {
        const idx = merged.transactions.findIndex(t => t.id === rTx.id);
        if (idx === -1) {
          // If the transaction is active, merge it. If it was deleted on the newer side, 
          // we should respect that deletion. But since we have soft-deleted status,
          // it's safer to merge it unless it is already deleted.
          merged.transactions.push(rTx);
        } else {
          const lTx = merged.transactions[idx];
          const localTxTime = lTx.updatedDate ? new Date(lTx.updatedDate).getTime() : 0;
          const remoteTxTime = rTx.updatedDate ? new Date(rTx.updatedDate).getTime() : 0;
          if (remoteTxTime > localTxTime) {
            merged.transactions[idx] = rTx;
          }
        }
      }
    }

    // Merge audit logs
    if (remoteDb && remoteDb.auditLogs && Array.isArray(remoteDb.auditLogs)) {
      for (const rLog of remoteDb.auditLogs) {
        const idx = merged.auditLogs.findIndex(l => l.id === rLog.id);
        if (idx === -1) {
          merged.auditLogs.push(rLog);
        }
      }
    }

    return merged;
  }

  static importDatabase(db: DBStructure) {
    if (db && typeof db === 'object') {
      const localDb = this.load();
      const mergedDb = this.mergeDatabases(localDb, db);

      const currentSyncUrl = this.getSyncUrl();
      if (currentSyncUrl) {
        if (!mergedDb.settings) {
          mergedDb.settings = {
            allowUserRegistration: true,
            maintenanceMode: false,
            defaultCurrency: 'USD',
            backupFrequency: 'daily',
            googleSheetsUrl: currentSyncUrl
          };
        } else {
          mergedDb.settings.googleSheetsUrl = currentSyncUrl;
        }
      }
      this.save(mergedDb, true);

      // Immediately push the merged, unified database back to Google Sheets
      // so that all devices/clients see the same merged state instantly!
      if (currentSyncUrl) {
        this.pushToGoogleSheets(currentSyncUrl).then((success) => {
          if (success) {
            console.log('[Sync] Successfully pushed unified merged database to Google Sheets.');
          } else {
            console.warn('[Sync] Google Sheets push of merged database failed.');
          }
        }).catch(err => {
          console.warn('[Sync] Google Sheets push error:', err);
        });
      }
    }
  }

  static async pushToGoogleSheets(url: string): Promise<boolean> {
    const db = this.load();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync', db })
      });
      return response.ok;
    } catch (err) {
      console.error('Failed to push to Google Sheets on server:', err);
      return false;
    }
  }

  static async pullFromGoogleSheets(url: string, force = false): Promise<boolean> {
    const now = Date.now();
    if (!force && now - this.lastPullTime < this.PULL_THROTTLE_MS) {
      console.log('[Sync] Pull bypassed due to rate throttle (15s limit).');
      return true;
    }

    try {
      const targetUrl = url.includes('?') ? `${url}&action=get` : `${url}?action=get`;
      console.log(`[Sync Pull] Fetching from targetUrl: "${targetUrl}"`);
      const response = await fetch(targetUrl);
      console.log(`[Sync Pull] Response status: ${response.status} (${response.statusText})`);
      if (!response.ok) {
        console.warn(`[Sync Pull] Response not OK: ${response.status}`);
        return false;
      }
      const result = await response.json();
      console.log(`[Sync Pull] Response JSON success: ${result?.success}`);
      if (result && result.success && result.data) {
        const localDb = this.load();
        const remoteDb = result.data;
        const localTime = localDb.lastUpdated ? new Date(localDb.lastUpdated).getTime() : 0;
        const remoteTime = remoteDb.lastUpdated ? new Date(remoteDb.lastUpdated).getTime() : 0;

        if (localTime > 0 && remoteTime > 0 && localTime === remoteTime) {
          console.log('[Sync Server] Remote and local databases are identical. Skipping import.', {
            local: localDb.lastUpdated,
            remote: remoteDb.lastUpdated
          });
          this.lastPullTime = now;
          return true;
        }

        if (localTime > remoteTime) {
          console.log('[Sync Server] Local database is newer than remote. Skipping import and pushing local state to Google Sheets.', {
            local: localDb.lastUpdated,
            remote: remoteDb.lastUpdated
          });
          this.lastPullTime = now;
          // Trigger asynchronous background push to sync the newer local state to Google Sheets
          this.pushToGoogleSheets(url).catch(err => {
            console.warn('[Sync Server] Background push of newer local state failed:', err);
          });
          return true;
        }

        this.lastPullTime = now;
        this.importDatabase(remoteDb);
        return true;
      } else {
        console.warn(`[Sync Pull] Response format invalid or success=false:`, JSON.stringify(result));
      }
    } catch (err: any) {
      console.error('Failed to pull from Google Sheets on server. Error details:', err?.message || err, err?.stack || '');
    }
    return false;
  }

  static async pullFromGoogleSheetsOnStartup() {
    try {
      const syncUrl = this.getSyncUrl();
      if (syncUrl) {
        console.log('[Startup] Detected Google Sheets URL. Restoring database state...');
        
        let success = false;
        const maxRetries = 5;
        const delayMs = 2000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          success = await this.pullFromGoogleSheets(syncUrl, true); // Force pull on startup
          if (success) {
            break;
          }
          if (attempt < maxRetries) {
            console.warn(`[Startup] Google Sheets pull attempt ${attempt} failed. Retrying in ${delayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

        if (success) {
          console.log('[Startup] Successfully pulled latest database state from Google Sheets.');
          // Ensure it is saved back to db.settings in case it came from environment fallback
          const db = this.load();
          if ((db.settings as any)?.googleSheetsUrl !== syncUrl) {
            db.settings = { ...db.settings, googleSheetsUrl: syncUrl } as any;
            this.save(db);
          }
        } else {
          console.warn('[Startup] Google Sheets auto-pull failed. Operating with local file cache.');
        }
      }
    } catch (e) {
      console.warn('[Startup] Error during Google Sheets auto-pull startup restore:', e);
    }
  }

  // SYSTEM SETTINGS
  static getSettings(): SystemSettings {
    const db = this.load();
    return db.settings || DEFAULT_SETTINGS;
  }

  static updateSettings(settings: SystemSettings, updatedBy: { id: string; email: string }) {
    const db = this.load();
    db.settings = { ...db.settings, ...settings };
    this.save(db);
    this.logAction(updatedBy.id, updatedBy.email, 'SETTINGS_UPDATE', 'System parameters updated');
  }

  // AUDIT LOGS
  static getAuditLogs(): AuditLog[] {
    const db = this.load();
    return [...db.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static logAction(userId: string, userEmail: string, action: string, description: string) {
    const db = this.load();
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      userId,
      userEmail,
      action,
      description
    };
    db.auditLogs.push(log);
    this.save(db);
  }

  // USERS
  static getUsers(): Omit<User, 'passwordHash'>[] {
    const db = this.load();
    return db.users.map(({ passwordHash, ...user }) => user);
  }

  static findUserByEmail(email: string): User | undefined {
    const db = this.load();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static createUser(user: Omit<User, 'id' | 'createdDate' | 'passwordHash'>, plainPasswordHash: string, admin: { id: string; email: string }): User {
    const db = this.load();
    const existing = db.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const newUser: User = {
      ...user,
      id: `u-${Date.now()}`,
      passwordHash: hashPassword(plainPasswordHash),
      createdDate: new Date().toISOString()
    };

    db.users.push(newUser);

    // Create default categories & wallets for this user automatically to avoid empty accounts!
    const basicCategories = [
      { name: 'Food & Dining', type: TransactionType.EXPENSE, accountId: 'personal' },
      { name: 'Fuel & Travel', type: TransactionType.EXPENSE, accountId: 'personal' },
      { name: 'Shopping', type: TransactionType.EXPENSE, accountId: 'personal' },
      { name: 'Medical', type: TransactionType.EXPENSE, accountId: 'personal' },
      { name: 'Salary', type: TransactionType.INCOME, accountId: 'personal' },
      
      { name: 'Client Sales', type: TransactionType.INCOME, accountId: 'professional' },
      { name: 'Office Rent', type: TransactionType.EXPENSE, accountId: 'professional' },
      { name: 'Salary', type: TransactionType.EXPENSE, accountId: 'professional' },
      { name: 'Marketing', type: TransactionType.EXPENSE, accountId: 'professional' },
    ];

    basicCategories.forEach((cat, index) => {
      db.categories.push({
        id: `c-${newUser.id}-${cat.accountId}-${index}`,
        userId: newUser.id,
        accountId: cat.accountId as 'personal' | 'professional',
        name: cat.name,
        type: cat.type as TransactionType
      });
    });

    // Create default wallets
    db.wallets.push({
      id: `w-${newUser.id}-p-cash`,
      userId: newUser.id,
      accountId: 'personal',
      name: 'Cash',
      isDefault: true
    });
    db.wallets.push({
      id: `w-${newUser.id}-p-bank`,
      userId: newUser.id,
      accountId: 'personal',
      name: 'Bank Account',
      isDefault: false
    });
    db.wallets.push({
      id: `w-${newUser.id}-b-current`,
      userId: newUser.id,
      accountId: 'professional',
      name: 'Business Account',
      isDefault: true
    });

    this.save(db);
    this.logAction(admin.id, admin.email, 'USER_CREATED', `Created user ${newUser.name} (${newUser.email})`);
    return newUser;
  }

  static updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'passwordHash' | 'createdDate'>>, admin: { id: string; email: string }) {
    const db = this.load();
    const index = db.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    const original = db.users[index];
    
    // Filter out undefined fields to prevent overwriting existing properties
    const cleanUpdates: any = {};
    for (const key of Object.keys(updates)) {
      if ((updates as any)[key] !== undefined) {
        cleanUpdates[key] = (updates as any)[key];
      }
    }

    db.users[index] = { ...original, ...cleanUpdates };
    this.save(db);

    this.logAction(
      admin.id,
      admin.email,
      'USER_UPDATED',
      `Updated details of ${original.name}. Status: ${cleanUpdates.status || original.status}, Role: ${cleanUpdates.role || original.role}`
    );
  }

  static factoryReset(admin: { id: string; email: string }) {
    const db = this.load();
    const currentAdmin = db.users.find(u => u.id === admin.id);
    const keptAdmin = currentAdmin || {
      id: admin.id,
      email: admin.email,
      passwordHash: hashPassword('admin123'),
      name: 'System Admin',
      displayName: 'Administrator',
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
      createdDate: new Date().toISOString()
    };

    // Wiping everything, keeping only this admin
    db.users = [keptAdmin];
    db.transactions = [];
    db.wallets = [
      { id: `w-${keptAdmin.id}-p-default`, userId: keptAdmin.id, accountId: 'personal', name: 'Cash', isDefault: true },
      { id: `w-${keptAdmin.id}-b-default`, userId: keptAdmin.id, accountId: 'professional', name: 'Business Account', isDefault: true }
    ];
    db.categories = [
      { id: `c-${keptAdmin.id}-p-food`, userId: keptAdmin.id, accountId: 'personal', name: 'Food & Dining', type: TransactionType.EXPENSE },
      { id: `c-${keptAdmin.id}-p-shop`, userId: keptAdmin.id, accountId: 'personal', name: 'Shopping', type: TransactionType.EXPENSE },
      { id: `c-${keptAdmin.id}-p-sal`, userId: keptAdmin.id, accountId: 'personal', name: 'Salary', type: TransactionType.INCOME },
      { id: `c-${keptAdmin.id}-b-rent`, userId: keptAdmin.id, accountId: 'professional', name: 'Rent', type: TransactionType.EXPENSE },
      { id: `c-${keptAdmin.id}-b-sales`, userId: keptAdmin.id, accountId: 'professional', name: 'Sales/Revenue', type: TransactionType.INCOME }
    ];
    db.auditLogs = [
      {
        id: `log-${crypto.randomBytes(8).toString('hex')}`,
        timestamp: new Date().toISOString(),
        userId: keptAdmin.id,
        userEmail: keptAdmin.email,
        action: 'FACTORY_RESET',
        description: 'Initiated full system wipe. Erased all user records, wallets, custom categories, and logs.'
      }
    ];
    db.settings = { ...DEFAULT_SETTINGS };

    this.save(db);
  }

  static deleteUser(userId: string, admin: { id: string; email: string }) {
    if (userId === admin.id) {
      throw new Error('You cannot delete your own administrator account.');
    }

    const db = this.load();
    const index = db.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    const targetUser = db.users[index];

    // Cascade delete user data
    db.users.splice(index, 1);
    db.transactions = db.transactions.filter(t => t.userId !== userId);
    db.wallets = db.wallets.filter(w => w.userId !== userId);
    db.categories = db.categories.filter(c => c.userId !== userId);

    this.save(db);
    this.logAction(
      admin.id,
      admin.email,
      'USER_DELETED',
      `Permanently deleted user "${targetUser.name}" (${targetUser.email}) and all associated records.`
    );
  }

  static resetPassword(userId: string, newPasswordPlain: string, admin: { id: string; email: string }) {
    const db = this.load();
    const index = db.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    db.users[index].passwordHash = hashPassword(newPasswordPlain);
    this.save(db);

    this.logAction(
      admin.id,
      admin.email,
      'PASSWORD_RESET',
      `Password reset performed for user ${db.users[index].name} (${db.users[index].email})`
    );
  }

  // WALLETS
  static getWallets(userId: string, accountId: 'personal' | 'professional'): Wallet[] {
    const db = this.load();
    return db.wallets.filter(w => w.userId === userId && w.accountId === accountId);
  }

  static manageWallet(walletId: string, name: string, isDefault: boolean, admin: { id: string; email: string }) {
    const db = this.load();
    const index = db.wallets.findIndex(w => w.id === walletId);
    if (index === -1) throw new Error('Wallet not found');

    const wallet = db.wallets[index];
    wallet.name = name;

    if (isDefault) {
      // Unset previous default wallet for this user/account
      db.wallets.forEach(w => {
        if (w.userId === wallet.userId && w.accountId === wallet.accountId) {
          w.isDefault = false;
        }
      });
      wallet.isDefault = true;
    }

    this.save(db);
    this.logAction(admin.id, admin.email, 'WALLET_MODIFIED', `Modified wallet ${wallet.name} (ID: ${walletId})`);
  }

  // CATEGORIES
  static getCategories(userId: string, accountId: 'personal' | 'professional'): Category[] {
    const db = this.load();
    return db.categories.filter(c => c.userId === userId && c.accountId === accountId);
  }

  static manageCategory(categoryId: string, name: string, admin: { id: string; email: string }, targetAmount?: number) {
    const db = this.load();
    const index = db.categories.findIndex(c => c.id === categoryId);
    if (index === -1) throw new Error('Category not found');

    const category = db.categories[index];
    category.name = name;
    category.targetAmount = targetAmount;
    this.save(db);

    this.logAction(admin.id, admin.email, 'CATEGORY_MODIFIED', `Modified category ${category.name} (ID: ${categoryId})`);
  }

  static addWallet(userId: string, accountId: 'personal' | 'professional', name: string, isDefault: boolean, admin: { id: string; email: string }): Wallet {
    const db = this.load();
    const newWallet: Wallet = {
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      accountId,
      name,
      isDefault: false
    };

    db.wallets.push(newWallet);

    if (isDefault) {
      db.wallets.forEach(w => {
        if (w.userId === userId && w.accountId === accountId) {
          w.isDefault = false;
        }
      });
      newWallet.isDefault = true;
    } else {
      const hasOther = db.wallets.some(w => w.userId === userId && w.accountId === accountId && w.id !== newWallet.id);
      if (!hasOther) {
        newWallet.isDefault = true;
      }
    }

    this.save(db);
    this.logAction(admin.id, admin.email, 'WALLET_CREATED', `Created wallet "${name}" for user ID ${userId} (${accountId})`);
    return newWallet;
  }

  static deleteWallet(walletId: string, admin: { id: string; email: string }) {
    const db = this.load();
    const index = db.wallets.findIndex(w => w.id === walletId);
    if (index === -1) throw new Error('Wallet not found');

    const wallet = db.wallets[index];

    const inUse = db.transactions.some(t => t.walletId === walletId && t.status === TransactionStatus.ACTIVE);
    if (inUse) {
      throw new Error('Cannot delete this wallet because it is currently linked to transactions.');
    }

    db.wallets.splice(index, 1);

    if (wallet.isDefault) {
      const remaining = db.wallets.find(w => w.userId === wallet.userId && w.accountId === wallet.accountId);
      if (remaining) {
        remaining.isDefault = true;
      }
    }

    this.save(db);
    this.logAction(admin.id, admin.email, 'WALLET_DELETED', `Deleted wallet "${wallet.name}" (ID: ${walletId})`);
  }

  static addCategory(userId: string, accountId: 'personal' | 'professional', name: string, type: TransactionType, admin: { id: string; email: string }, targetAmount?: number): Category {
    const db = this.load();
    const newCategory: Category = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      accountId,
      name,
      type,
      targetAmount
    };

    db.categories.push(newCategory);
    this.save(db);
    this.logAction(admin.id, admin.email, 'CATEGORY_CREATED', `Created category "${name}" (${type}) for user ID ${userId} (${accountId})`);
    return newCategory;
  }

  static deleteCategory(categoryId: string, admin: { id: string; email: string }) {
    const db = this.load();
    const index = db.categories.findIndex(c => c.id === categoryId);
    if (index === -1) throw new Error('Category not found');

    const category = db.categories[index];

    const inUse = db.transactions.some(t => t.categoryId === categoryId && t.status === TransactionStatus.ACTIVE);
    if (inUse) {
      throw new Error('Cannot delete this category because it is currently linked to transactions.');
    }

    db.categories.splice(index, 1);
    this.save(db);
    this.logAction(admin.id, admin.email, 'CATEGORY_DELETED', `Deleted category "${category.name}" (ID: ${categoryId})`);
  }

  // TRANSACTIONS
  static getTransactions(
    userId: string,
    accountId: 'personal' | 'professional',
    role: UserRole,
    filters: {
      search?: string;
      category?: string;
      wallet?: string;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      status?: TransactionStatus;
    } = {}
  ): Transaction[] {
    const db = this.load();
    let txs = db.transactions;

    // Normal users can only see their active transactions.
    // Admin can filter by status or see deleted transactions in their admin section.
    if (role === UserRole.USER) {
      txs = txs.filter(t => t.userId === userId && t.accountId === accountId && t.status === TransactionStatus.ACTIVE);
    } else {
      // Admin viewing user transactions
      txs = txs.filter(t => t.userId === userId && t.accountId === accountId);
    }

    if (filters.status) {
      txs = txs.filter(t => t.status === filters.status);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      txs = txs.filter(t => t.notes.toLowerCase().includes(s));
    }

    if (filters.category) {
      txs = txs.filter(t => t.categoryId === filters.category);
    }

    if (filters.wallet) {
      txs = txs.filter(t => t.walletId === filters.wallet);
    }

    if (filters.type) {
      txs = txs.filter(t => t.type === filters.type);
    }

    if (filters.startDate) {
      txs = txs.filter(t => t.date >= filters.startDate);
    }

    if (filters.endDate) {
      txs = txs.filter(t => t.date <= filters.endDate);
    }

    return txs.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
    });
  }

  static getDeletedTransactionsAdmin(): (Transaction & { userEmail: string; categoryName: string; walletName: string })[] {
    const db = this.load();
    const deletedTxs = db.transactions.filter(t => t.status === TransactionStatus.DELETED);

    return deletedTxs.map(t => {
      const user = db.users.find(u => u.id === t.userId);
      const cat = db.categories.find(c => c.id === t.categoryId);
      const wal = db.wallets.find(w => w.id === t.walletId);
      return {
        ...t,
        userEmail: user ? user.email : 'Unknown',
        categoryName: cat ? cat.name : 'Unknown',
        walletName: wal ? wal.name : 'Unknown'
      };
    }).sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
  }

  static createTransaction(tx: Omit<Transaction, 'id' | 'status' | 'createdDate' | 'updatedDate'>, email: string): Transaction {
    const db = this.load();

    // Verify wallet and category belong to user & account
    const wallet = db.wallets.find(w => w.id === tx.walletId && w.userId === tx.userId && w.accountId === tx.accountId);
    const category = db.categories.find(c => c.id === tx.categoryId && c.userId === tx.userId && c.accountId === tx.accountId);

    if (!wallet || !category) {
      throw new Error('Security Error: Invalid Wallet or Category mapping.');
    }

    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      status: TransactionStatus.ACTIVE,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };

    db.transactions.push(newTx);
    this.save(db);

    this.logAction(
      tx.userId,
      email,
      'TRANSACTION_CREATED',
      `Added ${tx.type} transaction of ${tx.amount} in category "${category.name}" (Wallet: ${wallet.name})`
    );

    return newTx;
  }

  static createSelfTransfer(
    userId: string,
    accountId: 'personal' | 'professional',
    sourceWalletId: string,
    destWalletId: string,
    amount: number,
    date: string,
    notes: string,
    email: string
  ) {
    const db = this.load();

    // Find or create "Self Transfer" category for both expense and income
    let expenseCat = db.categories.find(c => c.userId === userId && c.accountId === accountId && c.type === TransactionType.EXPENSE && c.name.toLowerCase() === 'self transfer');
    if (!expenseCat) {
      expenseCat = this.addCategory(userId, accountId, 'Self Transfer', TransactionType.EXPENSE, { id: userId, email });
    }

    let incomeCat = db.categories.find(c => c.userId === userId && c.accountId === accountId && c.type === TransactionType.INCOME && c.name.toLowerCase() === 'self transfer');
    if (!incomeCat) {
      incomeCat = this.addCategory(userId, accountId, 'Self Transfer', TransactionType.INCOME, { id: userId, email });
    }

    // Create Expense Transaction (Source Wallet)
    const expenseTx = this.createTransaction({
      userId,
      accountId,
      type: TransactionType.EXPENSE,
      date,
      categoryId: expenseCat.id,
      walletId: sourceWalletId,
      amount,
      notes: notes ? `${notes} (Self Transfer Out)` : 'Self Transfer Out'
    }, email);

    // Create Income Transaction (Destination Wallet)
    const incomeTx = this.createTransaction({
      userId,
      accountId,
      type: TransactionType.INCOME,
      date,
      categoryId: incomeCat.id,
      walletId: destWalletId,
      amount,
      notes: notes ? `${notes} (Self Transfer In)` : 'Self Transfer In'
    }, email);

    return { expenseTx, incomeTx };
  }

  static createUserTransfer(
    sourceUserId: string,
    sourceAccountId: 'personal' | 'professional',
    sourceWalletId: string,
    destUserId: string,
    destAccountId: 'personal' | 'professional',
    destWalletId: string,
    amount: number,
    date: string,
    notes: string,
    sourceEmail: string,
    destEmail: string
  ) {
    const db = this.load();

    // 1. Find or create Category for Source User
    let sourceCat = db.categories.find(c => c.userId === sourceUserId && c.accountId === sourceAccountId && c.type === TransactionType.EXPENSE && c.name.toLowerCase() === 'user transfer');
    if (!sourceCat) {
      sourceCat = this.addCategory(sourceUserId, sourceAccountId, 'User Transfer', TransactionType.EXPENSE, { id: sourceUserId, email: sourceEmail });
    }

    // 2. Find or create Category for Dest User
    let destCat = db.categories.find(c => c.userId === destUserId && c.accountId === destAccountId && c.type === TransactionType.INCOME && c.name.toLowerCase() === 'user transfer');
    if (!destCat) {
      destCat = this.addCategory(destUserId, destAccountId, 'User Transfer', TransactionType.INCOME, { id: destUserId, email: destEmail });
    }

    // Create Expense for Source User
    const sourceTx = this.createTransaction({
      userId: sourceUserId,
      accountId: sourceAccountId,
      type: TransactionType.EXPENSE,
      date,
      categoryId: sourceCat.id,
      walletId: sourceWalletId,
      amount,
      notes: notes ? `${notes} (Transfer to ${destEmail})` : `Transfer to ${destEmail}`
    }, sourceEmail);

    // Create Income for Dest User
    const destTx = this.createTransaction({
      userId: destUserId,
      accountId: destAccountId,
      type: TransactionType.INCOME,
      date,
      categoryId: destCat.id,
      walletId: destWalletId,
      amount,
      notes: notes ? `${notes} (Transfer from ${sourceEmail})` : `Transfer from ${sourceEmail}`
    }, destEmail);

    return { sourceTx, destTx };
  }

  static updateTransaction(
    txId: string,
    updates: Partial<Omit<Transaction, 'id' | 'userId' | 'accountId' | 'status' | 'createdDate' | 'updatedDate'>>,
    userId: string,
    email: string,
    role: UserRole
  ): Transaction {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const original = db.transactions[index];

    // Security check: must belong to user, unless Admin
    if (original.userId !== userId && role !== UserRole.ADMIN) {
      throw new Error('Access denied: You do not own this transaction.');
    }

    // Validate wallet and category if updated
    const finalWalletId = updates.walletId || original.walletId;
    const finalCategoryId = updates.categoryId || original.categoryId;

    const wallet = db.wallets.find(w => w.id === finalWalletId && w.userId === original.userId && w.accountId === original.accountId);
    const category = db.categories.find(c => c.id === finalCategoryId && c.userId === original.userId && c.accountId === original.accountId);

    if (!wallet || !category) {
      throw new Error('Security Error: Invalid Wallet or Category mapping.');
    }

    const updatedTx: Transaction = {
      ...original,
      ...updates,
      updatedDate: new Date().toISOString()
    };

    db.transactions[index] = updatedTx;
    this.save(db);

    this.logAction(
      userId,
      email,
      'TRANSACTION_UPDATED',
      `Updated transaction ID: ${txId}. Net amount change to: ${updatedTx.amount}`
    );

    return updatedTx;
  }

  static softDeleteTransaction(txId: string, userId: string, email: string, role: UserRole) {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const tx = db.transactions[index];

    // Security Check: must belong to user, unless Admin
    if (tx.userId !== userId && role !== UserRole.ADMIN) {
      throw new Error('Access denied: You do not own this transaction.');
    }

    tx.status = TransactionStatus.DELETED;
    tx.updatedDate = new Date().toISOString();
    this.save(db);

    this.logAction(
      userId,
      email,
      'TRANSACTION_DELETED',
      `Soft deleted ${tx.type} transaction of ${tx.amount} (Category ID: ${tx.categoryId})`
    );
  }

  static restoreTransaction(txId: string, admin: { id: string; email: string }) {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const tx = db.transactions[index];
    tx.status = TransactionStatus.ACTIVE;
    tx.updatedDate = new Date().toISOString();
    this.save(db);

    this.logAction(
      admin.id,
      admin.email,
      'TRANSACTION_RESTORED',
      `Restored soft deleted transaction of ${tx.amount} for user ID ${tx.userId}`
    );
  }

  static deleteTransactionPermanently(txId: string, admin: { id: string; email: string }) {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const tx = db.transactions[index];
    db.transactions.splice(index, 1);
    this.save(db);

    this.logAction(
      admin.id,
      admin.email,
      'TRANSACTION_PERMANENTLY_DELETED',
      `Permanently deleted transaction of ${tx.amount} for user ID ${tx.userId}`
    );
  }

  // ANALYTICS & DASHBOARD STATS CALCULATOR
  static getDashboardStats(userId: string, accountId: 'personal' | 'professional') {
    const db = this.load();
    const userTxs = db.transactions.filter(
      t => t.userId === userId && t.accountId === accountId && t.status === TransactionStatus.ACTIVE
    );

    let totalIncome = 0;
    let totalExpense = 0;

    userTxs.forEach(t => {
      if (t.type === TransactionType.INCOME) {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    const netBalance = totalIncome - totalExpense;

    // Get wallet summaries
    const wallets = db.wallets.filter(w => w.userId === userId && w.accountId === accountId);
    const walletBalances = wallets.map(w => {
      // Calculate specific wallet balance
      let wIncome = 0;
      let wExpense = 0;
      userTxs.filter(t => t.walletId === w.id).forEach(t => {
        if (t.type === TransactionType.INCOME) wIncome += t.amount;
        else wExpense += t.amount;
      });
      return {
        id: w.id,
        name: w.name,
        isDefault: w.isDefault,
        balance: wIncome - wExpense
      };
    });

    // Get Category summaries
    const categories = db.categories.filter(c => c.userId === userId && c.accountId === accountId);
    const categoryExpenses = categories
      .filter(c => c.type === TransactionType.EXPENSE)
      .map(c => {
        let total = 0;
        userTxs.filter(t => t.categoryId === c.id).forEach(t => {
          total += t.amount;
        });
        return {
          id: c.id,
          name: c.name,
          total
        };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    // Recent Transactions
    const recentTxs = [...userTxs]
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
      })
      .slice(0, 10)
      .map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const wal = wallets.find(w => w.id === t.walletId);
        return {
          ...t,
          categoryName: cat ? cat.name : 'Unknown',
          walletName: wal ? wal.name : 'Unknown'
        };
      });

    // Monthly comparisons (Group by Month for the last 6 months)
    const monthlySummary: Record<string, { month: string; income: number; expense: number }> = {};
    
    // Seed last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlySummary[key] = { month: name, income: 0, expense: 0 };
    }

    userTxs.forEach(t => {
      const key = t.date.substring(0, 7); // YYYY-MM
      if (monthlySummary[key]) {
        if (t.type === TransactionType.INCOME) {
          monthlySummary[key].income += t.amount;
        } else {
          monthlySummary[key].expense += t.amount;
        }
      }
    });

    const currentMonthKey = new Date().toISOString().substring(0, 7);
    const categoryWarnings: any[] = [];
    const categoryBudgets: any[] = [];
    
    categories
      .filter(c => c.type === TransactionType.EXPENSE && c.targetAmount !== undefined && c.targetAmount > 0)
      .forEach(c => {
        let currentMonthSpent = 0;
        userTxs
          .filter(t => t.categoryId === c.id && t.type === TransactionType.EXPENSE && t.date.substring(0, 7) === currentMonthKey)
          .forEach(t => {
            currentMonthSpent += t.amount;
          });
        
        const percentage = Math.round((currentMonthSpent / c.targetAmount!) * 100);
        categoryBudgets.push({
          id: c.id,
          name: c.name,
          targetAmount: c.targetAmount,
          currentMonthSpent,
          percentage
        });

        if (currentMonthSpent > c.targetAmount!) {
          categoryWarnings.push({
            categoryId: c.id,
            categoryName: c.name,
            targetAmount: c.targetAmount,
            currentMonthSpent
          });
        }
      });

    const categoryIncomeBudgets: any[] = [];
    const categoryIncomeAchievements: any[] = [];

    categories
      .filter(c => c.type === TransactionType.INCOME && c.targetAmount !== undefined && c.targetAmount > 0)
      .forEach(c => {
        let currentMonthEarned = 0;
        userTxs
          .filter(t => t.categoryId === c.id && t.type === TransactionType.INCOME && t.date.substring(0, 7) === currentMonthKey)
          .forEach(t => {
            currentMonthEarned += t.amount;
          });
        
        const percentage = Math.round((currentMonthEarned / c.targetAmount!) * 100);
        categoryIncomeBudgets.push({
          id: c.id,
          name: c.name,
          targetAmount: c.targetAmount,
          currentMonthEarned,
          percentage
        });

        if (currentMonthEarned >= c.targetAmount!) {
          categoryIncomeAchievements.push({
            categoryId: c.id,
            categoryName: c.name,
            targetAmount: c.targetAmount,
            currentMonthEarned
          });
        }
      });

    return {
      totalIncome,
      totalExpense,
      netBalance,
      walletBalances,
      categoryExpenses,
      categoryWarnings,
      categoryBudgets,
      categoryIncomeBudgets,
      categoryIncomeAchievements,
      recentTransactions: recentTxs,
      chartData: Object.values(monthlySummary)
    };
  }

  static getAdminDashboardStats() {
    const db = this.load();
    const activeUsers = db.users.filter(u => u.status === UserStatus.ACTIVE);
    const disabledUsers = db.users.filter(u => u.status === UserStatus.DISABLED);

    const activeTxs = db.transactions.filter(t => t.status === TransactionStatus.ACTIVE);
    const deletedTxs = db.transactions.filter(t => t.status === TransactionStatus.DELETED);

    let totalIncome = 0;
    let totalExpense = 0;

    activeTxs.forEach(t => {
      if (t.type === TransactionType.INCOME) totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const latestLogs = [...db.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map(log => ({
        ...log,
        details: log.description
      }));

    return {
      totalUsers: db.users.length,
      activeUsersCount: activeUsers.length,
      disabledUsersCount: disabledUsers.length,
      totalTransactionsCount: db.transactions.length,
      activeTransactionsCount: activeTxs.length,
      deletedTransactionsCount: deletedTxs.length,
      totalSystemIncome: totalIncome,
      totalSystemExpense: totalExpense,
      totalSystemProfit: totalIncome - totalExpense,
      auditLogsCount: db.auditLogs.length,

      // Fields expected by AdminDashboardView
      totalWallets: db.wallets.length,
      totalTransactions: db.transactions.length,
      totalVolume: totalIncome + totalExpense,
      latestLogs,
      userBreakdown: {
        active: activeUsers.length,
        disabled: disabledUsers.length
      }
    };
  }
}
