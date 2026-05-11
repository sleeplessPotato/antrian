# Setup script for Windows (PowerShell)
Write-Host "Setting up Antrian BPOM Lubuklinggau..." -ForegroundColor Cyan

Write-Host "`n[1/4] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed." -ForegroundColor Red; exit 1 }

Write-Host "`n[2/4] Creating .env file..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env created from .env.example" -ForegroundColor Green
} else {
    Write-Host ".env already exists, skipping." -ForegroundColor Gray
}

Write-Host "`n[3/4] Running database migrations..." -ForegroundColor Yellow
npm run db:migrate
if ($LASTEXITCODE -ne 0) { Write-Host "Migration failed." -ForegroundColor Red; exit 1 }

Write-Host "`n[4/4] Seeding initial data..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) { Write-Host "Seed failed." -ForegroundColor Red; exit 1 }

Write-Host "`nSetup complete! Run: npm run dev" -ForegroundColor Green
Write-Host "Admin: admin / admin123" -ForegroundColor Cyan
Write-Host "Staff: petugas1 / petugas123" -ForegroundColor Cyan
