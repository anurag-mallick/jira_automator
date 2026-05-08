# ============================================
#    HORIZON IT — Uninstallation Script
# ============================================

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run PowerShell as Administrator to uninstall." -ForegroundColor Red
    exit 1
}

# Detect mode
$isDocker = (docker-compose ps -q app 2>$null) -ne $null
$isNative = (Get-Service "Horizon IT" -ErrorAction SilentlyContinue) -ne $null

if ($isDocker) {
    Write-Host "Docker installation detected. Uninstalling..." -ForegroundColor Yellow
    docker-compose down -v
    netsh advfirewall firewall delete rule name="Horizon IT" | Out-Null
    Write-Host "Horizon IT uninstalled. All Docker containers and volumes have been removed." -ForegroundColor Green
}
elseif ($isNative) {
    Write-Host "Native installation detected. Uninstalling..." -ForegroundColor Yellow
    
    # Stop and remove the Windows service
    Write-Host "Removing Windows Service..."
    node -e "
try {
  const Service = require('node-windows').Service;
  const svc = new Service({name:'Horizon IT', script: './next-start.js'});
  svc.on('uninstall', () => { console.log('Service uninstalled.'); process.exit(0); });
  svc.uninstall();
} catch (e) {
  console.log('Service removal skipped or failed.');
  process.exit(0);
}
"
    
    # Wait for service removal
    Start-Sleep -Seconds 5

    # Clean up generated files
    if (Test-Path "next-start.js") { Remove-Item "next-start.js" }

    # Drop the database (ask for confirmation first)
    Write-Host ""
    Write-Host "DATABASE CLEANUP" -ForegroundColor Cyan
    $confirm = Read-Host "This will DELETE all data in the 'horizon_it' database. Type YES to confirm"
    if ($confirm -eq "YES") {
        Write-Host "Dropping database and user..."
        if (Test-Path ".env") {
            $dbUrlContent = Get-Content .env | Select-String "DATABASE_URL"
            if ($dbUrlContent -match "postgresql://[^:]+:([^@]+)@") {
                $env:PGPASSWORD = $Matches[1]
            }
        }
        
        $psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
        if (-not (Test-Path $psqlPath)) { $psqlPath = "psql" }
        
        & $psqlPath -U postgres -c "DROP DATABASE IF EXISTS horizon_it;" 2>$null
        & $psqlPath -U postgres -c "DROP USER IF EXISTS horizon_user;" 2>$null
        Write-Host "Database and user removed." -ForegroundColor Green
    } else {
        Write-Host "Database cleanup skipped." -ForegroundColor Yellow
    }

    netsh advfirewall firewall delete rule name="Horizon IT" | Out-Null
    Write-Host "Horizon IT uninstalled." -ForegroundColor Green
}
else {
    Write-Host "No active installation of Horizon IT found." -ForegroundColor Red
}

Write-Host "Uninstallation complete."
