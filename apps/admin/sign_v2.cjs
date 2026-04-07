const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Tauri 2 Signature Generator (Ultimate Fix)
 */

function solve() {
    console.log("🚀 Starting Tauri Signature Fix...");

    const keyPath = path.resolve(__dirname, 'admin_tauri.key');
    if (!fs.existsSync(keyPath)) {
        console.error("❌ Error: admin_tauri.key not found.");
        return;
    }

    // ১. কি ফাইলটি লোড করা এবং বেস-৬৪ ফরম্যাট ঠিক করা
    const b64Data = fs.readFileSync(keyPath, 'utf8').trim();
    let rawContent = Buffer.from(b64Data, 'base64').toString('utf8');
    
    // স্পেস এবং হ্যাকিং ক্যারেক্টার ক্লিন করা
    const lines = rawContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        console.error("❌ Error: Key file is corrupted.");
        return;
    }

    // ২য় লাইনের (Base64) সব স্পেস এবং অদৃশ্য ক্যারেক্টার মুছে ফেলা
    lines[1] = lines[1].replace(/[\s\t\r\n]/g, '');

    // ২-লাইন কি-কে ৪-লাইন স্ট্যান্ডার্ডে নেওয়া (Tauri compatibility)
    // Note: Generating a dummy 4th line might not work if it's strictly verified,
    // but some versions of minisign/rsign might accept it if we only sign the file.
    if (lines.length === 2) {
        lines.push('trusted comment: TMS Update Key');
        lines.push('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
    }

    const cleanKey = lines.slice(0, 4).join('\n');
    const tempKeyFile = path.resolve(__dirname, 'fixed_signing.key');
    
    // LF (Unix) লাইন এন্ডিং নিশ্চিত করা
    fs.writeFileSync(tempKeyFile, cleanKey, { encoding: 'utf8' });

    // ২. পাসওয়ার্ড চেক করা
    const envPath = path.resolve(__dirname, '.env');
    let pwd = "TMS2024"; // ডিফল্ট
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        const match = env.match(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD="(.*)"/);
        if (match) pwd = match[1];
    }

    // ৩. সাইন করা
    const version = "0.1.5";
    const exePath = `./src-tauri/target/release/bundle/nsis/tms-Portal_${version}_x64-setup.exe`;
    const msiPath = `./src-tauri/target/release/bundle/msi/tms-Portal_${version}_x64_en-US.msi`;

    const sign = (filePath) => {
        if (fs.existsSync(filePath)) {
            console.log(`\n📦 Signing: ${filePath}`);
            try {
                // Tauri 2-এর সঠিক কমান্ড
                execSync(`pnpm tauri signer sign --private-key-path "${tempKeyFile}" -p "${pwd}" "${filePath}"`, { 
                    stdio: 'inherit',
                    cwd: __dirname
                });
                console.log(`✅ Success! Sig file created.`);
            } catch (err) {
                console.error(`❌ Signing failed for ${filePath}. Password সঠিক কি না চেক করুন।`);
            }
        } else {
            console.warn(`⚠️ Warning: ${filePath} পাওয়া যায়নি।`);
        }
    };

    sign(exePath);
    sign(msiPath);

    // ক্লিনআপ
    if (fs.existsSync(tempKeyFile)) {
        fs.unlinkSync(tempKeyFile);
    }
    console.log("\n🧹 Temporary files cleaned up.");
}

solve();
