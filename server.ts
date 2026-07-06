/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { DBManager, hashPassword } from './server/db';
import { UserRole, UserStatus, TransactionType, TransactionStatus } from './src/types';

// Session Store in-memory
interface Session {
  userId: string;
  userEmail: string;
  role: UserRole;
  expiresAt: number;
}

const sessions = new Map<string, Session>();
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 Hours

const app = express();
const PORT = 3000;

app.use(express.json());

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // Double check user still exists and is ACTIVE
  const fullUser = DBManager.findUserByEmail(session.userEmail);
  if (!fullUser || fullUser.status === UserStatus.DISABLED) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Your account is disabled, removed, or has changed status. Access denied.' });
  }

  req.user = {
    id: session.userId,
    email: session.userEmail,
    role: session.role
  };

  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Forbidden: Admin access only.' });
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = DBManager.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status === UserStatus.DISABLED) {
    return res.status(403).json({ error: 'Your account has been disabled. Contact system administrator.' });
  }

  const inputHash = hashPassword(password);
  if (user.passwordHash !== inputHash) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  const session: Session = {
    userId: user.id,
    userEmail: user.email,
    role: user.role,
    expiresAt: Date.now() + SESSION_EXPIRY_MS
  };

  sessions.set(token, session);

  // Log action
  DBManager.logAction(user.id, user.email, 'LOGIN_SUCCESS', `User successfully authenticated`);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      role: user.role,
      status: user.status
    }
  });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    sessions.delete(token);
    if (req.user) {
      DBManager.logAction(req.user.id, req.user.email, 'LOGOUT', `User logged out`);
    }
  }
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const fullUser = DBManager.findUserByEmail(req.user.email);
  if (!fullUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({
    id: fullUser.id,
    email: fullUser.email,
    name: fullUser.name,
    displayName: fullUser.displayName,
    role: fullUser.role,
    status: fullUser.status
  });
});

// ----------------------------------------------------
// DASHBOARD & ANALYTICS
// ----------------------------------------------------

app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const accountId = req.query.accountId as 'personal' | 'professional';
  if (!accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Valid accountId (personal or professional) is required.' });
  }

  const userId = req.user!.id;
  try {
    const stats = DBManager.getDashboardStats(userId, accountId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching dashboard stats.' });
  }
});

app.get('/api/admin/dashboard', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const stats = DBManager.getAdminDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching admin stats.' });
  }
});

// ----------------------------------------------------
// WALLETS & CATEGORIES
// ----------------------------------------------------

app.get('/api/wallets', requireAuth, (req: AuthenticatedRequest, res) => {
  const accountId = req.query.accountId as 'personal' | 'professional';
  if (!accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Valid accountId (personal or professional) is required.' });
  }

  try {
    const wallets = DBManager.getWallets(req.user!.id, accountId);
    res.json(wallets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', requireAuth, (req: AuthenticatedRequest, res) => {
  const accountId = req.query.accountId as 'personal' | 'professional';
  if (!accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Valid accountId (personal or professional) is required.' });
  }

  try {
    const categories = DBManager.getCategories(req.user!.id, accountId);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// TRANSACTIONS
// ----------------------------------------------------

app.get('/api/transactions', requireAuth, (req: AuthenticatedRequest, res) => {
  const accountId = req.query.accountId as 'personal' | 'professional';
  if (!accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Valid accountId (personal or professional) is required.' });
  }

  const { search, category, wallet, type, startDate, endDate } = req.query;

  try {
    const transactions = DBManager.getTransactions(req.user!.id, accountId, req.user!.role, {
      search: search as string,
      category: category as string,
      wallet: wallet as string,
      type: type as TransactionType,
      startDate: startDate as string,
      endDate: endDate as string
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', requireAuth, (req: AuthenticatedRequest, res) => {
  const { accountId, type, date, categoryId, walletId, amount, notes } = req.body;

  if (!accountId || !type || !date || !categoryId || !walletId || amount === undefined) {
    return res.status(400).json({ error: 'Missing required transaction fields.' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Transaction amount must be greater than 0.' });
  }

  try {
    const transaction = DBManager.createTransaction(
      {
        userId: req.user!.id,
        accountId,
        type,
        date,
        categoryId,
        walletId,
        amount: Number(amount),
        notes: notes || ''
      },
      req.user!.email
    );
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/transactions/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const txId = req.params.id;
  const { date, categoryId, walletId, amount, notes } = req.body;

  try {
    const updated = DBManager.updateTransaction(
      txId,
      {
        date,
        categoryId,
        walletId,
        amount: amount !== undefined ? Number(amount) : undefined,
        notes
      },
      req.user!.id,
      req.user!.email,
      req.user!.role
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const txId = req.params.id;

  try {
    DBManager.softDeleteTransaction(txId, req.user!.id, req.user!.email, req.user!.role);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------
// TRANSFERS
// ----------------------------------------------------

app.get('/api/users/transfer-targets', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const allUsers = DBManager.getUsers().filter(u => u.id !== req.user!.id && u.status === 'ACTIVE');
    const db = (DBManager as any).load();
    
    const targets = allUsers.map(u => {
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
    
    res.json(targets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions/self-transfer', requireAuth, (req: AuthenticatedRequest, res) => {
  const { accountId, sourceWalletId, destWalletId, amount, date, notes } = req.body;

  if (!accountId || !sourceWalletId || !destWalletId || amount === undefined || !date) {
    return res.status(400).json({ error: 'Missing required self-transfer fields.' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Transfer amount must be greater than 0.' });
  }

  if (sourceWalletId === destWalletId) {
    return res.status(400).json({ error: 'Source and destination wallets must be different.' });
  }

  try {
    const result = DBManager.createSelfTransfer(
      req.user!.id,
      accountId,
      sourceWalletId,
      destWalletId,
      Number(amount),
      date,
      notes || '',
      req.user!.email
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions/user-transfer', requireAuth, (req: AuthenticatedRequest, res) => {
  const { sourceAccountId, sourceWalletId, destUserId, destAccountId, destWalletId, amount, date, notes } = req.body;

  if (!sourceAccountId || !sourceWalletId || !destUserId || !destAccountId || !destWalletId || amount === undefined || !date) {
    return res.status(400).json({ error: 'Missing required user-to-user transfer fields.' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Transfer amount must be greater than 0.' });
  }

  if (req.user!.id === destUserId) {
    return res.status(400).json({ error: 'Cannot perform user-to-user transfer to yourself. Use Self Transfer instead.' });
  }

  try {
    const destUser = DBManager.getUsers().find(u => u.id === destUserId);
    if (!destUser) {
      return res.status(404).json({ error: 'Destination user not found.' });
    }

    const result = DBManager.createUserTransfer(
      req.user!.id,
      sourceAccountId,
      sourceWalletId,
      destUserId,
      destAccountId,
      destWalletId,
      Number(amount),
      date,
      notes || '',
      req.user!.email,
      destUser.email
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ADMIN ONLY PANELS
// ----------------------------------------------------


// Admin User-specific Wallets and Categories Management
app.get('/api/admin/users/:userId/wallets', requireAuth, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const accountId = req.query.accountId as 'personal' | 'professional';
  if (!accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Valid accountId (personal or professional) is required.' });
  }

  try {
    const wallets = DBManager.getWallets(userId, accountId);
    res.json(wallets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:userId/wallets', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { name, isDefault, accountId } = req.body;

  if (!name || !accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Missing name or valid accountId.' });
  }

  try {
    const wallet = DBManager.addWallet(
      userId,
      accountId,
      name,
      !!isDefault,
      { id: req.user!.id, email: req.user!.email }
    );
    res.status(201).json(wallet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/admin/users/:userId/wallets/:walletId', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { walletId } = req.params;
  const { name, isDefault } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Wallet name is required.' });
  }

  try {
    DBManager.manageWallet(
      walletId,
      name,
      !!isDefault,
      { id: req.user!.id, email: req.user!.email }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:userId/wallets/:walletId', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { walletId } = req.params;

  try {
    DBManager.deleteWallet(walletId, { id: req.user!.id, email: req.user!.email });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/users/:userId/categories', requireAuth, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const accountId = req.query.accountId as 'personal' | 'professional';
  if (!accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Valid accountId (personal or professional) is required.' });
  }

  try {
    const categories = DBManager.getCategories(userId, accountId);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:userId/categories', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { name, type, accountId } = req.body;

  if (!name || !type || !accountId || (accountId !== 'personal' && accountId !== 'professional')) {
    return res.status(400).json({ error: 'Missing name, type or valid accountId.' });
  }

  try {
    const category = DBManager.addCategory(
      userId,
      accountId,
      name,
      type,
      { id: req.user!.id, email: req.user!.email }
    );
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/admin/users/:userId/categories/:categoryId', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { categoryId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    DBManager.manageCategory(
      categoryId,
      name,
      { id: req.user!.id, email: req.user!.email }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:userId/categories/:categoryId', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { categoryId } = req.params;

  try {
    DBManager.deleteCategory(categoryId, { id: req.user!.id, email: req.user!.email });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin Users CRUD
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  try {
    res.json(DBManager.getUsers());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { email, name, displayName, status, role, password } = req.body;

  if (!email || !name || !password || !status || !role) {
    return res.status(400).json({ error: 'Missing required user parameters.' });
  }

  try {
    const user = DBManager.createUser(
      {
        email,
        name,
        displayName: displayName || name,
        status,
        role
      },
      password,
      { id: req.user!.id, email: req.user!.email }
    );
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/admin/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const targetUserId = req.params.id;
  const { name, displayName, status, role } = req.body;

  try {
    const userToEdit = DBManager.getUsers().find(u => u.id === targetUserId);
    if (userToEdit && userToEdit.role === 'ADMIN' && status === 'DISABLED') {
      return res.status(400).json({ error: 'Administrative accounts cannot be disabled.' });
    }
    if (userToEdit && userToEdit.id === 'u-admin' && role && role !== 'ADMIN') {
      return res.status(400).json({ error: 'The primary system administrator cannot be demoted.' });
    }

    DBManager.updateUser(
      targetUserId,
      { name, displayName, status, role },
      { id: req.user!.id, email: req.user!.email }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const targetUserId = req.params.id;

  try {
    const userToDelete = DBManager.getUsers().find(u => u.id === targetUserId);
    if (userToDelete && userToDelete.role === 'ADMIN') {
      return res.status(400).json({ error: 'Administrative accounts cannot be deleted.' });
    }

    DBManager.deleteUser(targetUserId, { id: req.user!.id, email: req.user!.email });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/factory-reset', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    DBManager.factoryReset({ id: req.user!.id, email: req.user!.email });

    // Clear all other sessions, keeping only the current admin session
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    for (const [token, session] of sessions.entries()) {
      if (token !== currentToken) {
        sessions.delete(token);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const targetUserId = req.params.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'New password is required.' });
  }

  try {
    DBManager.resetPassword(
      targetUserId,
      password,
      { id: req.user!.id, email: req.user!.email }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin Recycle Bin / Soft Delete Management
app.get('/api/admin/deleted-transactions', requireAuth, requireAdmin, (req, res) => {
  try {
    const deleted = DBManager.getDeletedTransactionsAdmin();
    res.json(deleted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/restore-transaction/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  const txId = req.params.id;

  try {
    DBManager.restoreTransaction(txId, { id: req.user!.id, email: req.user!.email });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Audit Logs
app.get('/api/admin/audit-logs', requireAuth, requireAdmin, (req, res) => {
  try {
    res.json(DBManager.getAuditLogs());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Management
app.get('/api/admin/settings', requireAuth, requireAdmin, (req, res) => {
  try {
    res.json(DBManager.getSettings());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/settings', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    DBManager.updateSettings(req.body, { id: req.user!.id, email: req.user!.email });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------
// FRONTEND SERVING (VITE MIDDLEWARE IN DEV / STATIC IN PROD)
// ----------------------------------------------------

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server } // Let Vite reuse our HTTP server for WebSocket HMR connections
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      // Skip API requests
      if (req.path.startsWith('/api/')) {
        return next();
      }

      // Do not return HTML for static asset file requests
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return next();
      }

      // Only handle document/HTML page requests
      if (req.headers.accept && !req.headers.accept.includes('text/html')) {
        return next();
      }

      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        let html = fs.readFileSync(indexPath, 'utf8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
