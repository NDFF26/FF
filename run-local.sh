#!/bin/bash

# Force the script to run in the exact folder where this script is located
cd "$(dirname "$0")"

echo "==================================================="
echo "          FinanceFlow Local Runner"
echo "==================================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js (version 18 or higher) from https://nodejs.org/"
    echo ""
    exit 1
fi

# Copy .env.example if .env does not exist
if [ ! -f .env ]; then
    echo "[INFO] Creating .env file from .env.example..."
    cp .env.example .env
fi

# Install dependencies if node_modules is missing
if [ ! -d node_modules ]; then
    echo "[INFO] Installing project dependencies (this may take a minute)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies."
        exit 1
    fi
fi

echo "[INFO] Starting the FinanceFlow server on http://localhost:3000 ..."
echo "[INFO] Your browser will open automatically in 3 seconds."
echo ""

# Wait 3 seconds and open the default browser in background
(sleep 3 && open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null) &

# Start the development server
npm run dev
