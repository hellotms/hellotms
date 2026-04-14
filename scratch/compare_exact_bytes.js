const fs = require('fs');
const path = require('path');

const configKeyStr = "UlcLtpTo3vXvYIndy5NXIXHPx213AMLcDoSr2mpbw6JJbb770NRV3R70B";
const configBuf = Buffer.from(configKeyStr, 'base64');

const secretKeyPath = path.resolve('apps/admin/admin_tauri.key');
const secretRaw = fs.readFileSync(secretKeyPath, 'utf8').trim();
const secretBase64 = secretRaw.split(/\r?\n/)[1].trim();
const secretBuf = Buffer.from(secretBase64, 'base64');

console.log("Config Key ID:", configBuf.slice(3, 11).toString('hex'));
console.log("Secret Key ID:", secretBuf.slice(3, 11).toString('hex'));

console.log("Config PubKey:", configBuf.slice(11, 43).toString('hex'));
console.log("Secret PubKey:", secretBuf.slice(12, 44).toString('hex'));

if (configBuf.slice(3, 11).equals(secretBuf.slice(3, 11))) {
    console.log("✅ Key ID MATCH!");
} else {
    console.log("❌ Key ID MISMATCH!");
}

if (configBuf.slice(11, 43).equals(secretBuf.slice(12, 44))) {
    console.log("✅ Public Key MATCH!");
} else {
    console.log("❌ Public Key MISMATCH!");
}
