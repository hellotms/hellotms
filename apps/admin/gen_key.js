import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
    console.log("Generating new Tauri key...");
    const output = execSync('npx tauri signer generate --password TMS2024', { encoding: 'utf8' });
    
    // Extract Private Key
    const privateMatch = output.match(/Private: \(Keep it secret!\)\s*\n([\s\S]*?)\n\nPublic: /);
    const publicMatch = output.match(/Public: \(Don't forget to add it to your tauri\.conf\.json\)\s*\n(.*)\n/);

    if (!privateMatch || !publicMatch) {
        throw new Error("Could not parse keys from output:\n" + output);
    }

    const privateKeyRaw = privateMatch[1].trim();
    const publicKey = publicMatch[1].trim();

    // The private key might have information text mixed in or line breaks.
    // Let's clean it.
    const privateLines = privateKeyRaw.split('\n').map(l => l.trim()).filter(l => l && !l.includes('you must use this private key'));
    const privateKey = privateLines.join('\n');

    fs.writeFileSync('admin_tauri.key', privateKey);
    fs.writeFileSync('admin_tauri.pub', publicKey);

    console.log("Success!");
    console.log("Public Key:", publicKey);
    console.log("Private Key saved to admin_tauri.key");

} catch (err) {
    console.error("Critical Failure:");
    console.error(err.message);
    if (err.stdout) console.log("STDOUT:", err.stdout);
}
