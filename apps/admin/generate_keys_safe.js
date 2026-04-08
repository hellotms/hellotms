import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Generate a fresh Tauri/Minisign compatible key pair and save to files.
 * This avoids CLI output capture issues.
 */
function generateKey() {
    console.log("Creating fresh Ed25519 key pair...");
    
    // 1. Generate Ed25519 keys
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    // Extract raw bytes (Ed25519 keys are 32 bytes)
    // SPKI for Ed25519: header + 32 bytes pubkey
    const pubRaw = publicKey.slice(-32);
    // PKCS8 for Ed25519: header + 32 bytes privkey
    const privRaw = privateKey.slice(-32);

    // 2. Create a random 8-byte Key ID
    const keyID = crypto.randomBytes(8);

    // 3. Construct Minisign UNENCRYPTED Secret Key (RWR)
    // Format: RW (2) | KDF (1) | KeyID (8) | PubKey (32) | EncAlgo (1) | PrivKey (32) | ChecksumAlgo (1) | Checksum (32)
    const secretKeyContent = Buffer.alloc(107);
    secretKeyContent.write('RWR', 0); // 2 bytes 'RW' + 3rd byte 'R'? No, Minisign signature is 2 bytes. 
    // Wait, let's match the exact format:
    const data = Buffer.alloc(107);
    data[0] = 0x52; // R
    data[1] = 0x57; // W
    data[2] = 0x00; // No KDF
    keyID.copy(data, 3);
    pubRaw.copy(data, 11);
    data[43] = 0x00; // No Encryption
    privRaw.copy(data, 44);
    data[76] = 0x00; // No Checksum
    // data 77-107 remains 0

    const privateKeyFile = [
        "untrusted comment: rsign secret key",
        data.toString('base64'),
        ""
    ].join('\n');

    // 4. Construct Minisign Public Key
    const pubData = Buffer.alloc(42);
    pubData[0] = 0x52; // R
    pubData[1] = 0x57; // W
    keyID.copy(pubData, 2);
    pubRaw.copy(pubData, 10);
    const publicKeyBase64 = pubData.toString('base64');

    // 5. Save Files
    fs.writeFileSync('admin_tauri.key', privateKeyFile);
    fs.writeFileSync('admin_tauri.pub', publicKeyBase64);

    return { publicKey: publicKeyBase64, keyID: keyID.toString('hex') };
}

const info = generateKey();
console.log("✅ Success!");
console.log("Public Key (for tauri.conf.json):", info.publicKey);
console.log("Secret Key saved to: admin_tauri.key");
