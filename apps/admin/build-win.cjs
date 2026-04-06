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
    console.log(`Building tms-Portal v${version}...`);
    // Pass the actual content of the key, not the path
    const buildEnv = {
        ...process.env,
        TAURI_SIGNING_PRIVATE_KEY: keyStr,
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: pwdStr
    };
    
    execSync('pnpm tauri build', { 
        stdio: 'inherit',
        env: buildEnv
    });
    
    console.log('Build complete. Checking for .sig files...');
    
    // Fallback: If for some reason Tauri v2 didn't generate .sig, try manual sign
    const nsisPath = `./src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`;
    const msiPath = `./src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`;
    
    if (fs.existsSync(nsisPath) && !fs.existsSync(`${nsisPath}.sig`)) {
        console.log('Manual signing NSIS...');
        execSync(`pnpm tauri signer sign -k admin_tauri.key -p ${pwdStr} ${nsisPath}`, { stdio: 'inherit' });
    }
    
    if (fs.existsSync(msiPath) && !fs.existsSync(`${msiPath}.sig`)) {
        console.log('Manual signing MSI...');
        execSync(`pnpm tauri signer sign -k admin_tauri.key -p ${pwdStr} ${msiPath}`, { stdio: 'inherit' });
    }

} catch (err) {
    console.error('Build or Sign failed');
    process.exit(1);
}
