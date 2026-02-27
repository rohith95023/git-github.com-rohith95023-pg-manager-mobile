import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xdzshjbepsntlavtcmpp.supabase.co';
const supabaseKey = 'sb_publishable_xPl9e_Q2KCWEp6UbA6UMow_X-VtiIgM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBeds() {
    const roomId = '0215a6bc-9d4b-4feb-952b-087b79217718';
    
    console.log(`Fetching beds for Room: ${roomId}`);

    try {
        const { data: beds, error } = await supabase
            .from('beds')
            .select('*')
            .eq('roomId', roomId);

        if (error) {
            console.error('Error fetching beds code:', error.code);
            console.error('Error fetching beds msg:', error.message);
        } else {
            console.log('Beds count:', beds ? beds.length : 0);
            if (beds && beds.length > 0) {
                beds.forEach(b => {
                    console.log(`Bed ${b.bedNumber}: Status=${b.status}, Tenant=${b.tenantId}`);
                });
            }
        }

        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (roomError) {
             console.error('Error fetching room code:', roomError.code);
             console.error('Error fetching room msg:', roomError.message);
        } else {
             console.log(`Room: Capacity=${room.capacity}, Occupancy=${room.currentOccupancy}, Status=${room.status}`);
        }

    } catch (e) {
        console.error("Exception:", e);
    }
}

await checkBeds();
