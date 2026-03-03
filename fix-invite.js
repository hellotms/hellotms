const fs = require('fs');
const filePath = 'apps/admin/src/pages/StaffPage.tsx';
let c = fs.readFileSync(filePath, 'utf8');

c = c.replace(
    /mutationFn:\s*async\s*\(\w+: {\s*email: string;\s*full_name: string;\s*role_id: string\s*}\)\s*=>\s*{\s*const result = await staffApi\.invite\(\w+\)/,
    `mutationFn: async (values: { email: string; full_name: string; role_id: string }) => {
      const payload = { email: values.email, name: values.full_name, role_id: values.role_id };
      const result = await staffApi.invite(payload)`
);

fs.writeFileSync(filePath, c);
console.log('Successfully applied staff fetch parameter payload.');
