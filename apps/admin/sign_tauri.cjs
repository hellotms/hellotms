const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  const keyPath = path.join(__dirname, 'tauri.key');
  
  if (!fs.existsSync(keyPath)) {
    console.error('tauri.key not found in ' + keyPath);
    process.exit(1);
  }

  const keyContent = fs.readFileSync(keyPath, 'utf8').trim();
  const password = 'TMS2024';
  const setupFile = './src-tauri/target/release/bundle/nsis/tms-Portal_0.1.5_x64-setup.exe';

  console.log('Signing file:', setupFile);
  console.log('Using key from tauri.key');

  try {
    // Run the signer using Node's environment to avoid PowerShell escaping issues.
    // We pass the key content exactly as it is in the file.
    execSync(`pnpm tauri signer sign -p ${password} ${setupFile}`, {
      env: {
        ...process.env,
        TAURI_SIGNING_PRIVATE_KEY: keyContent
      },
      stdio: 'inherit'
    });
    console.log('Successfully signed!');
  } catch (err) {
    console.error('Signing failed:', err.message);
    process.exit(1);
  }
}

run();
