import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xdzshjbepsntlavtcmpp.supabase.co';
const supabaseKey = 'sb_publishable_xPl9e_Q2KCWEp6UbA6UMow_X-VtiIgM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemaAndBeds() {
    console.log("Checking Schema...");
    // 1. Fetch ANY bed to see keys
    const { data: anyBed, error: schemaError } = await supabase
        .from('beds')
        .select('*')
        .limit(1);
    
    if (schemaError) {
        console.error("Schema fetch error:", schemaError);
    } else if (anyBed.length > 0) {
        console.log("Bed Schema Keys:", Object.keys(anyBed[0]));
    } else {
        console.log("No beds in database to check schema.");
    }

    const roomId = '0215a6bc-9d4b-4feb-952b-087b79217718';
    
    // 2. Check Beds with roomId
    const { count: countCamels, error: errCamels } = await supabase
        .from('beds')
        .select('*', { count: 'exact', head: true })
        .eq('roomId', roomId);
        
    console.log(`Count with 'roomId': ${countCamels} (Error: ${errCamels?.message})`);
    
    // 3. Check Beds with room_id
    const { count: countSnake, error: errSnake } = await supabase
        .from('beds')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);
        
    console.log(`Count with 'room_id': ${countSnake} (Error: ${errSnake?.message})`);
}

await checkSchemaAndBeds();
