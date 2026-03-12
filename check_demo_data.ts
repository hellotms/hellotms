import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  fs.writeFileSync('g:/hellotms.com.bd/diag_output.json', JSON.stringify({ error: 'Missing env vars' }));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diag() {
  const result: any = {};
  
  try {
    // 1. Find demo project
    const { data: projects } = await supabase.from('projects').select('id, title').ilike('title', '%demo%');
    result.projects = projects;
    
    if (projects && projects.length > 0) {
      const pId = projects[0].id;
      
      // 2. Check ledger entries for this project
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('project_id', pId)
        .eq('type', 'expense');
      
      result.entries_all = entries;
      
      // 3. Check filtered entries
      const { data: filtered } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('project_id', pId)
        .eq('type', 'expense')
        .or('is_external.eq.false,is_external.is.null')
        .is('deleted_at', null);
      
      result.entries_filtered = filtered;
    }
  } catch (e: any) {
    result.error = e.message;
  }
  
  fs.writeFileSync('g:/hellotms.com.bd/diag_output.json', JSON.stringify(result, null, 2));
}

diag();
