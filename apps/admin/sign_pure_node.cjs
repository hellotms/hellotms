const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Pure Node.js Minisign Signer (Zero Dependencies)
 * 
 * Key format (107 bytes, Tauri/rsign simplified):
 *   [0-1]   sig_alg:  2 bytes ("RW" = 0x52, 0x57)
 *   [2]     kdf_alg:  1 byte  (0x00 = unencrypted)
 *   [3-10]  key_id:   8 bytes
 *   [11-74] ed25519_sk: 64 bytes (32-byte seed + 32-byte derived pubkey)
 *   [75-106] ed25519_pk: 32 bytes
 * 
 * Signature format (.sig file, minisign-compatible):
 *   Line 1: untrusted comment: <text>
 *   Line 2: base64( sig_alg[2] + key_id[8] + signature[64] ) = 74 bytes
 *   Line 3: trusted comment: <text>
 *   Line 4: base64( global_signature[64] )
 * 
 *   global_signature = Ed25519_sign( signature[64] || trusted_comment_text )
 */

function run() {
    console.log("🚀 Starting Pure Node Signing (Fixed Minisign Method)...");

    const keyPath = path.resolve(__dirname, 'admin_tauri.key');
    if (!fs.existsSync(keyPath)) {
        console.error("❌ Error: admin_tauri.key not found at", keyPath);
        return;
    }

    try {
        const raw = fs.readFileSync(keyPath, 'utf8').trim();
        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        
        if (lines.length < 2) {
            console.error("❌ Error: Key file must have at least 2 lines (comment + base64)");
            return;
        }

        const base64Part = lines[1].trim();
        const keyData = Buffer.from(base64Part, 'base64');

        console.log(`🔑 Key data size: ${keyData.length} bytes`);

        // Verify key format
        if (keyData[0] !== 0x52 || keyData[1] !== 0x57) {
            console.error("❌ Error: Key does not start with 'RW' algorithm marker");
            return;
        }

        // Extract components from the key
        const keyID = keyData.slice(3, 11);         // 8 bytes: Key ID
        const ed25519Seed = keyData.slice(11, 43);   // 32 bytes: Ed25519 seed (CORRECT offset!)
        
        console.log(`🔑 Key ID: ${keyID.toString('hex')}`);

        // Create Ed25519 private key from seed using PKCS#8 DER format
        const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
        const pkcs8Key = Buffer.concat([pkcs8Header, ed25519Seed]);

        const privateKey = crypto.createPrivateKey({
            key: pkcs8Key,
            format: 'der',
            type: 'pkcs8'
        });

        // Verify: derive public key and compare with stored pubkey
        const publicKey = crypto.createPublicKey(privateKey);
        const pubKeyDer = publicKey.export({ type: 'spki', format: 'der' });
        const derivedPubBytes = pubKeyDer.slice(-32); // Last 32 bytes of SPKI DER
        const storedPubBytes = keyData.slice(75, 107);
        
        if (derivedPubBytes.equals(storedPubBytes)) {
            console.log("✅ Key verification PASSED: derived pubkey matches stored pubkey");
        } else {
            console.error("❌ WARNING: derived pubkey does NOT match stored pubkey!");
            console.error("   Derived:", derivedPubBytes.toString('hex'));
            console.error("   Stored: ", storedPubBytes.toString('hex'));
            return;
        }

        // Load version from tauri.conf.json
        const tauriConfPath = path.resolve(__dirname, './src-tauri/tauri.conf.json');
        const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
        const version = tauriConf.version;
        console.log(`📦 Targeted Version: ${version}`);

        function signFile(filePath) {
            const fullPath = path.resolve(__dirname, filePath);
            if (!fs.existsSync(fullPath)) {
                console.warn(`⚠️ Skipping: ${filePath} (Not found)`);
                return;
            }

            console.log(`🖋️ Signing ${path.basename(filePath)}...`);
            const content = fs.readFileSync(fullPath);
            
            // 1. Ed25519 signature of the file content (64 bytes)
            const signature = crypto.sign(null, content, privateKey);
            
            // 2. Minisign signature line: sig_alg(2) + key_id(8) + signature(64) = 74 bytes
            const sigAlgo = Buffer.from([0x45, 0x64]); // "Ed" - Ed25519 algorithm marker
            const sigLine = Buffer.concat([sigAlgo, keyID, signature]).toString('base64');
            
            // 3. Trusted comment (just the text after "trusted comment: ")
            const trustedCommentText = `timestamp:${Math.floor(Date.now() / 1000)}\tfile:${path.basename(fullPath)}`;
            
            // 4. Global signature: Ed25519_sign( signature_bytes(64) || trusted_comment_text )
            const globalSigInput = Buffer.concat([
                signature,
                Buffer.from(trustedCommentText)
            ]);
            const globalSignature = crypto.sign(null, globalSigInput, privateKey);
            
            // 5. Construct the .sig file (4 lines, minisign standard format)
            const sigLines = [
                "untrusted comment: signature from minisign secret key",
                sigLine,
                `trusted comment: ${trustedCommentText}`,
                globalSignature.toString('base64')
            ];

            const sigFilename = fullPath + ".sig";
            fs.writeFileSync(sigFilename, sigLines.join('\n') + '\n');
            console.log(`✅ Success: ${path.basename(sigFilename)} generated (${sigLine.length} chars sig line)`);
            
            // Print the signature for easy copy-paste to admin panel
            console.log(`📋 Full .sig content for admin panel:\n${sigLines.join('\\n')}\n`);
        }

        signFile(`./src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`);
        signFile(`./src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`);

        console.log("\n✨ Signing complete! Signatures should now be valid for Tauri v2 auto-updater.");

    } catch (e) {
        console.error("\n❌ Signing failed:");
        console.error(e.message);
        if (e.stack) console.error(e.stack);
    }
}

run();
