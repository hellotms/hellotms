const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const keyMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY="(.*)"/);
  const passwordMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD="(.*)"/);

  if (!keyMatch || !passwordMatch) {
    console.error('Keys not found in .env');
    process.exit(1);
  }

  // The signer file needs a real newline.
  let privateKey = keyMatch[1].replace(/\\n/g, '\n');
  const password = passwordMatch[1];
  const setupFile = './src-tauri/target/release/bundle/nsis/tms-Portal_0.1.5_x64-setup.exe';
  const keyFile = path.join(__dirname, 'temp_key.key');

  console.log('Writing key to file:', keyFile);
  fs.writeFileSync(keyFile, privateKey, 'utf8');

  console.log('Signing file:', setupFile);

  try {
    // Pass the key via file path
    execSync(`pnpm tauri signer sign -p ${password} -k ${keyFile} ${setupFile}`, {
      stdio: 'inherit'
    });
    console.log('Successfully signed!');
  } catch (err) {
    console.error('Signing failed:', err.message);
  } finally {
    // Cleanup temporary key file
    if (fs.existsSync(keyFile)) {
      fs.unlinkSync(keyFile);
    }
  }
}

run();
