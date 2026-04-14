import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trtgklorqjuoxdfsflop.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRydGdrbG9ycWp1b3hkZnNmbG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDUyMTgsImV4cCI6MjA4ODEyMTIxOH0.nkRzFwVgxisi_RHFT5tzipiF7jlf8SC6jnGW7E_kKfk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .is('deleted_at', null);
  
  if (error) {
    console.error('Error fetching team_members:', error);
  } else {
    console.log('Team Members Count:', data?.length);
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

check();
