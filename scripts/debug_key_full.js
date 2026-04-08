const fs = require('fs');
const path = require('path');

const relPath = process.argv[2] || '../apps/admin/real_tauri.key';
const keyPath = path.resolve(__dirname, relPath);

if (!fs.existsSync(keyPath)) {
    console.error("Not found: " + keyPath);
    process.exit(1);
}

const raw = fs.readFileSync(keyPath, 'utf8').trim();
const lines = raw.split(/\r?\n/);
if (lines.length < 2) {
    console.error("Invalid format");
    process.exit(1);
}

const base64Part = lines[1].replace(/[\s\t\r\n]/g, '');
const keyData = Buffer.from(base64Part, 'base64');

const sig = keyData.slice(0, 2).toString();
const keyId = keyData.slice(3, 11).toString('base64');
const pubKey = keyData.slice(11, 43).toString('base64');

const fullPubKey = Buffer.concat([Buffer.from("RW"), keyData.slice(3, 11), keyData.slice(11, 43)]);
const fullBase64 = fullPubKey.toString('base64');

console.log(`--- Result for ${path.basename(keyPath)} ---`);
console.log("Sig Prefix:", sig);
console.log("Key ID (base64):", keyId);
console.log("Public Key (base64):", pubKey);
console.log("Tauri PubKey Format:", fullBase64);
console.log("-------------------------------------------\n");
