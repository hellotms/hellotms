const fs = require('fs');
const { execSync } = require('child_process');

// Read the encrypted private key from .env
const env = fs.readFileSync('.env', 'utf8');
const keyMatch = env.match(/TAURI_SIGNING_PRIVATE_KEY="(.*)"/);
let keyStr = keyMatch[1].replace(/\\n/g, '\n');

// Write to a temporary file with LF (Unix) line endings
fs.writeFileSync('sign.key', keyStr, { encoding: 'utf8', flag: 'w' });

try {
    console.log('Attempting to sign with LF-only key file...');
    execSync('pnpm tauri signer sign -k sign.key -p TMS2024 ./src-tauri/target/release/bundle/nsis/tms-Portal_0.1.5_x64-setup.exe', { stdio: 'inherit' });
    console.log('Success!');
} catch (err) {
    console.error('Failed to sign with LF key file.');
} finally {
    if (fs.existsSync('sign.key')) fs.unlinkSync('sign.key');
}
