const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Pure Node.js Minisign Signer (Zero Dependencies)
 * This script bypasses the Tauri CLI to ensure compatibility.
 */

function run() {
    console.log("🚀 Starting Pure Node Signing (Bikolpo Method)...");

    const keyPath = path.resolve(__dirname, 'admin_tauri.key');
    if (!fs.existsSync(keyPath)) {
        console.error("❌ Error: real_tauri.key not found.");
        return;
    }

    try {
        const raw = fs.readFileSync(keyPath, 'utf8').trim();
        const base64Part = raw.split(/\r?\n/)[1].replace(/[\s\t\r\n]/g, '');
        const keyData = Buffer.from(base64Part, 'base64');

        // Extract raw components from the minisign unencrypted key format (RWR)
        // Offset 3: Key ID (8 bytes)
        // Offset 12: Public Key (32 bytes)
        // Offset 44: Secret Key (32 bytes)
        const keyID = keyData.slice(3, 11);
        const secretKey = keyData.slice(44, 76);

        // Prepare the PKCS#8 header for Ed25519
        const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
        const pkcs8Key = Buffer.concat([pkcs8Header, secretKey]);

        const privateKey = crypto.createPrivateKey({
            key: pkcs8Key,
            format: 'der',
            type: 'pkcs8'
        });

        function signFile(filePath) {
            const fullPath = path.resolve(__dirname, filePath);
            if (!fs.existsSync(fullPath)) {
                console.warn(`⚠️ Skipping: ${filePath} (Not found)`);
                return;
            }

            console.log(`🖋️ Signing ${path.basename(filePath)}...`);
            const content = fs.readFileSync(fullPath);
            
            // 1. Signature of the content
            const signature = crypto.sign(null, content, privateKey);
            
            // 2. Trusted comment
            const trustedCommentString = `trusted comment: update 0.1.5\n`;
            const trustedComment = Buffer.from(trustedCommentString);
            
            // 3. Global signature (Signature of (signature + trusted comment))
            const globalSignature = crypto.sign(null, Buffer.concat([signature, trustedComment]), privateKey);
            
            // 4. Construct the .sig file output
            const sigLines = [
                "untrusted comment: signature from minisign secret key",
                Buffer.concat([keyID, signature]).toString('base64'),
                trustedCommentString.trim(),
                globalSignature.toString('base64')
            ];

            const sigFilename = fullPath + ".sig";
            fs.writeFileSync(sigFilename, sigLines.join('\n') + '\n');
            console.log(`✅ Success: ${path.basename(sigFilename)} generated.`);
        }

        const version = "0.1.5";
        signFile(`./src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`);
        signFile(`./src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`);

        console.log("\n✨ Final Conclusion: Signature fixed without Tauri CLI!");

    } catch (e) {
        console.error("\n❌ Signing failed:");
        console.error(e.message);
        if (e.stack) console.error(e.stack);
    }
}

run();
