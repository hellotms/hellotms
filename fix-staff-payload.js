const fs = require('fs');
let c = fs.readFileSync('apps/admin/src/pages/StaffPage.tsx', 'utf8');

c = c.replace(
    /mutationFn:\s*async\s*\(\s*values:\s*{\s*email:\s*string;\s*full_name:\s*string;\s*role_id:\s*string\s*}\s*\)\s*=>\s*\{\s*const result = await staffApi\.invite\(\s*values\s*\)/,
    `mutationFn: async (values: { email: string; full_name: string; role_id: string }) => {
      const result = await staffApi.invite({ email: values.email, name: values.full_name, role_id: values.role_id, format: 'extended' })`
);

fs.writeFileSync('apps/admin/src/pages/StaffPage.tsx', c);
console.log('Successfully mapped custom payload inputs within UI matching api fetch');
