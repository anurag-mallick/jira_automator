# ============================================
#    HORIZON IT — Installation Wizard
# ============================================

# Step A: Check prerequisites
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Red
    exit 1
}

# Check Git
try {
    git --version | Out-Null
} catch {
    Write-Host "Git is not installed. Attempting to install..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "Downloading Git installer..."
        $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe"
        $gitInstaller = "$env:TEMP\git-setup.exe"
        Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller -UseBasicParsing
        Start-Process -FilePath $gitInstaller -ArgumentList "/VERYSILENT /NORESTART" -Wait
    }
    $env:PATH += ";C:\Program Files\Git\bin;C:\Program Files\Git\cmd"
}

# Check Node.js 18+
$installNode = $false
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v', '' -replace '\..*', '')
    if ($majorVersion -lt 18) {
        Write-Host "Node.js 18+ is required. Found $nodeVersion. Updating..." -ForegroundColor Yellow
        $installNode = $true
    }
} catch {
    Write-Host "Node.js is not installed. Attempting to install..." -ForegroundColor Yellow
    $installNode = $true
}

if ($installNode) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "Downloading Node.js installer..."
        $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
        $nodeInstaller = "$env:TEMP\node-setup.msi"
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Start-Process -FilePath msiexec.exe -ArgumentList "/i $nodeInstaller /quiet /norestart" -Wait
    }
    $env:PATH += ";C:\Program Files\nodejs"
}

# Step B: Interactive Configuration
Clear-Host
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   HORIZON IT — Installation Wizard" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Environment Selection
Write-Host "Choose your deployment environment:"
Write-Host "  [1] Local System — Optimized for personal desktop/laptop."
Write-Host "  [2] Virtual Machine / Server — Optimized for shared network access."
$env_choice = ""
while ($env_choice -notmatch "^[12]$") {
    $env_choice = Read-Host "Enter choice (1 or 2)"
}

# 2. Database Selection
Write-Host "`nChoose your database method:"
Write-Host "  [1] Docker — Recommended. Requires Docker Desktop."
Write-Host "  [2] Native — No Docker needed. Installs PostgreSQL directly."
$db_choice = ""
while ($db_choice -notmatch "^[12]$") {
    $db_choice = Read-Host "Enter choice (1 or 2)"
}

# 3. Roundcube Integration
Write-Host "`nConfigure Roundcube Email Integration:"
$EMAIL_ID = Read-Host "Enter Roundcube Email (e.g., support@domain.in)"
$EMAIL_PW = Read-Host "Enter Email Password"
$IMAP_PORT = Read-Host "Enter IMAPS Port (default 993)"
if (-not $IMAP_PORT) { $IMAP_PORT = "993" }

# Extract host from email
$MAIL_HOST = "mail." + ($EMAIL_ID -replace '.*@', '')

# Step C: Clone the repo (if not already in the repo directory)
if (-not (Test-Path ".\package.json")) {
    Write-Host "Cloning repository..."
    git clone https://github.com/anurag-mallick/IT-Project-Management-Local.git horizon-it
    Set-Location horizon-it
}

# Step D: Generate secrets
Write-Host "Generating secure random keys..."
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | % {[char]$_})
$DB_PASSWORD = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | % {[char]$_})
$ADMIN_PASSWORD = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | % {[char]$_})

# Step E: Detect the machine's local network IP
$LOCAL_IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
if (-not $LOCAL_IP) { $LOCAL_IP = "localhost" }

# Step F: Define Installation Functions

function Install-Docker {
    Write-Host "Starting Docker installation..." -ForegroundColor Yellow
    # Check Docker is installed and running
    try {
        docker info >$null 2>&1
    } catch {
        Write-Host "Docker Desktop is not running. Please start Docker Desktop and try again." -ForegroundColor Red
        Write-Host "Download: https://www.docker.com/products/docker-desktop"
        exit 1
    }

    # Write .env file
    @"
POSTGRES_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_APP_URL=http://${LOCAL_IP}:3000
NODE_ENV=production

# Email Configuration (SMTP - Outgoing)
SMTP_HOST=$MAIL_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$EMAIL_ID
SMTP_PASS=$EMAIL_PW
SMTP_FROM='IT Support <$EMAIL_ID>'

# Email Configuration (IMAP - Incoming)
IMAP_HOST=$MAIL_HOST
IMAP_PORT=$IMAP_PORT
IMAP_USER=$EMAIL_ID
IMAP_PASS=$EMAIL_PW
IMAP_TICKET_FOLDER=INBOX
"@ | Set-Content .env

    # Build and start containers
    Write-Host "Building containers (this takes 3-5 minutes on first run)..."
    docker-compose down --remove-orphans 2>$null
    docker-compose up -d --build

    # Wait for DB to be ready
    Write-Host "Waiting for database to be ready..."
    $maxWait = 60
    $waited = 0
    do {
        Start-Sleep -Seconds 3
        $waited += 3
        $healthy = docker-compose ps db | Select-String "healthy"
    } while (-not $healthy -and $waited -lt $maxWait)

    if (-not $healthy) {
        Write-Host "Database did not become healthy in time. Check Docker logs." -ForegroundColor Red
        exit 1
    }

    # Run migrations
    Write-Host "Running database migrations..."
    docker-compose exec -T app npx prisma db push --accept-data-loss

    # Seed admin user
    Write-Host "Creating admin account..."
    $env:ADMIN_PASS = $ADMIN_PASSWORD
    docker-compose exec -T -e ADMIN_PASS app node -e "
const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashed = await bcrypt.hash(process.env.ADMIN_PASS, 10);
  await prisma.user.upsert({
    where: { email: 'admin@horizonit.local' },
    update: { password: hashed },
    create: {
      email: 'admin@horizonit.local',
      username: 'admin',
      name: 'Administrator',
      role: 'ADMIN',
      password: hashed,
      isActive: true
    }
  });
  console.log('Admin user ready.');
  await prisma.\$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
"

    # Configure Windows Firewall
    if ($env_choice -eq "2") {
        # VM Mode: Open all inbound for 3000
        netsh advfirewall firewall add rule name="Horizon IT (VM)" dir=in action=allow protocol=TCP localport=3000 | Out-Null
    } else {
        # Local Mode: Just allow local subnet or standard
        netsh advfirewall firewall add rule name="Horizon IT (Local)" dir=in action=allow protocol=TCP localport=3000 | Out-Null
    }

    Write-Host "Docker installation complete." -ForegroundColor Green
}

function Install-Native {
    Write-Host "Starting Native installation..." -ForegroundColor Yellow
    # Step 1: Check if PostgreSQL is already installed
    $pgPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if (-not $pgPath) {
        Write-Host ""
        Write-Host "PostgreSQL is not installed."
        Write-Host "Downloading PostgreSQL 16 installer..."
        
        $pgInstaller = "$env:TEMP\postgresql-installer.exe"
        $pgVersion = "16.6-1"
        $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$pgVersion-windows-x64.exe"
        
        Invoke-WebRequest -Uri $pgUrl -OutFile $pgInstaller -UseBasicParsing
        
        Write-Host "Installing PostgreSQL silently (this may take 2-3 minutes)..."
        # Silent install: no pgAdmin, no Stack Builder, just the server and CLI tools
        Start-Process -FilePath $pgInstaller -ArgumentList @(
            "--mode", "unattended",
            "--unattendedmodeui", "none",
            "--servicename", "postgresql-16",
            "--servicepassword", $DB_PASSWORD,
            "--superpassword", $DB_PASSWORD,
            "--enable-components", "server,commandlinetools",
            "--disable-components", "pgAdmin,stackbuilder",
            "--serverport", "5432"
        ) -Wait
        
        # Add psql to PATH for this session
        $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
        
        Write-Host "PostgreSQL installed successfully." -ForegroundColor Green
    } else {
        Write-Host "PostgreSQL is already installed. Skipping installation." -ForegroundColor Yellow
    }

    # Step 2: Create database and user
    Write-Host "Setting up database..."
    
    $env:PGPASSWORD = $DB_PASSWORD
    $psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if (-not (Test-Path $psqlPath)) {
        $psqlPath = (Get-Command psql).Source
    }
    
    # Create the database
    & $psqlPath -U postgres -c "CREATE DATABASE horizon_it;" 2>$null
    # Create app user
    & $psqlPath -U postgres -c "CREATE USER horizon_user WITH PASSWORD '$DB_PASSWORD';" 2>$null
    & $psqlPath -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE horizon_it TO horizon_user;" 2>$null
    & $psqlPath -U postgres -c "ALTER DATABASE horizon_it OWNER TO horizon_user;" 2>$null

    # Step 3: Write .env file
    @"
DATABASE_URL=postgresql://horizon_user:$DB_PASSWORD@localhost:5432/horizon_it
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_APP_URL=http://${LOCAL_IP}:3000
NODE_ENV=production

# Email Configuration (SMTP - Outgoing)
SMTP_HOST=$MAIL_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$EMAIL_ID
SMTP_PASS=$EMAIL_PW
SMTP_FROM='IT Support <$EMAIL_ID>'

# Email Configuration (IMAP - Incoming)
IMAP_HOST=$MAIL_HOST
IMAP_PORT=$IMAP_PORT
IMAP_USER=$EMAIL_ID
IMAP_PASS=$EMAIL_PW
IMAP_TICKET_FOLDER=INBOX
"@ | Set-Content .env

    # Step 4: Install Node dependencies
    Write-Host "Installing dependencies (this may take 2-3 minutes)..."
    npm install --production=false
    if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed." -ForegroundColor Red; exit 1 }

    # Step 5: Generate Prisma client and push schema
    Write-Host "Setting up database schema..."
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { Write-Host "Prisma generate failed." -ForegroundColor Red; exit 1 }
    npx prisma db push --accept-data-loss
    if ($LASTEXITCODE -ne 0) { Write-Host "Prisma db push failed." -ForegroundColor Red; exit 1 }

    # Step 6: Seed admin user
    Write-Host "Creating admin account..."
    $env:ADMIN_PASS = $ADMIN_PASSWORD
    node -e "
const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashed = await bcrypt.hash(process.env.ADMIN_PASS, 10);
  await prisma.user.upsert({
    where: { email: 'admin@horizonit.local' },
    update: { password: hashed },
    create: {
      email: 'admin@horizonit.local',
      username: 'admin',
      name: 'Administrator',
      role: 'ADMIN',
      password: hashed,
      isActive: true
    }
  });
  console.log('Admin user ready.');
  await prisma.\$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
"

    # Step 7: Build the Next.js app
    Write-Host "Building application (this takes 2-3 minutes)..."
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }

    # Step 8: Create a Windows Service so the app starts on boot
    Write-Host "Registering Horizon IT as a Windows Service..."
    
    # Install node-windows locally to manage the service
    npm install node-windows
    
    # Create service registration script
    $installScript = @"
const Service = require('node-windows').Service;
const path = require('path');
const svc = new Service({
  name: 'Horizon IT',
  description: 'Horizon IT Helpdesk Application',
  script: path.join(__dirname, 'next-start.js'), // We'll create this wrapper
  nodeOptions: [],
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT', value: '3000' }
  ]
});
svc.on('install', () => { svc.start(); console.log('Service installed and started.'); });
svc.on('alreadyinstalled', () => { svc.start(); console.log('Service already installed, starting...'); });
svc.install();
"@
    $installScript | Set-Content install-service.js

    # Create a wrapper script because node-windows expects a .js file
    @"
const { spawn } = require('child_process');
const path = require('path');
const nextPath = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn('node', [nextPath, 'start', '-p', '3000'], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit'
});
child.on('exit', (code) => process.exit(code));
"@ | Set-Content next-start.js

    node install-service.js
    Remove-Item install-service.js

    # Step 9: Open Windows Firewall for port 3000
    if ($env_choice -eq "2") {
        netsh advfirewall firewall add rule name="Horizon IT (VM)" dir=in action=allow protocol=TCP localport=3000 | Out-Null
    } else {
        netsh advfirewall firewall add rule name="Horizon IT (Local)" dir=in action=allow protocol=TCP localport=3000 | Out-Null
    }

    Write-Host "Native installation complete." -ForegroundColor Green
}

# Execute based on choice
if ($db_choice -eq "1") {
    Install-Docker
    $mode = "Docker"
    $stopInstructions = "docker-compose stop"
    $startInstructions = "docker-compose start"
} else {
    Install-Native
    $mode = "Native"
    $stopInstructions = 'net stop "Horizon IT"'
    $startInstructions = 'net start "Horizon IT"'
}

# Step G: Print Summary and Save INFO file
$installDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$infoContent = @"
============================================
HORIZON IT — Installation Details
============================================
Installed on : $installDate
Install mode : $mode
Machine IP   : $LOCAL_IP

ACCESS DETAILS (share with your team)
--------------------------------------
URL          : http://$($LOCAL_IP):3000
Admin Email  : admin@horizonit.local
Admin Password: $ADMIN_PASSWORD

MANAGEMENT
--------------------------------------
Stop app     : $stopInstructions
Start app    : $startInstructions
Uninstall    : powershell -File uninstall.ps1

IMPORTANT
--------------------------------------
- Keep this file secure. It contains your admin password.
- Change your admin password after first login via Settings > Security.
- All team members must be on the same network to access the URL.
============================================
"@

$infoContent | Set-Content INSTALL_INFO.txt

Clear-Host
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   HORIZON IT — Installation Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Access URL    : http://$($LOCAL_IP):3000" -ForegroundColor Green
Write-Host "  Admin Email   : admin@horizonit.local"
Write-Host "  Admin Password: $ADMIN_PASSWORD" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Share the Access URL with your team."
Write-Host "  They can open it in any browser on this network."
Write-Host ""
Write-Host "  To stop the app:   $stopInstructions"
Write-Host "  To start again:    $startInstructions"
Write-Host ""
Write-Host "  All details saved to: INSTALL_INFO.txt"
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Installation complete. Press Enter to continue and close this window..."
