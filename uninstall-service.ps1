# uninstall-service.ps1
# Hapus service Windows AntriaBPOM.
# Jalankan sebagai Administrator.

$ErrorActionPreference = "Stop"
$serviceName = "AntriaBPOM"
$projectDir  = $PSScriptRoot

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Jalankan sebagai Administrator." -ForegroundColor Red
    pause; exit 1
}

$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmCmd) {
    $nssmExe = $nssmCmd.Source
} else {
    $nssmExe = Join-Path $projectDir "tools\nssm.exe"
}

if (-not (Test-Path $nssmExe)) {
    Write-Host "ERROR: NSSM tidak ditemukan." -ForegroundColor Red
    pause; exit 1
}

$svc = Get-Service $serviceName -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host "Service '$serviceName' tidak ditemukan." -ForegroundColor Yellow
    pause; exit 0
}

Write-Host "Menghentikan dan menghapus service '$serviceName'..." -ForegroundColor Yellow
& $nssmExe stop $serviceName 2>$null
Start-Sleep -Seconds 2
& $nssmExe remove $serviceName confirm

Write-Host ""
Write-Host "✓ Service '$serviceName' berhasil dihapus." -ForegroundColor Green
Write-Host "  Aplikasi tidak akan lagi berjalan otomatis saat PC menyala." -ForegroundColor Gray
Write-Host ""
pause
