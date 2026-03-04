import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trtgklorqjuoxdfsflop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRydGdrbG9ycWp1b3hkZnNmbG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDUyMTgsImV4cCI6MjA4ODEyMTIxOH0.nkRzFwVgxisi_RHFT5tzipiF7jlf8SC6jnGW7E_kKfk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select('id, slug, title, is_published');

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    console.log('Projects found:', JSON.stringify(data, null, 2));

    const demo1 = data.find(p => p.slug === 'demo-1');
    if (demo1) {
        console.log('demo-1 exists. is_published:', demo1.is_published);
    } else {
        console.log('demo-1 does not exist.');
    }
}

checkProjects();
