# FinanceFlow Dashboard (Personal & Professional Ledger)

Welcome to **FinanceFlow**, a secure, high-performance, full-stack application designed to track Personal & Professional income, expenses, accounts, and budgets. This application uses a React-Vite client-side frontend and a Node.js/Express server-side API backend.

---

## 📂 How the Database Works (Current Architecture)

Currently, **FinanceFlow** is fully configured with an automated local JSON database system on the server-side (`db.json`). This provides persistent state management out of the box without needing external database servers.

* **Local JSON Database (`db.json`)**: All registered users, passwords (securely hashed), custom accounts (Personal/Professional), ledger transactions, transaction categories, budgets, and detailed audit logs are persisted in `db.json` at the root of the project directory.
* **Auto-Initialization**: When the server boots for the first time, it automatically reads/creates `db.json` and seeds default data (like default categories and standard system credentials) so that the application is immediately ready to use.
* **Secure Session API**: The React frontend *never* accesses the database directly. All operations are mediated by secure REST API endpoints (`/api/*`) on the Express server.
* **Git Protection**: We have specifically updated `.gitignore` to block `db.json` and local custom environment configurations (`.env`) from ever being committed or uploaded to GitHub. This guarantees your database, transactions, and passwords remain local, private, and secure.

---

## 🔒 Security Best Practices for Self-Hosting

When you host your project source code or push it to any platform like GitHub:

1. **Environment Isolation**: Any sensitive configuration keys or custom parameters are loaded from a local `.env` file (copied from `.env.example`), which Git ignores.
2. **Empty Seed Database**: The compiled repository does not distribute any private data. Every new system where this project is cloned will automatically boot with its own clean, isolated instance of the local database structure.

---

## 🚀 How to Run the App Locally in VS Code

We have created single-click runner scripts to make running the application locally extremely simple and reliable on both Windows and Unix operating systems.

### Method 1: Single-Click Run (Recommended)
* **Windows Users**: 
  Simply double-click the **`run-local.bat`** file in your project folder.
* **macOS / Linux Users**: 
  Open your terminal, navigate to the folder, and run:
  ```bash
  chmod +x run-local.sh
  ./run-local.sh
  ```

*These scripts automatically verify Node.js, create your local configuration `.env` file from the example template, install any missing npm packages, open your default web browser directly to `http://localhost:3000`, and start the Express & Vite development servers concurrently.*

---

### Method 2: Manual Terminal Startup
If you prefer running commands manually inside your VS Code terminal:

1. **Open the project folder** in VS Code.
2. **Install all dependencies**:
   ```bash
   npm install
   ```
3. **Copy environment variables**:
   Create a new file named `.env` and copy the values from `.env.example`.
4. **Start the server**:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to **`http://localhost:3000`**.

---

## 🎨 FinanceFlow Aesthetic Design System

The application is styled with a highly polished design system mapped to these specific brand colors:
* **Finance**: `#07274c` (Deep Corporate Navy Blue)
* **Flow**: `#179743` (Vibrant Leaf Green)
* **Typography**: Clean display fonts for headers and numeric data layouts.
