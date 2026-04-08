const fs = require('fs');
const path = require('path');

// Assuming the script is in /scripts and the key is in /apps/admin
const keyPath = path.resolve(__dirname, '..', 'apps', 'admin', 'real_tauri.key');
if (!fs.existsSync(keyPath)) {
    console.error("not found at " + keyPath);
    process.exit(1);
}

const raw = fs.readFileSync(keyPath, 'utf8').trim();
const lines = raw.split(/\r?\n/);
if (lines.length < 2) {
    console.error("invalid key file format");
    process.exit(1);
}

const base64Part = lines[1].replace(/[\s\t\r\n]/g, '');
const keyData = Buffer.from(base64Part, 'base64');

// Minisign unencrypted secret key format:
// Byte 0-1: Signature (RWR)
// Byte 2: KDF algo (0)
// Byte 3-10: Key ID
// Byte 11-42: Public Key (32 bytes)
// Byte 43: Encryption algo (0)
// Byte 44-75: Secret Key (32 bytes)

const pubKey = keyData.slice(11, 43);
console.log("Extracted Public Key (base64):", pubKey.toString('base64'));
