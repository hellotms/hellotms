import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminSrcPath = path.join(__dirname, 'apps/admin/src');

// Maps static light colors to a dark variant to ensure readability in dark mode
const colorMaps = {
    // Backgrounds
    'bg-white': 'dark:bg-[#0a0a0a]',
    'bg-gray-50': 'dark:bg-white/5',
    'bg-slate-50': 'dark:bg-white/5',
    'bg-blue-50': 'dark:bg-blue-500/10',
    'bg-blue-100': 'dark:bg-blue-500/20',
    'bg-emerald-50': 'dark:bg-emerald-500/10',
    'bg-emerald-100': 'dark:bg-emerald-500/20',
    'bg-red-50': 'dark:bg-red-500/10',
    'bg-red-100': 'dark:bg-red-500/20',
    'bg-orange-50': 'dark:bg-orange-500/10',
    'bg-orange-100': 'dark:bg-orange-500/20',
    'bg-purple-50': 'dark:bg-purple-500/10',
    'bg-purple-100': 'dark:bg-purple-500/20',
    'bg-amber-50': 'dark:bg-amber-500/10',
    'bg-amber-100': 'dark:bg-amber-500/20',
    'bg-green-50': 'dark:bg-green-500/10',
    'bg-green-100': 'dark:bg-green-500/20',
    'bg-indigo-50': 'dark:bg-indigo-500/10',
    'bg-indigo-100': 'dark:bg-indigo-500/20',
    'bg-teal-50': 'dark:bg-teal-500/10',
    'bg-teal-100': 'dark:bg-teal-500/20',

    // Hover Backgrounds
    'hover:bg-gray-50': 'dark:hover:bg-white/5',
    'hover:bg-slate-50': 'dark:hover:bg-white/5',
    'hover:bg-blue-50': 'dark:hover:bg-blue-500/10',
    'hover:bg-red-50': 'dark:hover:bg-red-500/10',

    // Text colors
    'text-gray-500': 'text-muted-foreground',
    'text-gray-600': 'text-muted-foreground',
    'text-gray-900': 'text-foreground',
    'text-slate-500': 'text-muted-foreground',
    'text-slate-600': 'text-muted-foreground',
    'text-slate-900': 'text-foreground',

    // Specific colored text adjustments for dark mode readability
    'text-blue-600': 'text-blue-600 dark:text-blue-400',
    'text-emerald-600': 'text-emerald-600 dark:text-emerald-400',
    'text-red-600': 'text-red-600 dark:text-red-400',
    'text-orange-600': 'text-orange-600 dark:text-orange-400',
    'text-purple-600': 'text-purple-600 dark:text-purple-400',
    'text-amber-600': 'text-amber-600 dark:text-amber-400',
    'text-green-600': 'text-green-600 dark:text-green-400',

    // Borders
    'border-gray-200': 'border-border',
    'border-gray-100': 'border-border',
    'border-slate-200': 'border-border',

    // Specific colored borders
    'border-blue-200': 'border-blue-200 dark:border-blue-500/30',
    'border-emerald-200': 'border-emerald-200 dark:border-emerald-500/30',
    'border-red-200': 'border-red-200 dark:border-red-500/30',
};

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    // We only want to replace tailwind classes inside className="..." or cn(...)
    // A simplistic approach is string replacement with regex, 
    // ensuring we match complete words using \b

    for (const [lightClass, darkClass] of Object.entries(colorMaps)) {
        // If the darkClass or semantic class is already present exactly after the lightClass, skip it to avoid duplicates
        // Also avoid replacing text-gray-500 to text-muted-foreground if it's already done

        // We create a regex for the exact light class
        const regex = new RegExp(`\\b${lightClass.replace(/:/g, '\\:')}\\b(?!.*\\b${darkClass.split(' ')[0].replace(/:/g, '\\:')}\\b)`, 'g');

        // For appending dark variants, we want to replace `bg-blue-50` with `bg-blue-50 dark:bg-blue-500/10`
        // If it's a semantic replacement like `text-gray-500` -> `text-muted-foreground`, we just replace it.

        if (darkClass.includes('dark:') || darkClass === 'text-muted-foreground' || darkClass === 'text-foreground' || darkClass === 'border-border') {
            if (darkClass.includes('dark:')) {
                // Append
                content = content.replace(regex, (match) => {
                    // Check if the dark variant is already nearby (simple check)
                    if (content.includes(`${match} ${darkClass}`)) return match;
                    return `${match} ${darkClass}`;
                });
            } else {
                // Replace
                content = content.replace(new RegExp(`\\b${lightClass}\\b`, 'g'), darkClass);
            }
        }
    }

    // Also replace bg-white with bg-card inside specific components if they look like cards
    // but let's stick to the map for safety.

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

console.log('Starting color migration...');
const count = walkDir(adminSrcPath);
console.log(`Migration complete. Updated ${count} files.`);
