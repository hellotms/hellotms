const fs = require('fs');
const path = require('path');

try {
    const keyPath = path.resolve('apps/admin/admin_tauri.key');
    const raw = fs.readFileSync(keyPath, 'utf8').trim();
    const base64Part = raw.split(/\r?\n/)[1].replace(/[\s\t\r\n]/g, '');
    const keyData = Buffer.from(base64Part, 'base64');
    
    // Minisign unencrypted secret key: [3:Header (RWR), 8:ID, 1:SKId, 32:PubKey, 32:SecKey, 8:Checksum]
    // Actually, looking at the layout:
    // Index 0,1,2: RWR
    // Index 3-10: Key ID
    // Index 11: SKId?
    // Index 12-43: Public Key
    
    const header = Buffer.from("RWR");
    const keyID = keyData.slice(3, 11);
    const publicKey = keyData.slice(12, 44);
    
    const fullPubKeyBuf = Buffer.concat([header, keyID, publicKey]);
    const fullPubKeyStr = fullPubKeyBuf.toString('base64');
    
    console.log("GENERATED_PUBKEY:", fullPubKeyStr);

    const tauriConfPath = 'apps/admin/src-tauri/tauri.conf.json';
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    console.log("CURRENT_PUBKEY :", tauriConf.plugins.updater.pubkey);
    
    if (tauriConf.plugins.updater.pubkey === fullPubKeyStr) {
        console.log("✅ PERFECT MATCH!");
    } else {
        console.log("❌ MISMATCH! Updating tauri.conf.json...");
        tauriConf.plugins.updater.pubkey = fullPubKeyStr;
        fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
        console.log("✅ FIXED!");
    }
} catch (e) {
    console.error(e);
}
