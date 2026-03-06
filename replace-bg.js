import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminSrcPath = path.join(__dirname, 'apps/admin/src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Replace stark black backgrounds added by previous script with material card color
    content = content.replace(/dark:bg-\[#0a0a0a\]/g, 'dark:bg-[#1c1c1c]');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.relative(__dirname, filePath)}`);
        return true;
    }
    return false;
}

function walkDir(dir) {
    let updatedCount = 0;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            updatedCount += walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            if (processFile(fullPath)) {
                updatedCount++;
            }
        }
    }
    return updatedCount;
}

console.log('Replacing generic black with material card background...');
const count = walkDir(adminSrcPath);
console.log(`Done. Updated ${count} files.`);
