#!/usr/bin/env bash
# Enterprise Telecom Warehouse Management System (TWMS) Launcher
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================================="
echo "   ENTERPRISE TELECOM WAREHOUSE MANAGEMENT SYSTEM (TWMS) - APEX TELECOM"
echo "========================================================================="

echo "[1/3] Verifying Python..."
python3 --version || { echo "Python 3 is required."; exit 1; }

echo "[2/3] Installing Python dependencies..."
pip3 install -r backend/requirements.txt --quiet

echo "[3/3] Starting TWMS Backend on port 8000..."
cd "$DIR/backend"
python3 serve.py &
BACKEND_PID=$!

if command -v npm &> /dev/null; then
    echo "Starting Vite Frontend on port 3000..."
    cd "$DIR/frontend"
    npm run dev &
    FRONTEND_PID=$!
    echo ""
    echo "TWMS Active at: http://localhost:3000"
else
    echo "Serving pre-built UI on http://127.0.0.1:8000"
fi

echo "API Documentation: http://127.0.0.1:8000/docs"
echo "Press Ctrl+C to terminate all services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT
wait
