const { execSync } = require('child_process');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const keyMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY="(.*)"/);
let keyStr = keyMatch ? keyMatch[1] : '';

// Replace literal \n with actual newline
keyStr = keyStr.replace(/\\n/g, '\n');

const pwdMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD="(.*)"/);
const pwdStr = pwdMatch ? pwdMatch[1] : '';

fs.writeFileSync('temp.key', keyStr);

try {
  console.log("Generating sig file...");
  const output = execSync('pnpm tauri signer sign -k temp.key -p ' + pwdStr + ' ./src-tauri/target/release/bundle/nsis/tms-Portal_0.1.5_x64-setup.exe', { stdio: 'inherit' });
  console.log("Sig file generated.");
} catch(e) {
  console.error("Sign failed", e);
} finally {
  fs.unlinkSync('temp.key');
}
