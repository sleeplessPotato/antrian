# Setup script for Windows (PowerShell)
# Run as Administrator for port forwarding setup

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")

Write-Host "Setting up Antrian BPOM Lubuklinggau..." -ForegroundColor Cyan

Write-Host "`n[1/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed." -ForegroundColor Red; exit 1 }

Write-Host "`n[2/5] Creating .env file..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env created from .env.example" -ForegroundColor Green
} else {
    Write-Host ".env already exists, skipping." -ForegroundColor Gray
}

Write-Host "`n[3/5] Running database migrations..." -ForegroundColor Yellow
npm run db:migrate
if ($LASTEXITCODE -ne 0) { Write-Host "Migration failed." -ForegroundColor Red; exit 1 }

Write-Host "`n[4/5] Seeding initial data..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) { Write-Host "Seed failed." -ForegroundColor Red; exit 1 }

Write-Host "`n[5/5] Configuring port forwarding (80 -> 3000)..." -ForegroundColor Yellow
if ($isAdmin) {
    netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=3000 connectaddress=127.0.0.1 | Out-Null
    netsh advfirewall firewall add rule name="Antrian BPOM Port 80" dir=in action=allow protocol=tcp localport=80 | Out-Null
    Write-Host "Port forwarding configured: port 80 -> 3000" -ForegroundColor Green
} else {
    Write-Host "Skipped (not Administrator). Jalankan ulang sebagai Administrator untuk setup port 80." -ForegroundColor DarkYellow
    Write-Host "Atau jalankan manual: netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=3000 connectaddress=127.0.0.1" -ForegroundColor Gray
}

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor Cyan
Write-Host "  1. npm run build" -ForegroundColor White
Write-Host "  2. .\install-service.ps1  (sebagai Administrator)" -ForegroundColor White
Write-Host ""
Write-Host "Akses aplikasi (ganti IP sesuai PC server):" -ForegroundColor Cyan
Write-Host "  http://<IP-SERVER>/          <- Kiosk" -ForegroundColor White
Write-Host "  http://<IP-SERVER>/display   <- Display TV" -ForegroundColor White
Write-Host "  http://<IP-SERVER>/dashboard <- Petugas" -ForegroundColor White
Write-Host ""
Write-Host "Admin: admin / admin123" -ForegroundColor Cyan
Write-Host "Staff: petugas1 / petugas123" -ForegroundColor Cyan
