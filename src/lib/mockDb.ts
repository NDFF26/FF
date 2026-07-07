/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
} from '../types';

const STORAGE_KEY = 'ems_mock_database_v1';

// Simple deterministic password hash for browser environment
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
}

const DEFAULT_SETTINGS: SystemSettings = {
  allowUserRegistration: false,
  maintenanceMode: false,
  defaultCurrency: 'INR',
  backupFrequency: 'Daily',
  googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbxkSZsrgVBi3Sj5t3sOXfnKfgo-ML9qx-X93_7Lfc-y1htGOPJ6jeWKYRnH5at4Ck0/exec'
};

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

  const wallets: Wallet[] = [
    { id: 'w-rohan-cash', userId: user1Id, accountId: 'personal', name: 'Cash', isDefault: true },
    { id: 'w-rohan-sbi', userId: user1Id, accountId: 'personal', name: 'SBI Bank', isDefault: false },
    { id: 'w-rohan-hdfc', userId: user1Id, accountId: 'personal', name: 'HDFC Bank', isDefault: false },
    { id: 'w-rohan-icici', userId: user1Id, accountId: 'professional', name: 'ICICI Current', isDefault: true },
    { id: 'w-rohan-axis', userId: user1Id, accountId: 'professional', name: 'Axis Business', isDefault: false },
    { id: 'w-priya-cash', userId: user2Id, accountId: 'personal', name: 'Cash', isDefault: true },
    { id: 'w-priya-hdfc', userId: user2Id, accountId: 'personal', name: 'HDFC Savings', isDefault: false },
    { id: 'w-priya-sbi-current', userId: user2Id, accountId: 'professional', name: 'SBI Current', isDefault: true }
  ];

  const categories: Category[] = [
    { id: 'c-rohan-p-food', userId: user1Id, accountId: 'personal', name: 'Food & Dining', type: TransactionType.EXPENSE },
    { id: 'c-rohan-p-fuel', userId: user1Id, accountId: 'personal', name: 'Fuel & Travel', type: TransactionType.EXPENSE },
    { id: 'c-rohan-p-shop', userId: user1Id, accountId: 'personal', name: 'Shopping', type: TransactionType.EXPENSE },
    { id: 'c-rohan-p-med', userId: user1Id, accountId: 'personal', name: 'Medical', type: TransactionType.EXPENSE },
    { id: 'c-rohan-p-sal', userId: user1Id, accountId: 'personal', name: 'Salary', type: TransactionType.INCOME },
    { id: 'c-rohan-p-inv', userId: user1Id, accountId: 'personal', name: 'Investments', type: TransactionType.INCOME },
    { id: 'c-rohan-b-office', userId: user1Id, accountId: 'professional', name: 'Office Rent', type: TransactionType.EXPENSE },
    { id: 'c-rohan-b-salary', userId: user1Id, accountId: 'professional', name: 'Employee Salary', type: TransactionType.EXPENSE },
    { id: 'c-rohan-b-marketing', userId: user1Id, accountId: 'professional', name: 'Marketing', type: TransactionType.EXPENSE },
    { id: 'c-rohan-b-travel', userId: user1Id, accountId: 'professional', name: 'Business Travel', type: TransactionType.EXPENSE },
    { id: 'c-rohan-b-sales', userId: user1Id, accountId: 'professional', name: 'Client Sales', type: TransactionType.INCOME },
    { id: 'c-rohan-b-retainer', userId: user1Id, accountId: 'professional', name: 'Retainers', type: TransactionType.INCOME },
    { id: 'c-priya-p-food', userId: user2Id, accountId: 'personal', name: 'Food', type: TransactionType.EXPENSE },
    { id: 'c-priya-p-rent', userId: user2Id, accountId: 'personal', name: 'Rent', type: TransactionType.EXPENSE },
    { id: 'c-priya-p-freelance', userId: user2Id, accountId: 'personal', name: 'Freelance', type: TransactionType.INCOME }
  ];

  const transactions: Transaction[] = [
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

  const auditLogs: AuditLog[] = [
    {
      id: 'log-seed-1',
      timestamp: new Date('2026-06-01T00:00:00Z').toISOString(),
      userId: adminId,
      userEmail: 'admin@ff.com',
      action: 'SYSTEM_START',
      description: 'FinanceFlow seed database initialized successfully.'
    }
  ];

  return {
    users,
    wallets,
    categories,
    transactions,
    auditLogs,
    settings: { ...DEFAULT_SETTINGS }
  };
}

export class MockDatabase {
  static load(): DBStructure {
    if (typeof window === 'undefined') return generateSeedData();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const data = generateSeedData();
      this.save(data);
      return data;
    }
    try {
      const db = JSON.parse(stored);
      // Perform automated migration from @ems.com to @ff.com if any exists
      let migrated = false;
      if (db.users) {
        db.users.forEach((u: any) => {
          if (u.email && u.email.endsWith('@ems.com')) {
            u.email = u.email.replace('@ems.com', '@ff.com');
            migrated = true;
          }
        });
      }
      if (db.auditLogs) {
        db.auditLogs.forEach((log: any) => {
          if (log.userEmail && log.userEmail.endsWith('@ems.com')) {
            log.userEmail = log.userEmail.replace('@ems.com', '@ff.com');
            migrated = true;
          }
          if (log.description && log.description.includes('@ems.com')) {
            log.description = log.description.replace(/@ems.com/g, '@ff.com');
            migrated = true;
          }
        });
      }
      if (db.transactions) {
        db.transactions.forEach((tx: any) => {
          if (tx.userEmail && tx.userEmail.endsWith('@ems.com')) {
            tx.userEmail = tx.userEmail.replace('@ems.com', '@ff.com');
            migrated = true;
          }
        });
      }
      if (migrated) {
        this.save(db);
      }
      return db;
    } catch {
      const data = generateSeedData();
      this.save(data);
      return data;
    }
  }

  private static save(db: DBStructure) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      
      // Auto-background push to Google Sheets if configured
      const syncUrl = localStorage.getItem('ff_google_sheets_sync_url') || 'https://script.google.com/macros/s/AKfycbxkSZsrgVBi3Sj5t3sOXfnKfgo-ML9qx-X93_7Lfc-y1htGOPJ6jeWKYRnH5at4Ck0/exec';
      if (syncUrl) {
        fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors', // Use no-cors to prevent pre-flight and CORS redirection blocks
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'sync', db })
        }).catch(err => {
          console.warn('Google Sheets background sync failed:', err);
        });
      }
    }
  }

  static importDatabase(db: DBStructure) {
    if (db && typeof db === 'object') {
      const syncUrl = (typeof window !== 'undefined' ? localStorage.getItem('ff_google_sheets_sync_url') : null) || 'https://script.google.com/macros/s/AKfycbxkSZsrgVBi3Sj5t3sOXfnKfgo-ML9qx-X93_7Lfc-y1htGOPJ6jeWKYRnH5at4Ck0/exec';
      if (syncUrl) {
        if (!db.settings) {
          db.settings = {
            allowUserRegistration: true,
            maintenanceMode: false,
            defaultCurrency: 'USD',
            backupFrequency: 'daily',
            googleSheetsUrl: syncUrl
          };
        } else {
          db.settings.googleSheetsUrl = syncUrl;
        }
      }
      this.save(db);
    }
  }

  static logAction(userId: string, email: string, action: string, description: string) {
    const db = this.load();
    const log: AuditLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      userId,
      userEmail: email,
      action,
      description
    };
    db.auditLogs.push(log);
    this.save(db);
  }

  static login(email: string, passwordHash: string): { token: string; user: Omit<User, 'passwordHash'> } {
    const db = this.load();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    if (user.status === UserStatus.DISABLED) {
      throw new Error('Your account has been disabled. Contact system administrator.');
    }
    if (user.passwordHash !== passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const token = 'mock-token-' + Math.random().toString(36).substring(2, 15);
    this.logAction(user.id, user.email, 'LOGIN_SUCCESS', 'User successfully authenticated in local-mode');
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        createdDate: user.createdDate
      }
    };
  }

  static getUserById(id: string): Omit<User, 'passwordHash'> {
    const db = this.load();
    const user = db.users.find(u => u.id === id);
    if (!user) throw new Error('User not found.');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      createdDate: user.createdDate
    };
  }

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

    let wallets = db.wallets.filter(w => w.userId === userId && w.accountId === accountId);
    if (wallets.length === 0) {
      const newWallet = {
        id: `w-${userId}-${accountId}-cash`,
        userId: userId,
        accountId: accountId,
        name: accountId === 'personal' ? 'Cash' : 'Business Account',
        isDefault: true
      };
      db.wallets.push(newWallet);
      wallets = [newWallet];
      this.save(db);
    }

    const walletBalances = wallets.map(w => {
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

    let categories = db.categories.filter(c => c.userId === userId && c.accountId === accountId);
    if (categories.length === 0) {
      const defaults = accountId === 'personal' ? [
        { name: 'Food & Dining', type: TransactionType.EXPENSE },
        { name: 'Fuel & Travel', type: TransactionType.EXPENSE },
        { name: 'Shopping', type: TransactionType.EXPENSE },
        { name: 'Medical', type: TransactionType.EXPENSE },
        { name: 'Salary', type: TransactionType.INCOME }
      ] : [
        { name: 'Client Sales', type: TransactionType.INCOME },
        { name: 'Office Rent', type: TransactionType.EXPENSE },
        { name: 'Salary', type: TransactionType.EXPENSE },
        { name: 'Marketing', type: TransactionType.EXPENSE }
      ];

      defaults.forEach((cat, index) => {
        db.categories.push({
          id: `c-${userId}-${accountId}-${index}`,
          userId: userId,
          accountId: accountId,
          name: cat.name,
          type: cat.type as TransactionType
        });
      });
      this.save(db);
      categories = db.categories.filter(c => c.userId === userId && c.accountId === accountId);
    }

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

    const monthlySummary: Record<string, { month: string; income: number; expense: number }> = {};
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlySummary[key] = { month: name, income: 0, expense: 0 };
    }

    userTxs.forEach(t => {
      const key = t.date.substring(0, 7);
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

  static getWallets(userId: string, accountId: 'personal' | 'professional'): Wallet[] {
    const db = this.load();
    let wallets = db.wallets.filter(w => w.userId === userId && w.accountId === accountId);
    if (wallets.length === 0) {
      const newWallet = {
        id: `w-${userId}-${accountId}-cash`,
        userId: userId,
        accountId: accountId,
        name: accountId === 'personal' ? 'Cash' : 'Business Account',
        isDefault: true
      };
      db.wallets.push(newWallet);
      this.save(db);
      wallets = [newWallet];
    }
    return wallets;
  }

  static getCategories(userId: string, accountId: 'personal' | 'professional'): Category[] {
    const db = this.load();
    let categories = db.categories.filter(c => c.userId === userId && c.accountId === accountId);
    if (categories.length === 0) {
      const defaults = accountId === 'personal' ? [
        { name: 'Food & Dining', type: TransactionType.EXPENSE },
        { name: 'Fuel & Travel', type: TransactionType.EXPENSE },
        { name: 'Shopping', type: TransactionType.EXPENSE },
        { name: 'Medical', type: TransactionType.EXPENSE },
        { name: 'Salary', type: TransactionType.INCOME }
      ] : [
        { name: 'Client Sales', type: TransactionType.INCOME },
        { name: 'Office Rent', type: TransactionType.EXPENSE },
        { name: 'Salary', type: TransactionType.EXPENSE },
        { name: 'Marketing', type: TransactionType.EXPENSE }
      ];

      defaults.forEach((cat, index) => {
        db.categories.push({
          id: `c-${userId}-${accountId}-${index}`,
          userId: userId,
          accountId: accountId,
          name: cat.name,
          type: cat.type as TransactionType
        });
      });
      this.save(db);
      categories = db.categories.filter(c => c.userId === userId && c.accountId === accountId);
    }
    return categories;
  }

  static getTransactions(
    userId: string,
    accountId: 'personal' | 'professional',
    role: UserRole,
    filters: any = {}
  ): Transaction[] {
    const db = this.load();
    let txs = db.transactions;

    if (role === UserRole.USER) {
      txs = txs.filter(t => t.userId === userId && t.accountId === accountId && t.status === TransactionStatus.ACTIVE);
    } else {
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

  static createTransaction(
    userId: string,
    email: string,
    tx: {
      accountId: 'personal' | 'professional';
      type: TransactionType;
      date: string;
      categoryId: string;
      walletId: string;
      amount: number;
      notes: string;
    }
  ): Transaction {
    const db = this.load();

    const wallet = db.wallets.find(w => w.id === tx.walletId && w.userId === userId && w.accountId === tx.accountId);
    const category = db.categories.find(c => c.id === tx.categoryId && c.userId === userId && c.accountId === tx.accountId);

    if (!wallet || !category) {
      throw new Error('Security Error: Invalid Wallet or Category mapping.');
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      accountId: tx.accountId,
      type: tx.type,
      date: tx.date,
      categoryId: tx.categoryId,
      walletId: tx.walletId,
      amount: tx.amount,
      notes: tx.notes,
      status: TransactionStatus.ACTIVE,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };

    db.transactions.push(newTx);
    this.save(db);

    this.logAction(
      userId,
      email,
      'TRANSACTION_CREATED',
      `Added ${tx.type} transaction of ${tx.amount} in category "${category.name}" (Wallet: ${wallet.name})`
    );

    return newTx;
  }

  static updateTransaction(
    txId: string,
    userId: string,
    email: string,
    role: UserRole,
    updates: {
      date: string;
      categoryId: string;
      walletId: string;
      amount: number;
      notes: string;
    }
  ): Transaction {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const original = db.transactions[index];

    if (original.userId !== userId && role !== UserRole.ADMIN) {
      throw new Error('Access denied: You do not own this transaction.');
    }

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

  static deleteTransaction(txId: string, userId: string, email: string, role: UserRole) {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const tx = db.transactions[index];

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

  static getTransferTargets(currentUserId: string): any[] {
    const db = this.load();
    return db.users
      .filter(u => u.id !== currentUserId && u.status === UserStatus.ACTIVE && u.role !== 'ADMIN')
      .map(u => {
        const personalWallets = db.wallets.filter((w: any) => w.userId === u.id && w.accountId === 'personal');
        const professionalWallets = db.wallets.filter((w: any) => w.userId === u.id && w.accountId === 'professional');
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          displayName: u.displayName,
          personalWallets,
          professionalWallets
        };
      });
  }

  static createSelfTransfer(
    userId: string,
    email: string,
    data: {
      accountId: 'personal' | 'professional';
      sourceWalletId: string;
      destWalletId: string;
      amount: number;
      date: string;
      notes: string;
    }
  ) {
    const db = this.load();

    let expenseCat = db.categories.find(c => c.userId === userId && c.accountId === data.accountId && c.type === TransactionType.EXPENSE && c.name.toLowerCase() === 'self transfer');
    if (!expenseCat) {
      expenseCat = this.addCategory(userId, data.accountId, 'Self Transfer', TransactionType.EXPENSE, userId, email);
    }

    let incomeCat = db.categories.find(c => c.userId === userId && c.accountId === data.accountId && c.type === TransactionType.INCOME && c.name.toLowerCase() === 'self transfer');
    if (!incomeCat) {
      incomeCat = this.addCategory(userId, data.accountId, 'Self Transfer', TransactionType.INCOME, userId, email);
    }

    const expenseTx = this.createTransaction(userId, email, {
      accountId: data.accountId,
      type: TransactionType.EXPENSE,
      date: data.date,
      categoryId: expenseCat.id,
      walletId: data.sourceWalletId,
      amount: data.amount,
      notes: data.notes ? `${data.notes} (Self Transfer Out)` : 'Self Transfer Out'
    });

    const incomeTx = this.createTransaction(userId, email, {
      accountId: data.accountId,
      type: TransactionType.INCOME,
      date: data.date,
      categoryId: incomeCat.id,
      walletId: data.destWalletId,
      amount: data.amount,
      notes: data.notes ? `${data.notes} (Self Transfer In)` : 'Self Transfer In'
    });

    return { expenseTx, incomeTx };
  }

  static createUserTransfer(
    sourceUserId: string,
    sourceEmail: string,
    data: {
      sourceAccountId: 'personal' | 'professional';
      sourceWalletId: string;
      destUserId: string;
      destAccountId: 'personal' | 'professional';
      destWalletId: string;
      amount: number;
      date: string;
      notes: string;
    }
  ) {
    const db = this.load();
    const destUser = db.users.find(u => u.id === data.destUserId);
    if (!destUser) throw new Error('Destination user not found.');
    const destEmail = destUser.email;

    let sourceCat = db.categories.find(c => c.userId === sourceUserId && c.accountId === data.sourceAccountId && c.type === TransactionType.EXPENSE && c.name.toLowerCase() === 'user transfer');
    if (!sourceCat) {
      sourceCat = this.addCategory(sourceUserId, data.sourceAccountId, 'User Transfer', TransactionType.EXPENSE, sourceUserId, sourceEmail);
    }

    let destCat = db.categories.find(c => c.userId === data.destUserId && c.accountId === data.destAccountId && c.type === TransactionType.INCOME && c.name.toLowerCase() === 'user transfer');
    if (!destCat) {
      destCat = this.addCategory(data.destUserId, data.destAccountId, 'User Transfer', TransactionType.INCOME, sourceUserId, sourceEmail);
    }

    const sourceTx = this.createTransaction(sourceUserId, sourceEmail, {
      accountId: data.sourceAccountId,
      type: TransactionType.EXPENSE,
      date: data.date,
      categoryId: sourceCat.id,
      walletId: data.sourceWalletId,
      amount: data.amount,
      notes: data.notes ? `${data.notes} (Transfer to ${destEmail})` : `Transfer to ${destEmail}`
    });

    const destTx = this.createTransaction(data.destUserId, destEmail, {
      accountId: data.destAccountId,
      type: TransactionType.INCOME,
      date: data.date,
      categoryId: destCat.id,
      walletId: data.destWalletId,
      amount: data.amount,
      notes: data.notes ? `${data.notes} (Transfer from ${sourceEmail})` : `Transfer from ${sourceEmail}`
    });

    return { sourceTx, destTx };
  }

  static getAdminUsers(): Omit<User, 'passwordHash'>[] {
    const db = this.load();
    return db.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      displayName: u.displayName,
      status: u.status,
      role: u.role,
      createdDate: u.createdDate
    }));
  }

  static createAdminUser(adminUserId: string, adminEmail: string, user: Partial<User> & { password?: string }): User {
    const db = this.load();
    if (!user.email || !user.password) {
      throw new Error('Email and password are required.');
    }

    const exists = db.users.some(u => u.email.toLowerCase() === user.email!.toLowerCase());
    if (exists) {
      throw new Error('Email already registered.');
    }

    const newUser: User = {
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: user.email.toLowerCase(),
      passwordHash: hashPassword(user.password),
      name: user.name || 'New User',
      displayName: user.displayName || user.name || 'New User',
      status: user.status || UserStatus.ACTIVE,
      role: user.role || UserRole.USER,
      createdDate: new Date().toISOString()
    };

    db.users.push(newUser);

    // Create default categories for this user automatically to avoid empty accounts!
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

    db.wallets.push({
      id: `w-${newUser.id}-p-cash`,
      userId: newUser.id,
      accountId: 'personal',
      name: 'Cash',
      isDefault: true
    });

    db.wallets.push({
      id: `w-${newUser.id}-b-current`,
      userId: newUser.id,
      accountId: 'professional',
      name: 'Business Account',
      isDefault: true
    });

    this.save(db);
    this.logAction(adminUserId, adminEmail, 'USER_CREATED', `Created user ${newUser.name} (${newUser.email})`);
    return newUser;
  }

  static updateAdminUser(adminUserId: string, adminEmail: string, userId: string, updates: Partial<User>) {
    const db = this.load();
    const index = db.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    const original = db.users[index];

    const cleanUpdates: any = {};
    for (const key of Object.keys(updates)) {
      if ((updates as any)[key] !== undefined) {
        cleanUpdates[key] = (updates as any)[key];
      }
    }

    db.users[index] = { ...original, ...cleanUpdates };
    this.save(db);

    this.logAction(
      adminUserId,
      adminEmail,
      'USER_UPDATED',
      `Updated details of ${original.name}. Status: ${cleanUpdates.status || original.status}, Role: ${cleanUpdates.role || original.role}`
    );
  }

  static deleteAdminUser(adminUserId: string, adminEmail: string, userId: string) {
    if (userId === adminUserId) {
      throw new Error('You cannot delete your own administrator account.');
    }

    const db = this.load();
    const index = db.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    const targetUser = db.users[index];

    db.users.splice(index, 1);
    db.transactions = db.transactions.filter(t => t.userId !== userId);
    db.wallets = db.wallets.filter(w => w.userId !== userId);
    db.categories = db.categories.filter(c => c.userId !== userId);

    this.save(db);
    this.logAction(adminUserId, adminEmail, 'USER_DELETED', `Deleted user ${targetUser.name} (${targetUser.email}) and all their associated financial accounts/categories/logs.`);
  }

  static factoryReset(adminUserId: string, adminEmail: string) {
    const db = this.load();
    const currentAdmin = db.users.find(u => u.id === adminUserId);
    const keptAdmin = currentAdmin || {
      id: adminUserId,
      email: adminEmail,
      passwordHash: hashPassword('admin123'),
      name: 'System Admin',
      displayName: 'Administrator',
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
      createdDate: new Date().toISOString()
    };

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
        id: `log-${Math.random().toString(36).substring(2, 11)}`,
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

  static resetUserPassword(adminUserId: string, adminEmail: string, userId: string, newPasswordPlain: string) {
    const db = this.load();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    user.passwordHash = hashPassword(newPasswordPlain);
    this.save(db);

    this.logAction(adminUserId, adminEmail, 'PASSWORD_RESET_BY_ADMIN', `Administrator reset the login password of user ${user.name}`);
  }

  static getAdminUserWallets(userId: string, accountId: 'personal' | 'professional'): Wallet[] {
    return this.getWallets(userId, accountId);
  }

  static addAdminUserWallet(adminUserId: string, adminEmail: string, userId: string, wallet: { name: string; isDefault: boolean; accountId: 'personal' | 'professional' }): Wallet {
    const db = this.load();
    const newWallet: Wallet = {
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      accountId: wallet.accountId,
      name: wallet.name,
      isDefault: false
    };

    db.wallets.push(newWallet);

    if (wallet.isDefault) {
      db.wallets.forEach(w => {
        if (w.userId === userId && w.accountId === wallet.accountId) {
          w.isDefault = false;
        }
      });
      newWallet.isDefault = true;
    } else {
      const hasOther = db.wallets.some(w => w.userId === userId && w.accountId === wallet.accountId && w.id !== newWallet.id);
      if (!hasOther) {
        newWallet.isDefault = true;
      }
    }

    this.save(db);
    this.logAction(adminUserId, adminEmail, 'WALLET_CREATED', `Created wallet "${wallet.name}" for user ID ${userId} (${wallet.accountId})`);
    return newWallet;
  }

  static updateAdminUserWallet(adminUserId: string, adminEmail: string, userId: string, walletId: string, wallet: { name: string; isDefault: boolean }): void {
    const db = this.load();
    const index = db.wallets.findIndex(w => w.id === walletId);
    if (index === -1) throw new Error('Wallet not found');

    const w = db.wallets[index];
    w.name = wallet.name;

    if (wallet.isDefault && !w.isDefault) {
      db.wallets.forEach(other => {
        if (other.userId === userId && other.accountId === w.accountId) {
          other.isDefault = false;
        }
      });
      w.isDefault = true;
    }

    this.save(db);
    this.logAction(adminUserId, adminEmail, 'WALLET_UPDATED', `Updated wallet details to "${wallet.name}" (ID: ${walletId})`);
  }

  static deleteAdminUserWallet(adminUserId: string, adminEmail: string, userId: string, walletId: string): void {
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
      const remaining = db.wallets.find(other => other.userId === wallet.userId && other.accountId === wallet.accountId);
      if (remaining) {
        remaining.isDefault = true;
      }
    }

    this.save(db);
    this.logAction(adminUserId, adminEmail, 'WALLET_DELETED', `Deleted wallet "${wallet.name}" (ID: ${walletId})`);
  }

  static getAdminUserCategories(userId: string, accountId: 'personal' | 'professional'): Category[] {
    return this.getCategories(userId, accountId);
  }

  static addAdminUserCategory(
    adminUserId: string,
    adminEmail: string,
    userId: string,
    category: { name: string; type: TransactionType; accountId: 'personal' | 'professional'; targetAmount?: number }
  ): Category {
    return this.addCategory(userId, category.accountId, category.name, category.type, adminUserId, adminEmail, category.targetAmount);
  }

  private static addCategory(
    userId: string,
    accountId: 'personal' | 'professional',
    name: string,
    type: TransactionType,
    actorId: string,
    actorEmail: string,
    targetAmount?: number
  ): Category {
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
    this.logAction(actorId, actorEmail, 'CATEGORY_CREATED', `Created category "${name}" (${type}) for user ID ${userId} (${accountId})`);
    return newCategory;
  }

  static updateAdminUserCategory(adminUserId: string, adminEmail: string, userId: string, categoryId: string, category: { name: string; targetAmount?: number }): void {
    const db = this.load();
    const index = db.categories.findIndex(c => c.id === categoryId);
    if (index === -1) throw new Error('Category not found');

    const cat = db.categories[index];
    cat.name = category.name;
    cat.targetAmount = category.targetAmount;
    this.save(db);
    this.logAction(adminUserId, adminEmail, 'CATEGORY_MODIFIED', `Modified category ${cat.name} (ID: ${categoryId})`);
  }

  static deleteAdminUserCategory(adminUserId: string, adminEmail: string, userId: string, categoryId: string): void {
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
    this.logAction(adminUserId, adminEmail, 'CATEGORY_DELETED', `Deleted category "${category.name}" (ID: ${categoryId})`);
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

  static restoreTransaction(adminUserId: string, adminEmail: string, txId: string) {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const tx = db.transactions[index];
    tx.status = TransactionStatus.ACTIVE;
    tx.updatedDate = new Date().toISOString();
    this.save(db);

    this.logAction(
      adminUserId,
      adminEmail,
      'TRANSACTION_RESTORED',
      `Restored soft deleted transaction of ${tx.amount} for user ID ${tx.userId}`
    );
  }

  static deleteTransactionPermanently(adminUserId: string, adminEmail: string, txId: string) {
    const db = this.load();
    const index = db.transactions.findIndex(t => t.id === txId);
    if (index === -1) throw new Error('Transaction not found.');

    const tx = db.transactions[index];
    db.transactions.splice(index, 1);
    this.save(db);

    this.logAction(
      adminUserId,
      adminEmail,
      'TRANSACTION_PERMANENTLY_DELETED',
      `Permanently deleted transaction of ${tx.amount} for user ID ${tx.userId}`
    );
  }

  static getAuditLogs(): AuditLog[] {
    const db = this.load();
    return [...db.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static getSystemSettings(): SystemSettings {
    const db = this.load();
    return db.settings;
  }

  static updateSystemSettings(adminUserId: string, adminEmail: string, settings: SystemSettings): void {
    const db = this.load();
    db.settings = { ...db.settings, ...settings };
    this.save(db);
    this.logAction(adminUserId, adminEmail, 'SETTINGS_UPDATED', 'Updated system preferences and global configuration settings.');
  }
}
