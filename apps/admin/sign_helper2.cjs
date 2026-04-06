const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');

const envContent = fs.readFileSync('.env', 'utf-8');
const keyMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY="(.*)"/);
let keyStr = keyMatch ? keyMatch[1] : '';
const pwdMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD="(.*)"/);
const pwdStr = pwdMatch ? pwdMatch[1] : '';

// Replace literal \n with an ACTUAL physical newline
keyStr = keyStr.replace(/\\n/g, '\n');

console.log("Generating sig file with direct spawn...");
const isWin = os.platform() === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(pnpmCmd, [
  'tauri', 'signer', 'sign',
  '-p', pwdStr,
  '-k', keyStr,
  'src-tauri/target/release/bundle/nsis/tms-Portal_0.1.5_x64-setup.exe'
], { stdio: 'inherit', shell: false });

console.log('Finished with status', result.status);
