@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     HORIZON IT - AUTOMATED SETUP UTILITY
echo ===================================================
echo.

:: 1. Check for Node.js
echo [1/6] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL ERROR] Node.js is not installed!
    echo Please download and install it from: https://nodejs.org/
    pause
    exit /b 1
)
echo      - Node.js found.

:: 2. Check for Docker
echo [2/6] Checking for Docker...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL ERROR] Docker is not installed or not in your PATH!
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
docker ps >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL ERROR] Docker is NOT running!
    echo Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)
echo      - Docker is running.

:: 3. Prepare Environment
echo [3/6] Preparing environment variables...
if not exist .env (
    echo      - Creating .env from .env.example...
    copy .env.example .env >nul
    
    :: Generate a random JWT_SECRET using PowerShell
    echo      - Generating random JWT_SECRET...
    powershell -Command "$randomSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | %% {[char]$_}); (gc .env) -replace 'JWT_SECRET=.*', ('JWT_SECRET=' + $randomSecret) | Out-File -encoding utf8 .env"
    
    echo      - Created .env. IMPORTANT: Verifying local database path...
) else (
    echo      - .env file already exists.
)

:: 4. Install Dependencies
echo [4/6] Installing NPM dependencies (this may take a minute)...
call npm install --prefer-offline --no-audit --no-fund
if %errorlevel% neq 0 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
)

:: 5. Initialize Database
echo [5/6] Starting database and syncing schema...
docker-compose up -d db
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Docker database.
    pause
    exit /b 1
)

echo      - Waiting for database readiness (10s)...
timeout /t 10 /nobreak >nul

:: Update .env for local access if it was just copied
:: (Ensuring localhost instead of 'db' for the host machine)
powershell -Command "(gc .env) -replace '@db:', '@localhost:' | Out-File -encoding utf8 .env"

echo      - Pushing Prisma schema...
call npx prisma generate
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Schema sync failed. Retrying in 5s...
    timeout /t 5 /nobreak >nul
    call npx prisma db push
)

:: 6. Seed Database
echo [6/6] Seeding default admin account...
call node scripts/seed-local.js
if %errorlevel% neq 0 (
    echo [ERROR] Seeding failed.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo             SETUP COMPLETE SUCCESSFULY!
echo ===================================================
echo.
echo  ACCESS:     http://localhost:3000
echo.
echo  ADMIN EMAIL:    admin@horizon-it.local
echo  ADMIN PASSWORD: AdminPassword123!
echo.
echo ===================================================
echo.
set /p START_NOW="Would you like to start the server now? (Y/N): "
if /i "%START_NOW%"=="Y" (
    echo Starting server...
    npm run dev
) else (
    echo.
    echo To start later, run: npm run dev
    echo.
    pause
)
