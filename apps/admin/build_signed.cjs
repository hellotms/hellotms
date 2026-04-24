/**
 * Build & Sign Helper for Tauri v2
 * Usage: node build_signed.cjs
 * 
 * This reads the private key from admin_tauri.key, builds the app,
 * and then signs it using Tauri CLI.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const keyPath = path.resolve(__dirname, 'admin_tauri.key');

if (!fs.existsSync(keyPath)) {
    console.error('❌ admin_tauri.key not found!');
    process.exit(1);
}

const key = fs.readFileSync(keyPath, 'utf8').trim();

const env = {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: key,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'TMS2024'
};

// Load version from tauri.conf.json
const tauriConf = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src-tauri/tauri.conf.json'), 'utf8'));
const version = tauriConf.version;

console.log(`🔑 Key loaded. Building v${version} with auto-signing...\n`);

try {
    // Step 1: Build
    execSync('pnpm tauri build --bundles nsis', {
        cwd: __dirname,
        stdio: 'inherit',
        env
    });

    // Step 2: Check if .sig was auto-generated, if not, sign manually
    const exePath = path.resolve(__dirname, `src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`);
    const sigPath = exePath + '.sig';

    if (!fs.existsSync(sigPath)) {
        console.log('\n⚠️ .sig not auto-generated. Signing manually...');
        execSync(`npx tauri signer sign "${exePath}"`, {
            cwd: __dirname,
            stdio: 'inherit',
            env
        });
    }

    if (fs.existsSync(sigPath)) {
        const sigSize = fs.statSync(sigPath).size;
        console.log(`\n✅ Build & Sign complete!`);
        console.log(`📦 EXE: tms-Portal_${version}_x64-setup.exe`);
        console.log(`🔏 SIG: tms-Portal_${version}_x64-setup.exe.sig (${sigSize} bytes)`);
    } else {
        console.error('\n❌ Signing failed - .sig file not found');
        process.exit(1);
    }
} catch (e) {
    console.error('\n❌ Build failed');
    process.exit(1);
}
