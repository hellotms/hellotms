const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync('apps/admin/src-tauri/tauri.conf.json', 'utf8'));
const targetPub = config.plugins.updater.pubkey;
const targetData = Buffer.from(targetPub, 'base64');
const targetId = targetData.slice(2, 10).toString('hex');

console.log(`Target Key ID (from config): ${targetId}`);

const keys = [
  'apps/admin/admin_tauri.key',
  'apps/admin/real_tauri.key',
  'apps/admin/tauri.key',
  'apps/admin/test.key'
];

keys.forEach(k => {
  if (!fs.existsSync(k)) return;
  const raw = fs.readFileSync(k, 'utf8').split(/\r?\n/)[1];
  if (!raw) return;
  const data = Buffer.from(raw, 'base64');
  const id = data.slice(3, 11).toString('hex');
  console.log(`Key: ${k} | ID: ${id} | ${id === targetId ? 'MATCH! ✅' : 'no match'}`);
});
