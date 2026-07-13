/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ApiClient, isLocalMode } from '../lib/api';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  Users,
  Trash2,
  ScrollText,
  Settings,
  LogOut,
  UserCheck,
  Building2,
  Briefcase,
  Menu,
  X,
  Database,
  Cloud,
  RefreshCw
} from 'lucide-react';

interface SidebarProps {
  user: Omit<User, 'passwordHash'>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeAccount: 'personal' | 'professional';
  setActiveAccount: (account: 'personal' | 'professional') => void;
  onLogout: () => void;
  isOpenOnMobile: boolean;
  setIsOpenOnMobile: (open: boolean) => void;
}

export default function Sidebar({
  user,
  activeTab,
  setActiveTab,
  activeAccount,
  setActiveAccount,
  onLogout,
  isOpenOnMobile,
  setIsOpenOnMobile
}: SidebarProps) {
  const isAdmin = user.role === UserRole.ADMIN;
  const [logoError, setLogoError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('ems_last_sync_time') : null;
  });

  React.useEffect(() => {
    const handleDatabaseUpdate = () => {
      if (typeof window !== 'undefined') {
        setLastSyncTime(localStorage.getItem('ems_last_sync_time'));
      }
    };
    window.addEventListener('database_updated', handleDatabaseUpdate);
    return () => {
      window.removeEventListener('database_updated', handleDatabaseUpdate);
    };
  }, []);

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return 'Never';
    }
  };

  const userNavigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', name: 'Transactions', icon: ReceiptText },
    { id: 'reports', name: 'Reports', icon: PieChart },
  ];

  const adminNavigation = [
    { id: 'admin-dashboard', name: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'admin-users', name: 'Manage Users', icon: Users },
    { id: 'admin-recycle-bin', name: 'Recycle Bin', icon: Trash2 },
    { id: 'admin-audit-logs', name: 'Audit Logs', icon: ScrollText },
    { id: 'admin-settings', name: 'System Settings', icon: Settings },
  ];

  const handleAccountSwitch = (acc: 'personal' | 'professional') => {
    setActiveAccount(acc);
    ApiClient.setActiveAccount(acc);
    // Refresh currently loaded data by dispatching a custom account-switched event
    window.dispatchEvent(new CustomEvent('account_changed', { detail: acc }));
  };

  const navItems = isAdmin && activeTab.startsWith('admin-') ? adminNavigation : userNavigation;

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpenOnMobile && (
        <div
          id="sidebar-overlay"
          className="fixed inset-0 z-40 bg-gray-600/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpenOnMobile(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header logo & Close button (Mobile) */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-50 shrink-0">
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
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base">
                F
              </div>
            )}
            <span className="font-sans font-bold text-lg tracking-tight">
              <span className="text-[#07274c]">Finance</span>
              <span className="text-[#179743]">Flow</span>
            </span>
          </div>
          <button
            id="close-sidebar-mobile-btn"
            type="button"
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={() => setIsOpenOnMobile(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current profile info */}
        <div className="px-6 py-5 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
              {user.displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {user.displayName}
              </h3>
              <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                <UserCheck className="h-3 w-3 inline text-emerald-500" />
                {isAdmin ? 'System Admin' : 'Premium User'}
              </p>
            </div>
          </div>

          {/* Account switcher (Personal vs Professional) */}
          {!isAdmin || (isAdmin && !activeTab.startsWith('admin-')) ? (
            <div className="mt-4 bg-gray-50 p-1 rounded-lg flex gap-1">
              <button
                id="select-account-personal-btn"
                onClick={() => handleAccountSwitch('personal')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeAccount === 'personal'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Briefcase className="h-3 w-3" />
                Personal
              </button>
              <button
                id="select-account-professional-btn"
                onClick={() => handleAccountSwitch('professional')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeAccount === 'professional'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Building2 className="h-3 w-3" />
                Professional
              </button>
            </div>
          ) : (
            <div className="mt-4 text-center bg-indigo-50 border border-indigo-100 py-1.5 rounded-lg text-xs font-semibold text-indigo-700">
              Admin Control Mode
            </div>
          )}

          {/* Connection Mode Indicator Box */}
          <div className="mt-4 p-3 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2 text-left">
            <div className="flex items-center gap-1.5 justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Database className="h-3 w-3 text-gray-400" />
                Database Mode
              </span>
              {isLocalMode ? (
                ApiClient.getGoogleSheetsUrl() ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sheets Synced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                    <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse"></span>
                    Local Only
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud Sync
                </span>
              )}
            </div>
            
            <p className="text-[10px] text-gray-500 leading-normal">
              {isLocalMode 
                ? (ApiClient.getGoogleSheetsUrl() 
                    ? "Static Web App mode. Synced with Google Sheets across devices." 
                    : "Static Web App mode. Add a Google Sheets URL in settings to sync across devices.")
                : "Securely synced on server & backed up to Google Sheets."}
            </p>

            {lastSyncTime && (
              <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100/50 pt-1.5 mt-1">
                <span>Last Sync:</span>
                <span className="font-mono font-medium text-gray-600">
                  {formatSyncTime(lastSyncTime)}
                </span>
              </div>
            )}

            {/* Quick Manual Sync Refresh button */}
            <button
              id="sidebar-quick-sync-btn"
              type="button"
              onClick={async (e) => {
                const targetBtn = e.currentTarget;
                const originalHtml = targetBtn.innerHTML;
                targetBtn.disabled = true;
                targetBtn.innerHTML = `<span class="animate-spin text-indigo-700">&#8635;</span> Syncing...`;
                try {
                  if (isLocalMode) {
                    const hasDirty = localStorage.getItem('ems_mock_database_dirty') === 'true';
                    if (hasDirty) {
                      await ApiClient.pushToGoogleSheets();
                      // Wait a brief moment for Google Sheets to process and save the spreadsheet
                      await new Promise((resolve) => setTimeout(resolve, 1500));
                    }
                    const success = await ApiClient.pullFromGoogleSheets();
                    if (success) {
                      ApiClient.notifyUpdate();
                      alert('🔄 Sync check completed! Successfully updated local database from Google Sheets.');
                    } else {
                      ApiClient.notifyUpdate(); // Always notify update to refresh the "Last Sync Time" on the sidebar
                      alert('🔄 Sync completed! Your database is up to date.');
                    }
                  } else {
                    await ApiClient.getMe();
                    ApiClient.notifyUpdate();
                    alert('🔄 Sync check completed! Latest entries have been synchronized.');
                  }
                } catch (err: any) {
                  console.error('Manual sync failed:', err);
                  alert('❌ Sync check failed: ' + (err.message || err));
                } finally {
                  targetBtn.disabled = false;
                  targetBtn.innerHTML = originalHtml;
                }
              }}
              className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1 px-2 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-[10px] font-bold text-indigo-700 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh & Sync Data
            </button>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`nav-item-${item.id}-btn`}
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpenOnMobile(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                {item.name}
              </button>
            );
          })}

          {/* Quick toggle between user panel and admin panel if user is admin */}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-gray-50">
              <button
                id="toggle-admin-user-mode-btn"
                onClick={() => {
                  if (activeTab.startsWith('admin-')) {
                    setActiveTab('dashboard');
                  } else {
                    setActiveTab('admin-dashboard');
                  }
                  setIsOpenOnMobile(false);
                }}
                className="flex w-full items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                {activeTab.startsWith('admin-') ? 'Switch to Personal Dashboard' : 'Switch to Admin Panel'}
              </button>
            </div>
          )}
        </nav>

        {/* Footer log out button */}
        <div className="p-4 border-t border-gray-50 shrink-0">
          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
