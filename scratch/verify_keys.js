const fs = require('fs');
const path = require('path');

try {
    const keyPath = path.resolve('apps/admin/admin_tauri.key');
    const raw = fs.readFileSync(keyPath, 'utf8').trim();
    const base64Part = raw.split(/\r?\n/)[1].replace(/[\s\t\r\n]/g, '');
    const keyData = Buffer.from(base64Part, 'base64');
    
    // Minisign unencrypted secret key format:
    // Offset 0-2: Signature (RWR)
    // Offset 3-10: Key ID
    // Offset 11: Secret Key ID?
    // Offset 12-43: Public Key
    const publicKey = keyData.slice(12, 44).toString('base64');
    console.log("Derived Public Key (Base64):", publicKey);

    const tauriConf = JSON.parse(fs.readFileSync('apps/admin/src-tauri/tauri.conf.json', 'utf8'));
    console.log("Tauri Conf Public Key:", tauriConf.plugins.updater.pubkey);
    
    if (tauriConf.plugins.updater.pubkey.includes(publicKey)) {
        console.log("✅ MATCH! The public key in config matches the secret key.");
    } else {
        console.log("❌ MISMATCH! The keys do not match.");
    }
} catch (e) {
    console.error(e);
}
