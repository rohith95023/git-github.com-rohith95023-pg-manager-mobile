import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xdzshjbepsntlavtcmpp.supabase.co';
const supabaseKey = 'sb_publishable_xPl9e_Q2KCWEp6UbA6UMow_X-VtiIgM';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase client initialized.");

const { data, error } = await supabase.from('beds').select('id, bedNumber, status').limit(2);

if (error) {
    console.error("Error:", error);
} else {
    console.log("Data:", data);
}
