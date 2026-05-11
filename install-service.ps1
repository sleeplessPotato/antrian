# install-service.ps1
# Daftarkan aplikasi sebagai Windows Service agar otomatis jalan saat PC menyala.
# Jalankan sebagai Administrator: klik kanan PowerShell -> "Run as administrator"

$ErrorActionPreference = "Stop"
$serviceName = "AntriaBPOM"
$projectDir  = $PSScriptRoot

# Cek hak Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR: Script ini harus dijalankan sebagai Administrator." -ForegroundColor Red
    Write-Host "Klik kanan PowerShell -> 'Run as administrator', lalu jalankan ulang." -ForegroundColor Yellow
    Write-Host ""
    pause; exit 1
}

# Cari node.exe
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "ERROR: Node.js tidak ditemukan. Install dari https://nodejs.org" -ForegroundColor Red
    pause; exit 1
}
$nodePath = $nodeCmd.Source

# Cek tsx
$tsxCli = Join-Path $projectDir "node_modules\tsx\dist\cli.mjs"
if (-not (Test-Path $tsxCli)) {
    Write-Host "ERROR: tsx tidak ditemukan. Jalankan 'npm install' terlebih dahulu." -ForegroundColor Red
    pause; exit 1
}

# Cek/unduh NSSM
$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmCmd) {
    $nssmExe = $nssmCmd.Source
} else {
    $toolsDir = Join-Path $projectDir "tools"
    $nssmExe  = Join-Path $toolsDir "nssm.exe"
    if (-not (Test-Path $nssmExe)) {
        Write-Host "Mengunduh NSSM (service manager)..." -ForegroundColor Yellow
        $zipPath     = Join-Path $env:TEMP "nssm.zip"
        $extractPath = Join-Path $env:TEMP "nssm-temp"
        Invoke-WebRequest "https://nssm.cc/release/nssm-2.24.zip" -OutFile $zipPath -UseBasicParsing
        Expand-Archive $zipPath $extractPath -Force
        New-Item -ItemType Directory $toolsDir -Force | Out-Null
        $src = Get-ChildItem "$extractPath\nssm-2.24\win64\nssm.exe" -ErrorAction SilentlyContinue
        if (-not $src) {
            $src = Get-ChildItem "$extractPath\*\win64\nssm.exe" -Recurse | Select-Object -First 1
        }
        Copy-Item $src.FullName $nssmExe
        Remove-Item $zipPath, $extractPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "NSSM berhasil diunduh." -ForegroundColor Green
    }
}

# Hapus service lama jika ada
$existing = Get-Service $serviceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Menghapus service lama '$serviceName'..." -ForegroundColor Yellow
    & $nssmExe stop $serviceName 2>$null
    Start-Sleep -Seconds 2
    & $nssmExe remove $serviceName confirm
    Start-Sleep -Seconds 1
}

# Buat folder logs
$logsDir = Join-Path $projectDir "logs"
New-Item -ItemType Directory $logsDir -Force | Out-Null

# Install service
Write-Host "Menginstall service '$serviceName'..." -ForegroundColor Yellow
$serverScript = Join-Path $projectDir "server.ts"
& $nssmExe install $serviceName $nodePath "`"$tsxCli`" `"$serverScript`""
& $nssmExe set $serviceName AppDirectory      $projectDir
& $nssmExe set $serviceName AppEnvironmentExtra "NODE_ENV=production" "PATH=$env:PATH"
& $nssmExe set $serviceName Start             SERVICE_AUTO_START
& $nssmExe set $serviceName AppStdout         (Join-Path $logsDir "app.log")
& $nssmExe set $serviceName AppStderr         (Join-Path $logsDir "app-error.log")
& $nssmExe set $serviceName AppRotateFiles    1
& $nssmExe set $serviceName AppRotateBytes    10485760

# Mulai service
Write-Host "Memulai service..." -ForegroundColor Yellow
& $nssmExe start $serviceName
Start-Sleep -Seconds 4

$svc = Get-Service $serviceName -ErrorAction SilentlyContinue
Write-Host ""
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "✓ Berhasil! Aplikasi berjalan dan akan otomatis start saat PC menyala." -ForegroundColor Green
} else {
    Write-Host "Service terinstall. Status: $($svc.Status). Cek logs jika ada masalah." -ForegroundColor Yellow
    Write-Host "  Log: $logsDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Perintah berguna (jalankan sebagai Admin):" -ForegroundColor Cyan
Write-Host "  .\uninstall-service.ps1       — hapus service"
Write-Host "  nssm restart $serviceName     — restart aplikasi"
Write-Host "  nssm stop    $serviceName     — matikan aplikasi"
Write-Host "  nssm start   $serviceName     — nyalakan aplikasi"
Write-Host ""
pause
