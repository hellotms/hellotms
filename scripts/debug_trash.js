const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'apps', 'admin', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrash() {
  const { data, error, count } = await supabase
    .from('trash_bin')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching trash:', error);
    return;
  }

  console.log(`Total items in trash_bin: ${count}`);
  if (data.length > 0) {
    console.log('Sample item types:', [...new Set(data.map(i => i.entity_type))]);
  } else {
    console.log('No items found in trash_bin.');
  }
}

checkTrash();
