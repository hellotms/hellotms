/**
 * Build & Sign Helper for Tauri v2
 * Usage: node build_signed.cjs
 * 
 * This reads the private key from admin_tauri.key and invokes
 * `tauri build` with the correct environment variables.
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

console.log('🔑 Key loaded. Starting Tauri build with auto-signing...\n');

try {
    execSync('pnpm tauri build --bundles nsis', {
        cwd: __dirname,
        stdio: 'inherit',
        env: {
            ...process.env,
            TAURI_SIGNING_PRIVATE_KEY: key,
            TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'TMS2024'
        }
    });
    console.log('\n✅ Build & Sign complete!');
} catch (e) {
    console.error('\n❌ Build failed');
    process.exit(1);
}
