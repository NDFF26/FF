/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // Stored securely
  name: string;
  displayName: string;
  status: UserStatus;
  role: UserRole;
  createdDate: string;
}

export interface Wallet {
  id: string;
  userId: string;
  accountId: 'personal' | 'professional';
  name: string;
  isDefault: boolean;
}

export interface Category {
  id: string;
  userId: string;
  accountId: 'personal' | 'professional';
  name: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: 'personal' | 'professional';
  type: TransactionType;
  date: string; // YYYY-MM-DD
  categoryId: string;
  walletId: string;
  amount: number;
  notes: string;
  status: TransactionStatus;
  createdDate: string;
  updatedDate: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  description: string;
}

export interface SystemSettings {
  allowUserRegistration: boolean;
  maintenanceMode: boolean;
  defaultCurrency: string;
  backupFrequency: string;
  currency?: string;
  sessionTimeoutHours?: number;
  requireTwoFactor?: boolean;
}
