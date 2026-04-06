const { execSync } = require('child_process');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const keyMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY="(.*)"/);
let keyStr = keyMatch ? keyMatch[1] : '';

// The Tauri CLI on Windows appears to expect ONLY the base64 part of the key.
// "untrusted comment: rsign encrypted secret key\n" is 44 characters long.
if (keyStr.includes('\\n')) {
  keyStr = keyStr.split('\\n')[1];
} else if (keyStr.includes('\n')) {
  keyStr = keyStr.split('\n')[1];
}

const pwdMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD="(.*)"/);
const pwdStr = pwdMatch ? pwdMatch[1] : '';

try {
  console.log("Generating sig file with base64 only...");
  const command = `npx cross-env TAURI_SIGNING_PRIVATE_KEY="${keyStr}" TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${pwdStr}" pnpm run sign-win`;
  execSync(command, { stdio: 'inherit' });
  console.log("Sig file generated.");
} catch(e) {
  console.error("Sign failed", e.status);
}
