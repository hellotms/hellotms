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

# Helper function to sign and verify
function Sign-TauriFile($filePath) {
    if (Test-Path $filePath) {
        $fileName = Split-Path $filePath -Leaf
        Write-Host "`nSigning: $fileName..." -ForegroundColor Yellow
        pnpm tauri signer sign "$filePath"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Signed successfully: $fileName" -ForegroundColor Green
            # Print signature content for convenience
            if (Test-Path "$filePath.sig") {
                $sig = Get-Content "$filePath.sig" -Raw
                Write-Host "Signature for your update server:" -ForegroundColor Gray
                Write-Host $sig -ForegroundColor White
            }
        } else {
            Write-Host "FAILED TO SIGN: $fileName" -ForegroundColor Red
            exit 1
        }
    }
}

# Step 2: Sign all installers
Write-Host "`n[2/2] Signing Installers..." -ForegroundColor Yellow

# Sign EXE files (NSIS)
Get-ChildItem "$PSScriptRoot\src-tauri\target\release\bundle\nsis\*.exe" | ForEach-Object {
    Sign-TauriFile $_.FullName
}

# Sign MSI files
Get-ChildItem "$PSScriptRoot\src-tauri\target\release\bundle\msi\*.msi" | ForEach-Object {
    Sign-TauriFile $_.FullName
}

Write-Host "`n=== Build & Signing Complete! ===" -ForegroundColor Green
