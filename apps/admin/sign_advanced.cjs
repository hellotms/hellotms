const fs = require('fs');
const path = require('path');
const minisign = require('minisign');

/**
 * Advanced Tauri 2 Signer using the 'minisign' library.
 * This bypasses the Tauri CLI to ensure compatibility with 2-line keys
 * and exact control over the signing process.
 */

async function run() {
    console.log("🚀 Starting Advanced Signing Process...");

    // 1. Configuration
    const pwd = Buffer.from("TMS2024");
    const version = "0.1.5";
    const keyPath = path.resolve(__dirname, 'admin_tauri.key');
    
    const filesToSign = [
        path.resolve(__dirname, `src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`),
        path.resolve(__dirname, `src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`)
    ];

    if (!fs.existsSync(keyPath)) {
        console.error("❌ Key file not found.");
        return;
    }

    try {
        // 2. Load and Fix Key
        const b64Key = fs.readFileSync(keyPath, 'utf8').trim();
        let rawKey = Buffer.from(b64Key, 'base64').toString('utf8');
        
        // Ensure 4-line format for the library if it's 2-line
        const lines = rawContentLines(rawKey);
        if (lines.length === 2) {
            lines.push('trusted comment: TMS Update Key');
            lines.push('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
        }
        
        const fixedKeyBuffer = Buffer.from(lines.join('\n'));
        
        // 3. Parse and Extract Secret Key
        console.log("🔑 Extracting Secret Key...");
        const skInfo = minisign.parseSecretKey(fixedKeyBuffer);
        const skDetails = minisign.extractSecretKey(pwd, skInfo);

        // 4. Sign Files
        for (const filePath of filesToSign) {
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Skipping: ${filePath} (Not found)`);
                continue;
            }

            console.log(`🖋️ Signing: ${path.basename(filePath)}`);
            const content = fs.readFileSync(filePath);
            
            // Sign the content
            const sigResult = minisign.signContent(content, skDetails, {
                comment: 'signature from minisign secret key',
                tComment: 'trusted comment: TMS Update'
            });

            // Write the .sig file
            const sigPath = filePath + ".sig";
            fs.writeFileSync(sigPath, sigResult.outputBuf);
            console.log(`✅ Generated: ${path.basename(sigPath)}`);
        }

        console.log("\n✨ All done! Client khushi hobe ebar.");

    } catch (err) {
        console.error("\n❌ Signing failed:");
        console.error(err.message);
        if (err.stack) console.error(err.stack);
    }
}

function rawContentLines(raw) {
    return raw.split(/\r?\n/)
              .filter(l => l.trim() !== '')
              .map((l, i) => i === 1 ? l.replace(/\s/g, '') : l);
}

run();
