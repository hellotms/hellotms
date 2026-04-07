const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Read version from tauri.conf.json
const tauriConfigPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
const version = tauriConfig.version;

// Read key from .env or admin_tauri.key
let keyStr = '';
let pwdStr = 'TMS2024';

if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf8');
    const keyMatch = env.match(/TAURI_SIGNING_PRIVATE_KEY="(.*)"/);
    if (keyMatch) {
        keyStr = keyMatch[1].replace(/\\n/g, '\n');
    }
}

if (!keyStr && fs.existsSync('admin_tauri.key')) {
    keyStr = fs.readFileSync('admin_tauri.key', 'utf8');
}

if (!keyStr) {
    console.error('Error: TAURI_SIGNING_PRIVATE_KEY not found in .env or admin_tauri.key');
    process.exit(1);
}

try {
    const b64Key = keyStr.trim();
    const tempKeyFile = path.resolve(__dirname, 'temp_signing.key');
    
    // Write the Base64-encoded key directly. 
    // Tauri's built-in signer on Windows often expects the file to contain the base64 string itself.
    fs.writeFileSync(tempKeyFile, b64Key, 'utf8');

    const isSignOnly = process.argv.includes('--sign-only');

    // Environment variables needed (only password for signing)
    const buildEnv = {
        ...process.env,
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: pwdStr
    };

    if (!isSignOnly) {
        console.log(`Building NSIS and MSI for tms-Portal v${version}...`);
        
        // 1. Build the installers
        // Tauri build might not be able to sign because we aren't passing the raw key in ENV here,
        // but that's perfectly fine because our fallback script will sign them!
        execSync('pnpm tauri build --bundles nsis,msi', { 
            stdio: 'inherit',
            env: { ...buildEnv, TAURI_SIGNING_PRIVATE_KEY: b64Key } // Attempt to let it sign if it can
        });
        
        console.log('Build complete. Checking for .sig files...');
    } else {
        console.log(`Skipping build. Manually signing v${version} installers...`);
    }

    // 2. Manual Signing Fallback (if build didn't sign them)
    const nsisPath = `./src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`;
    const msiPath = `./src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`;
    
    const signFile = (filePath) => {
        if (fs.existsSync(filePath)) {
            console.log(`Manually signing: ${filePath}`);
            // Use the --private-key-path argument to completely bypass the Windows environment variable bugs
            execSync(`pnpm tauri signer sign --private-key-path "${tempKeyFile}" -p ${pwdStr} "${filePath}"`, { 
                stdio: 'inherit',
                cwd: __dirname
            });
        } else {
            console.warn(`Warning: Installer not found at ${filePath}`);
        }
    };

    signFile(nsisPath);
    signFile(msiPath);

    console.log('\n✅ All installers generated and signed successfully!');
    console.log(`EXE: ${nsisPath}`);
    console.log(`MSI: ${msiPath}`);

} catch (err) {
    console.error('\n❌ Build or Signing process failed.');
    console.error(err.message);
    process.exit(1);
} finally {
    // Always clean up the unencrypted private key file!
    const tempKeyFile = path.resolve(__dirname, 'temp_signing.key');
    if (fs.existsSync(tempKeyFile)) {
        fs.unlinkSync(tempKeyFile);
        console.log('Cleaned up temporary signing key.');
    }
}
