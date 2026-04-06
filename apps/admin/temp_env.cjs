const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf-8');

const keyMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY="(.*)"/);
let keyStr = keyMatch ? keyMatch[1] : '';
const pwdMatch = envContent.match(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD="(.*)"/);
const pwdStr = pwdMatch ? pwdMatch[1] : '';

// Replace literal \n with an ACTUAL physical newline in the output file
const fixedKeyStr = keyStr.replace(/\\n/g, '\n');

fs.writeFileSync('temp.env', `TAURI_SIGNING_PRIVATE_KEY="${fixedKeyStr}"\nTAURI_SIGNING_PRIVATE_KEY_PASSWORD="${pwdStr}"`);
