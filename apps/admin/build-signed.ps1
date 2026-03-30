# tms Portal - Signed Build Script
# Usage: pnpm run build:admin:win (from root)

Write-Host "`n=== tms Portal - Signed Build ===" -ForegroundColor Cyan

# Navigate to admin app directory
Set-Location "$PSScriptRoot"

# Set signing environment variables
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$PSScriptRoot\admin_tauri.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "TMS2024"

# Step 1: Build
Write-Host "`n[1/2] Building tms Portal..." -ForegroundColor Yellow
pnpm tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Sign the NSIS installer
$exeFile = Get-ChildItem "$PSScriptRoot\src-tauri\target\release\bundle\nsis\*.exe" | Select-Object -First 1
if ($exeFile) {
    Write-Host "`n[2/2] Signing $($exeFile.Name)..." -ForegroundColor Yellow
    pnpm tauri signer sign $exeFile.FullName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSigned successfully!" -ForegroundColor Green
        Write-Host "  EXE: $($exeFile.FullName)" -ForegroundColor Gray
        Write-Host "  SIG: $($exeFile.FullName).sig" -ForegroundColor Gray
    } else {
        Write-Host "Signing failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No .exe found in nsis folder!" -ForegroundColor Red
    exit 1
}

# Also sign MSI if exists
$msiFile = Get-ChildItem "$PSScriptRoot\src-tauri\target\release\bundle\msi\*.msi" | Select-Object -First 1
if ($msiFile) {
    Write-Host "`nSigning MSI: $($msiFile.Name)..." -ForegroundColor Yellow
    pnpm tauri signer sign $msiFile.FullName
}

Write-Host "`n=== Build Complete! ===" -ForegroundColor Green
