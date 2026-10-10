@echo off
setlocal
title Enterprise Telecom Warehouse Management System (TWMS)

echo =========================================================================
echo    ENTERPRISE TELECOM WAREHOUSE MANAGEMENT SYSTEM (TWMS) - APEX TELECOM
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python environment...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in your system PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

echo [2/3] Installing Python dependencies if required...
pip install -r backend\requirements.txt --quiet >nul 2>&1

echo [3/3] Starting TWMS Services...
echo.
echo Launching Backend Server on http://127.0.0.1:8000 ...
start "TWMS-Backend-API" cmd /k "cd /d %~dp0backend && python serve.py"

REM Check if Node.js is available for development mode
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Launching Frontend Development Server on http://localhost:3000 ...
    start "TWMS-Frontend-UI" cmd /k "cd /d %~dp0frontend && npm run dev"
    timeout /t 3 >nul
    start http://localhost:3000
) else (
    echo [INFO] Node.js not detected. Serving pre-compiled Production SPA from port 8000!
    timeout /t 3 >nul
    start http://127.0.0.1:8000
)

echo.
echo =========================================================================
echo  TWMS Application is ACTIVE!
echo  - Web Application:  http://localhost:3000  (or http://127.0.0.1:8000)
echo  - Swagger API Docs: http://127.0.0.1:8000/docs
echo.
echo  Default Accounts (Password: Password123!):
echo  - Super Admin:       admin
echo  - Warehouse Manager: wh_manager_dxb
echo  - Cluster Owner:     cluster_owner_north
echo  - Branch Manager:    branch_mgr_auh
echo  - Field Engineer:    field_eng_omar
echo  - Compliance Auditor:auditor_jane
echo =========================================================================
echo.
echo Press any key to close this launcher window (servers will remain running)...
pause >nul
