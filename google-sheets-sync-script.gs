/**
 * ============================================================================
 *               FINANCEFLOW TABULAR GOOGLE SHEETS SYNC SCRIPT
 * ============================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any existing code in "Code.gs" and paste this complete script.
 * 4. Click the Save icon (floppy disk).
 * 5. Click "Deploy" > "New deployment".
 * 6. Click the gear icon next to "Select type" and select "Web app".
 * 7. Configure:
 *    - Description: "FinanceFlow Sync Web App"
 *    - Execute as: "Me" (your-email@gmail.com)
 *    - Who has access: "Anyone" (This is crucial for the API to connect!)
 * 8. Click "Deploy". You may need to "Authorize access" (it is safe; click 
 *    "Advanced" > "Go to FinanceFlow (unsafe)" to grant permission).
 * 9. Copy the generated "Web app URL" (it ends with /exec) and paste it into
 *    the FinanceFlow settings page.
 * 
 * Features of this Tabular version:
 * - Separates database into clear, neat tabs: Settings, Users, Wallets, 
 *   Categories, Transactions, AuditLogs.
 * - Solves the 50,000 character cell limit in Google Sheets completely.
 * - Allows easy viewing, editing, and using Excel/Sheets formulas.
 */

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'get') {
    try {
      var db = loadDatabase();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: db
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: err.toString(),
        stack: err.stack
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'Invalid action or missing parameter'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'sync') {
      saveDatabase(data.db);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Database synced successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Rebuild and save entire database structure in structured tables
function saveDatabase(db) {
  if (!db) return;
  
  // 1. Write Settings & Metadata
  writeSettingsToSheet(db.settings, db.lastUpdated);
  
  // 2. Write Users Table
  writeTableToSheet("Users", [
    "id",
    "email",
    "passwordHash",
    "name",
    "displayName",
    "status",
    "role",
    "createdDate",
    "googleSheetsUrl"
  ], db.users);
  
  // 3. Write Wallets Table
  writeTableToSheet("Wallets", [
    "id",
    "userId",
    "accountId",
    "name",
    "isDefault"
  ], db.wallets);
  
  // 4. Write Categories Table
  writeTableToSheet("Categories", [
    "id",
    "userId",
    "accountId",
    "name",
    "type",
    "targetAmount"
  ], db.categories);
  
  // 5. Write Transactions Table
  writeTableToSheet("Transactions", [
    "id",
    "userId",
    "accountId",
    "type",
    "date",
    "categoryId",
    "walletId",
    "amount",
    "notes",
    "status",
    "createdDate",
    "updatedDate"
  ], db.transactions);
  
  // 6. Write Audit Logs Table
  writeTableToSheet("AuditLogs", [
    "id",
    "timestamp",
    "userId",
    "userEmail",
    "action",
    "description"
  ], db.auditLogs);
  
  // 7. Remove empty default sheet (e.g. Sheet1) if other tabs are created successfully
  cleanDefaultSheet();
}

// Reconstruct whole database structure from separate sheets
function loadDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var db = {
    users: [],
    wallets: [],
    categories: [],
    transactions: [],
    auditLogs: [],
    settings: {},
    lastUpdated: ""
  };
  
  // Load Settings
  var settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet) {
    var values = settingsSheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      var key = values[i][0];
      var val = values[i][1];
      if (!key) continue;
      
      // Data type coercion
      if (key === "allowUserRegistration" || key === "maintenanceMode" || key === "requireTwoFactor") {
        if (typeof val === "boolean") {
          db.settings[key] = val;
        } else {
          db.settings[key] = (String(val).toLowerCase() === "true");
        }
      } else if (key === "sessionTimeoutHours") {
        db.settings[key] = Number(val);
      } else if (key === "lastUpdated") {
        db.lastUpdated = String(val);
      } else {
        db.settings[key] = val;
      }
    }
  }
  
  // Load other tabular sheets
  db.users = readTableFromSheet("Users");
  db.wallets = readTableFromSheet("Wallets");
  db.categories = readTableFromSheet("Categories");
  db.transactions = readTableFromSheet("Transactions");
  db.auditLogs = readTableFromSheet("AuditLogs");
  
  return db;
}

// Core helper: Writes an array of objects to a sheet with beautiful headers
function writeTableToSheet(sheetName, headers, dataArray) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  // Write header row
  sheet.appendRow(headers);
  
  // Format header row style
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#07274c"); // Deep Navy blue
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");
  
  if (dataArray && dataArray.length > 0) {
    var rows = [];
    for (var i = 0; i < dataArray.length; i++) {
      var item = dataArray[i] || {};
      var row = [];
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = item[key];
        if (val === undefined || val === null) {
          row.push("");
        } else if (typeof val === 'object') {
          row.push(JSON.stringify(val));
        } else {
          row.push(val);
        }
      }
      rows.push(row);
    }
    
    // Write all rows in one operation for maximum speed
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Auto fit columns to make it readable
  if (headers.length > 0) {
    sheet.autoResizeColumns(1, headers.length);
  }
}

// Helper to write Settings sheet as clean Key-Value rows
function writeSettingsToSheet(settings, lastUpdated) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    sheet = ss.insertSheet("Settings");
  } else {
    sheet.clear();
  }
  
  sheet.appendRow(["Setting Key", "Setting Value"]);
  var headerRange = sheet.getRange(1, 1, 1, 2);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#179743"); // Leaf Green
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");
  
  var rows = [];
  if (settings && typeof settings === 'object') {
    for (var key in settings) {
      if (settings.hasOwnProperty(key)) {
        rows.push([key, settings[key]]);
      }
    }
  }
  
  if (lastUpdated) {
    rows.push(["lastUpdated", lastUpdated]);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  
  sheet.autoResizeColumns(1, 2);
}

// Helper to load records from a spreadsheet tab
function readTableFromSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return []; // Only headers exist
  
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
        
        // Coerce types based on keys
        if (key === "amount" || key === "targetAmount" || key === "sessionTimeoutHours") {
          item[key] = Number(val);
        } else if (key === "isDefault" || key === "allowUserRegistration" || key === "maintenanceMode" || key === "requireTwoFactor") {
          if (typeof val === "boolean") {
            item[key] = val;
          } else {
            item[key] = (String(val).toLowerCase() === "true");
          }
        } else if (typeof val === "string" && (val.indexOf("{") === 0 || val.indexOf("[") === 0)) {
          try {
            item[key] = JSON.parse(val);
          } catch (e) {
            item[key] = val;
          }
        } else {
          // If it's a number but should be a string ID, force string conversion
          if (typeof val === "number" && (key === "id" || key === "userId" || key === "categoryId" || key === "walletId")) {
            item[key] = String(val);
          } else {
            item[key] = val;
          }
        }
      }
    }
    if (hasData) {
      list.push(item);
    }
  }
  return list;
}

// Clear or delete default "Sheet1" once database tables have been set up
function cleanDefaultSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name === "Sheet1" || name === "Sheet 1" || name === "Sheet") {
      if (sheets.length > 1) {
        try {
          ss.deleteSheet(sheets[i]);
        } catch (e) {
          sheets[i].clear();
          sheets[i].getRange("A1").setValue("Database synced in separated sheets! Check the tabs below: Settings, Users, Wallets, Categories, Transactions, AuditLogs");
        }
      } else {
        sheets[i].clear();
        sheets[i].getRange("A1").setValue("Database synced in separated sheets! Check the tabs below: Settings, Users, Wallets, Categories, Transactions, AuditLogs");
      }
    }
  }
}
