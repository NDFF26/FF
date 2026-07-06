/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from './lib/api';
import { User, UserRole } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import ReportsView from './components/ReportsView';
import AdminDashboardView from './components/AdminDashboardView';
import AdminUsersView from './components/AdminUsersView';
import AdminRecycleBin from './components/AdminRecycleBin';
import AdminAuditLogs from './components/AdminAuditLogs';
import AdminSettings from './components/AdminSettings';
import { Menu, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAccount, setActiveAccount] = useState<'personal' | 'professional'>('personal');
  const [appLoading, setAppLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Authenticate user session on load
  const verifySession = async () => {
    setAppLoading(true);
    const saved = ApiClient.getSavedUser();
    if (saved) {
      try {
        const verifiedUser = await ApiClient.getMe();
        setUser(verifiedUser);
        setActiveAccount(ApiClient.getActiveAccount());
        // Auto routing depending on role
        if (verifiedUser.role === UserRole.ADMIN) {
          setActiveTab('admin-dashboard');
        } else {
          setActiveTab('dashboard');
        }
      } catch {
        // Token was stale
        ApiClient.clearAuth();
        setUser(null);
      }
    }
    setAppLoading(false);
  };

  useEffect(() => {
    verifySession();

    // Session Expired Event handler
    const handleExpired = () => {
      setUser(null);
      alert('Your session has expired. Please sign in again.');
    };

    window.addEventListener('auth_session_expired', handleExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleExpired);
    };
  }, []);

  // Auto timeout 1 minute after zero touch (inactivity) detection
  useEffect(() => {
    if (!user) return;

    const TIMEOUT_DURATION = 60 * 1000; // 1 minute
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        ApiClient.logout().catch(() => {}).finally(() => {
          setUser(null);
          setActiveTab('dashboard');
          alert('You have been automatically logged out due to 1 minute of inactivity (zero touch detected).');
        });
      }, TIMEOUT_DURATION);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Initialize timer
    resetTimer();

    // Attach interaction listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user?.id]);

  const handleLoginSuccess = (loggedInUser: Omit<User, 'passwordHash'>) => {
    setUser(loggedInUser);
    setActiveAccount('personal');
    if (loggedInUser.role === UserRole.ADMIN) {
      setActiveTab('admin-dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await ApiClient.logout();
    } catch {
      // Ignore failures
    } finally {
      setUser(null);
      setActiveTab('dashboard');
    }
  };

  if (appLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Not Logged In screen routing
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50/50 font-sans">
      {/* Sidebar navigation */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAccount={activeAccount}
        setActiveAccount={setActiveAccount}
        onLogout={handleLogout}
        isOpenOnMobile={mobileMenuOpen}
        setIsOpenOnMobile={setMobileMenuOpen}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Navbar header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6 lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            {!logoError ? (
              <img
                src="./logo.png"
                alt="FinanceFlow"
                className="h-8 w-8 object-contain"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
            )}
            <span className="font-bold text-lg tracking-tight">
              <span className="text-[#07274c]">Finance</span>
              <span className="text-[#179743]">Flow</span>
            </span>
          </div>
          <button
            id="hamburger-menu-btn"
            type="button"
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && <DashboardView activeAccount={activeAccount} />}
          {activeTab === 'transactions' && <TransactionsView activeAccount={activeAccount} />}
          {activeTab === 'reports' && <ReportsView activeAccount={activeAccount} />}

          {/* Admin routes */}
          {activeTab === 'admin-dashboard' && <AdminDashboardView />}
          {activeTab === 'admin-users' && <AdminUsersView />}
          {activeTab === 'admin-recycle-bin' && <AdminRecycleBin />}
          {activeTab === 'admin-audit-logs' && <AdminAuditLogs />}
          {activeTab === 'admin-settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
}
