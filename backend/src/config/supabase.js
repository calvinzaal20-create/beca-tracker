const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️  WAARSCHUWING: SUPABASE_URL of SUPABASE_SERVICE_KEY ontbreekt!');
  console.error('   Stel deze in via Railway → Variables (of lokaal in backend/.env)');
  // Niet crashen zodat Railway de deploy logs kan tonen
}

// Service-role client: omzeilt Row Level Security voor server-side operaties
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
