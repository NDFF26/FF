/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { SystemSettings } from '../types';
import {
  Settings,
  AlertCircle,
  Loader2,
  Save,
  CheckCircle,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCode
} from 'lucide-react';

const APPS_SCRIPT_CODE = `function doGet(e) {
  var action = e.parameter.action;
  if (action === 'get') {
    try {
      var db = loadDatabase();
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: db })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'sync') {
      saveDatabase(data.db);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Database synced successfully' })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveDatabase(db) {
  if (!db) return;
  writeSettingsToSheet(db.settings, db.lastUpdated);
  writeTableToSheet("Users", ["id", "email", "passwordHash", "name", "displayName", "status", "role", "createdDate", "googleSheetsUrl"], db.users);
  writeTableToSheet("Wallets", ["id", "userId", "accountId", "name", "isDefault"], db.wallets);
  writeTableToSheet("Categories", ["id", "userId", "accountId", "name", "type", "targetAmount"], db.categories);
  writeTableToSheet("Transactions", ["id", "userId", "accountId", "type", "date", "categoryId", "walletId", "amount", "notes", "status", "createdDate", "updatedDate"], db.transactions);
  writeTableToSheet("AuditLogs", ["id", "timestamp", "userId", "userEmail", "action", "description"], db.auditLogs);
  cleanDefaultSheet();
}

function loadDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var db = { users: [], wallets: [], categories: [], transactions: [], auditLogs: [], settings: {}, lastUpdated: "" };
  
  var settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet) {
    var values = settingsSheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      var key = values[i][0];
      var val = values[i][1];
      if (!key) continue;
      if (key === "allowUserRegistration" || key === "maintenanceMode" || key === "requireTwoFactor") {
        db.settings[key] = (typeof val === "boolean") ? val : (String(val).toLowerCase() === "true");
      } else if (key === "sessionTimeoutHours") {
        db.settings[key] = Number(val);
      } else if (key === "lastUpdated") {
        db.lastUpdated = String(val);
      } else {
        db.settings[key] = val;
      }
    }
  }
  
  db.users = readTableFromSheet("Users");
  db.wallets = readTableFromSheet("Wallets");
  db.categories = readTableFromSheet("Categories");
  db.transactions = readTableFromSheet("Transactions");
  db.auditLogs = readTableFromSheet("AuditLogs");
  return db;
}

function writeTableToSheet(sheetName, headers, dataArray) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); } else { sheet.clear(); }
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold").setBackground("#07274c").setFontColor("#ffffff").setHorizontalAlignment("center");
  
  if (dataArray && dataArray.length > 0) {
    var rows = [];
    for (var i = 0; i < dataArray.length; i++) {
      var item = dataArray[i] || {};
      var row = [];
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = item[key];
        row.push(val === undefined || val === null ? "" : (typeof val === 'object' ? JSON.stringify(val) : val));
      }
      rows.push(row);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  if (headers.length > 0) { sheet.autoResizeColumns(1, headers.length); }
}

function writeSettingsToSheet(settings, lastUpdated) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) { sheet = ss.insertSheet("Settings"); } else { sheet.clear(); }
  sheet.appendRow(["Setting Key", "Setting Value"]);
  sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#179743").setFontColor("#ffffff").setHorizontalAlignment("center");
  
  var rows = [];
  if (settings && typeof settings === 'object') {
    for (var key in settings) {
      if (settings.hasOwnProperty(key)) { rows.push([key, settings[key]]); }
    }
  }
  if (lastUpdated) { rows.push(["lastUpdated", lastUpdated]); }
  if (rows.length > 0) { sheet.getRange(2, 1, rows.length, 2).setValues(rows); }
  sheet.autoResizeColumns(1, 2);
}

function readTableFromSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      if (val !== undefined && val !== null && val !== "") {
        hasData = true;
        if (key === "amount" || key === "targetAmount" || key === "sessionTimeoutHours") {
          item[key] = Number(val);
        } else if (key === "isDefault" || key === "allowUserRegistration" || key === "maintenanceMode" || key === "requireTwoFactor") {
          item[key] = (typeof val === "boolean") ? val : (String(val).toLowerCase() === "true");
        } else if (typeof val === "string" && (val.indexOf("{") === 0 || val.indexOf("[") === 0)) {
          try { item[key] = JSON.parse(val); } catch (e) { item[key] = val; }
        } else {
          item[key] = (typeof val === "number" && (key === "id" || key === "userId" || key === "categoryId" || key === "walletId")) ? String(val) : val;
        }
      }
    }
    if (hasData) list.push(item);
  }
  return list;
}

function cleanDefaultSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name === "Sheet1" || name === "Sheet 1" || name === "Sheet") {
      if (sheets.length > 1) {
        try { ss.deleteSheet(sheets[i]); } catch (e) {
          sheets[i].clear().getRange("A1").setValue("Database synced in separated sheets! Check the tabs below.");
        }
      } else {
        sheets[i].clear().getRange("A1").setValue("Database synced in separated sheets! Check the tabs below.");
      }
    }
  }
}`;

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Custom Factory Reset States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [verificationInput, setVerificationInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Google Sheets Cloud Sync states
  const [googleSheetsUrl, setGoogleSheetsUrlState] = useState('');
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsSuccess, setSheetsSuccess] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Form Fields
  const [currency, setCurrency] = useState('INR');
  const [allowRegistration, setAllowRegistration] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(24);
  const [require2FA, setRequire2FA] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getSystemSettings();
      setSettings(data);
      setCurrency(data.currency || 'INR');
      setAllowRegistration(!!data.allowUserRegistration);
      setSessionTimeout(data.sessionTimeoutHours !== undefined && data.sessionTimeoutHours !== null ? data.sessionTimeoutHours : 24);
      setRequire2FA(!!data.requireTwoFactor);

      // Load Google Sheets sync URL from LocalStorage or server settings
      const serverSheetsUrl = data.googleSheetsUrl || '';
      const savedSheetsUrl = ApiClient.getGoogleSheetsUrl() || serverSheetsUrl;
      setGoogleSheetsUrlState(savedSheetsUrl);
      if (serverSheetsUrl && !ApiClient.getGoogleSheetsUrl()) {
        ApiClient.setGoogleSheetsUrl(serverSheetsUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await ApiClient.updateSystemSettings({
        ...settings,
        allowUserRegistration: allowRegistration,
        defaultCurrency: currency,
        currency,
        sessionTimeoutHours: sessionTimeout,
        requireTwoFactor: require2FA
      } as SystemSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Global System Settings
        </h1>
        <p className="text-sm text-gray-500">
          Administrator command room to update currency parameters, security configurations, and system protocols.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Error Loading System Settings</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="max-w-xl">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            {success && (
              <div id="settings-success-alert" className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                Settings saved successfully! Changes applied immediately.
              </div>
            )}

            {/* General Configurations */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">General</h3>
              
              <div>
                <label htmlFor="sys-currency" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  System Default Currency
                </label>
                <select
                  id="sys-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="INR">Indian Rupee (₹ / INR)</option>
                  <option value="USD">US Dollar ($ / USD)</option>
                  <option value="EUR">Euro (€ / EUR)</option>
                  <option value="GBP">British Pound (£ / GBP)</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <label htmlFor="sys-allow-reg" className="text-sm font-semibold text-gray-700">Allow Self User Registration</label>
                  <p className="text-xs text-gray-400">Let non-admin guest users sign up from the landing screen.</p>
                </div>
                <input
                  id="sys-allow-reg"
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Security Settings */}
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Security & Authentication</h3>

              <div>
                <label htmlFor="sys-session-timeout" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Session Expiration Timeout (Hours)
                </label>
                <input
                  id="sys-session-timeout"
                  type="number"
                  min="1"
                  max="720"
                  required
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <label htmlFor="sys-2fa" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-500 inline" />
                    Enforce Multifactor Authentication (MFA)
                  </label>
                  <p className="text-xs text-gray-400">Require full verification codes during session handshakes.</p>
                </div>
                <input
                  id="sys-2fa"
                  type="checkbox"
                  checked={require2FA}
                  onChange={(e) => setRequire2FA(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                id="save-settings-btn"
                type="submit"
                disabled={saving || resetting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Google Sheets Cloud Sync */}
          <div id="google-sheets-sync-card" className="mt-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                🟢 Google Sheets Cloud Sync (Optional)
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Connect your FinanceFlow application to a Google Sheet via Google Apps Script. This enables seamless, real-time synchronization of all transactions, wallets, and settings between your laptop and mobile phone completely for free—even when hosting on GitHub Pages!
              </p>
            </div>

            {sheetsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs font-semibold">
                {sheetsSuccess}
              </div>
            )}

            {sheetsError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs leading-relaxed whitespace-pre-wrap">
                {sheetsError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="sheets-url" className="block text-xs font-bold text-gray-700 mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  id="sheets-url"
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={googleSheetsUrl}
                  onChange={(e) => setGoogleSheetsUrlState(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={syncingSheets}
                  onClick={async () => {
                    if (!googleSheetsUrl.trim()) {
                      setSheetsError('Please enter a valid Google Apps Script Web App URL first.');
                      return;
                    }
                    setSyncingSheets(true);
                    setSheetsSuccess(null);
                    setSheetsError(null);
                    try {
                      // Save URL first
                      ApiClient.setGoogleSheetsUrl(googleSheetsUrl.trim());
                      
                      // Push local database state to Google Sheets
                      await ApiClient.pushToGoogleSheets();
                      
                      setSheetsSuccess('✅ Connection successful! Your data has been uploaded to Google Sheets. Backups will now save automatically on every change.');
                    } catch (err: any) {
                      setSheetsError(
                        '❌ Connection failed. Please ensure your Google Apps Script is deployed as a Web App, authorized, and set to "Anyone" has access.\nDetail: ' + (err.message || err)
                      );
                    } finally {
                      setSyncingSheets(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {syncingSheets ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : 'Test & Upload to Sheets'}
                </button>

                <button
                  type="button"
                  disabled={syncingSheets}
                  onClick={async () => {
                    if (!googleSheetsUrl.trim()) {
                      setSheetsError('Please enter a valid Google Apps Script Web App URL first.');
                      return;
                    }
                    setSyncingSheets(true);
                    setSheetsSuccess(null);
                    setSheetsError(null);
                    try {
                      // Save URL first
                      ApiClient.setGoogleSheetsUrl(googleSheetsUrl.trim());
                      
                      // Pull database state from Google Sheets
                      const pulled = await ApiClient.pullFromGoogleSheets();
                      if (pulled) {
                        setSheetsSuccess('✅ Sync successful! Downloaded latest database state from Google Sheets. Reloading application...');
                        setTimeout(() => window.location.reload(), 1500);
                      } else {
                        setSheetsError('❌ Could not download data. Ensure your sheet has been initialized or contains valid backup data.');
                      }
                    } catch (err: any) {
                      setSheetsError('❌ Pull failed. Detail: ' + (err.message || err));
                    } finally {
                      setSyncingSheets(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-gray-200"
                >
                  Download from Sheets
                </button>

                {googleSheetsUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      ApiClient.setGoogleSheetsUrl(null);
                      setGoogleSheetsUrlState('');
                      setSheetsSuccess('✅ Google Sheets sync disabled successfully.');
                    }}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-semibold cursor-pointer border border-red-200/50"
                  >
                    Disconnect Sync
                  </button>
                )}
              </div>

              {/* Collapsible Apps Script Code Guide */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(!showScriptGuide)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors cursor-pointer border border-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-emerald-600" />
                    📋 Install Tabular Google Apps Script (Removes 50,000-character error & structures Sheet)
                  </span>
                  {showScriptGuide ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {showScriptGuide && (
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                    <div className="text-[11px] text-gray-600 space-y-2 leading-relaxed font-sans">
                      <p className="font-semibold text-gray-800">Why use this Tabular Version?</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>No 50,000 Character Cell Limit:</strong> Google Sheets limits single cells to 50k characters. Previously, saving your entire database JSON string inside one cell would crash. This script splits the database into logical tables.</li>
                        <li><strong>Structured & readable sheets:</strong> Generates neat, labeled tabs for <strong>Settings, Users, Wallets, Categories, Transactions</strong> and <strong>AuditLogs</strong> with high-contrast styled headers.</li>
                        <li><strong>Interactive formulas:</strong> Easily run calculations, pivots, graphs, and financial filters on your transactions inside Excel or Google Sheets!</li>
                      </ul>
                      
                      <p className="font-semibold text-gray-800 pt-1">How to apply:</p>
                      <ol className="list-decimal pl-4 space-y-1 font-sans">
                        <li>Open your destination Google Sheet.</li>
                        <li>Click <strong>Extensions &gt; Apps Script</strong> in the top menu.</li>
                        <li>Delete all default code inside <strong>Code.gs</strong>, and paste the code below.</li>
                        <li>Save the script by clicking the floppy disk icon.</li>
                        <li>Click <strong>Deploy &gt; New deployment</strong>, click the gear icon to choose <strong>Web app</strong>.</li>
                        <li>Set <code className="bg-white px-1 py-0.5 rounded border">Execute as: Me</code> and <code className="bg-white px-1 py-0.5 rounded border">Who has access: Anyone</code> (essential for synchronization).</li>
                        <li>Click <strong>Deploy</strong>, authorize any permissions, copy the Web App URL, paste it above, and click <strong>Test &amp; Upload to Sheets</strong>.</li>
                      </ol>
                    </div>

                    <div className="relative">
                      <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                            setCopiedScript(true);
                            setTimeout(() => setCopiedScript(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-md shadow-xs border border-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedScript ? (
                            <span className="text-emerald-600 font-bold">✓ Copied!</span>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Code
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-gray-950 text-emerald-400 font-mono text-[10px] rounded-lg overflow-x-auto max-h-60 border border-gray-800">
                        {APPS_SCRIPT_CODE}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone: Factory Reset */}
          <div id="danger-zone-settings-card" className="mt-8 bg-red-50/40 p-6 rounded-2xl border border-red-200/60 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">Danger Zone</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  Perform a complete system reset. This action will permanently erase all other user accounts, transactions, history, wallets, and custom categories, reverting the system to its clean factory state. Only your current administrator account will be preserved.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                id="factory-reset-btn"
                type="button"
                disabled={resetting || saving}
                onClick={() => {
                  setResetStep(1);
                  setVerificationInput('');
                  setResetError(null);
                  setResetSuccess(false);
                  setShowResetModal(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Perform Factory Reset (Erase All Data)
              </button>
            </div>
          </div>

          {/* Custom Factory Reset Step-by-Step Modal */}
          {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-xs" onClick={() => !resetting && !resetSuccess && setShowResetModal(false)} />
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full relative z-10 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-red-50">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                  <h2 className="text-base font-bold text-red-900">System Factory Reset</h2>
                </div>

                <div className="p-6 space-y-4">
                  {resetStep === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">⚠️ Phase 1: Danger Zone Confirmation</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        You are initiating a complete system database wipe. This will:
                      </p>
                      <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
                        <li>Permanently delete <strong>all other user accounts</strong>.</li>
                        <li>Erase all income & expense <strong>transactions</strong> and logs.</li>
                        <li>Wipe all wallets, custom bank setups, and categories.</li>
                        <li><strong>Preserve only your current administrator account</strong> and reset core system configurations to default.</li>
                      </ul>
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowResetModal(false)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetStep(2)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Understood, Proceed
                        </button>
                      </div>
                    </div>
                  )}

                  {resetStep === 2 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-red-600">🚨 Phase 2: Irreversible Action Warning</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Are you 100% positive you want to do this? This action cannot be undone under any circumstances. Once executed, all production transaction history is gone forever.
                      </p>
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResetStep(1)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetStep(3)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                        >
                          Yes, I am absolutely sure
                        </button>
                      </div>
                    </div>
                  )}

                  {resetStep === 3 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">🔒 Phase 3: Administrator Authorization</p>
                      <p className="text-xs text-gray-600">
                        Please type <strong className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-700">RESET</strong> in the box below to authorize:
                      </p>
                      <input
                        type="text"
                        value={verificationInput}
                        onChange={(e) => setVerificationInput(e.target.value)}
                        placeholder="Type RESET here"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500 font-mono text-center"
                      />
                      {resetError && (
                        <p className="text-xs text-red-600 font-medium">{resetError}</p>
                      )}
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={resetting}
                          onClick={() => setResetStep(2)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold disabled:opacity-50 cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={resetting || verificationInput !== 'RESET'}
                          onClick={async () => {
                            setResetting(true);
                            setResetError(null);
                            try {
                              await ApiClient.factoryReset();
                              setResetSuccess(true);
                              setResetStep(4);
                            } catch (err: any) {
                              setResetError(err.message || 'Failed to execute factory reset.');
                              setResetting(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer font-sans"
                        >
                          {resetting ? (
                            <>
                              <Loader2 className="animate-spin h-3.5 w-3.5" />
                              Wiping Database...
                            </>
                          ) : (
                            'Authorize & Wipe System'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {resetStep === 4 && (
                    <div className="space-y-3 text-center py-2">
                      <p className="text-sm font-bold text-emerald-600 font-sans">✨ Reset Complete!</p>
                      <p className="text-xs text-gray-600 leading-relaxed font-sans">
                        All other user logs, setups, and accounts have been successfully terminated. The system is back to factory default.
                      </p>
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetModal(false);
                            window.location.reload();
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer font-sans"
                        >
                          Reload System Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
