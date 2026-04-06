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
    const isSignOnly = process.argv.includes('--sign-only');

    if (!isSignOnly) {
        console.log(`Building NSIS and MSI for tms-Portal v${version}...`);
        
        // The working trick: Pass the BASE64 encoded version of the key as the environment variable
        // Tauri CLI on Windows handles base64 content in the env var better than file paths.
        const buildEnv = {
            ...process.env,
            TAURI_SIGNING_PRIVATE_KEY: keyStr,
            TAURI_SIGNING_PRIVATE_KEY_PASSWORD: pwdStr
        };
        
        // 1. Build the installers
        execSync('pnpm tauri build --bundles nsis,msi', { 
            stdio: 'inherit',
            env: buildEnv
        });
        
        console.log('Build complete. Checking for .sig files...');
    } else {
        console.log(`Skipping build. Manually signing v${version} installers...`);
    }

    const buildEnv = {
        ...process.env,
        TAURI_SIGNING_PRIVATE_KEY: keyStr,
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: pwdStr
    };
    
    // 2. Manual Signing Fallback (if build didn't sign them)
    const nsisPath = `./src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`;
    const msiPath = `./src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`;
    
    const signFile = (filePath) => {
        if (fs.existsSync(filePath) && !fs.existsSync(`${filePath}.sig`)) {
            console.log(`Manually signing: ${filePath}`);
            // Use the same env var trick for manual signing call
            execSync(`pnpm tauri signer sign ${filePath}`, { 
                stdio: 'inherit',
                env: buildEnv
            });
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
}
