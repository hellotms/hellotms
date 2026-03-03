const fs = require('fs');
const content = fs.readFileSync('apps/admin/src/pages/SettingsPage.tsx', 'utf8');

const updated = content.replace(/'profile"\)/g, "'profile')");
fs.writeFileSync('apps/admin/src/pages/SettingsPage.tsx', updated);
console.log('Fixed SettingsPage.tsx quotes safely');
