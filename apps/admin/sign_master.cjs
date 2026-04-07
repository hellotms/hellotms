const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Tauri 2 Ultimate Signer (Failsafe v3.5 - Binary Perfect)
 * 
 * Strict line endings and NO trailing newline to fix "Symbol 10" error.
 */

function solve() {
    console.log("🚀 Starting Ultimate Signing Process (v3.5 - Binary Perfect)...");

    const keyFiles = ['real_tauri.key', 'admin_tauri.key', 'tauri_key', 'tauri.key'];
    const passwords = ["TMS2024", ""];
    
    // Read version from tauri.conf.json to be dynamic
    let version = "0.1.5";
    try {
        const conf = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src-tauri/tauri.conf.json'), 'utf8'));
        version = conf.version;
    } catch (e) {}

    const targets = [
        `./src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`,
        `./src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`
    ];

    for (const target of targets) {
        const fullTargetPath = path.resolve(__dirname, target);
        if (!fs.existsSync(fullTargetPath)) continue;

        console.log(`\n🖋️ Signing: ${target}`);
        let success = false;

        for (const kFile of keyFiles) {
            const kFilePath = path.resolve(__dirname, kFile);
            if (!fs.existsSync(kFilePath)) continue;
            
            for (const pwd of passwords) {
                console.log(`🔍 Trying: ${kFile} with pwd: "${pwd || '(empty)'}"`);
                const tempKeyPath = path.resolve(__dirname, 'perfect_binary.key');
                
                try {
                    const raw = fs.readFileSync(kFilePath, 'utf8').trim();
                    let decoded = raw.includes('\n') ? raw : Buffer.from(raw, 'base64').toString('utf8');
                    
                    const lines = decoded.split(/\r?\n/).filter(l => l.trim().length > 0);
                    if (lines.length >= 2) {
                        // Line 2 must be clean base64
                        lines[1] = lines[1].replace(/[^A-Za-z0-9+/=]/g, '');
                        // Force 4 lines if 2-line version
                        if (lines.length === 2) {
                            lines.push("trusted comment: update");
                            lines.push("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
                        }
                    }
                    
                    // Crucial: JOIN with \n but NO newline at the absolute end of file!
                    const cleanKey = lines.slice(0, 4).join('\n'); 
                    fs.writeFileSync(tempKeyPath, cleanKey, { encoding: 'utf8' });

                    // Set Environment Variables also as fallback
                    const env = { ...process.env };
                    env.TAURI_SIGNING_PRIVATE_KEY = cleanKey;
                    env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = pwd;

                    execSync(`pnpm tauri signer sign --private-key-path "${tempKeyPath}" -p "${pwd}" "${fullTargetPath}"`, { 
                        stdio: 'inherit',
                        cwd: __dirname,
                        env: env
                    });

                    console.log(`✅ Success for ${target} with ${kFile}!`);
                    success = true;
                    break;
                } catch (e) {
                    // Try next combination
                } finally {
                    if (fs.existsSync(tempKeyPath)) {
                        fs.unlinkSync(tempKeyPath);
                    }
                }
            }
            if (success) break;
        }
    }
}

solve();
