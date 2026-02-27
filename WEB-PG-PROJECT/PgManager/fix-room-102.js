import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xdzshjbepsntlavtcmpp.supabase.co';
const supabaseKey = 'sb_publishable_xPl9e_Q2KCWEp6UbA6UMow_X-VtiIgM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRoom102() {
    const roomId = '0215a6bc-9d4b-4feb-952b-087b79217718';
    
    console.log(`Fixing data for Room: ${roomId}`);

    // 1. Get Room Capacity
    const { data: room, error: roomError } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    if (roomError) {
        console.error('Error fetching room:', roomError);
        return;
    }
    console.log(`Room Capacity: ${room.capacity}`);

    // 2. Find Tenants in this room
    // Note: Tenants table uses room_id (snake_case) usually
    const { data: tenants, error: tenantError } = await supabase.from('tenants').select('*').eq('room_id', roomId);
    
    if (tenantError) {
        console.error('Error fetching tenants:', tenantError);
        // Fallback to try camelCase if snake failed? 
        // usually schemas are consistent. tenants is likely snake_case.
        return;
    }
    
    console.log(`Found ${tenants.length} tenants in this room.`);
    tenants.forEach(t => console.log(` - ${t.full_name} (${t.id})`));

    // 3. Create Beds
    const bedsToCreate = [];
    for (let i = 0; i < room.capacity; i++) {
        const tenant = tenants[i] || null;
        const bed = {
            roomId: roomId,
            bedNumber: `Bed-${i + 1}`, // Or A/B/C
            status: tenant ? 'OCCUPIED' : 'AVAILABLE',
            tenantId: tenant ? tenant.id : null, 
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        bedsToCreate.push(bed);
    }

    console.log('Creating beds:', JSON.stringify(bedsToCreate, null, 2));

    // 4. Insert Beds
    const { data: createdBeds, error: createError } = await supabase.from('beds').insert(bedsToCreate).select();
    
    if (createError) {
        console.error('Error creating beds:', createError);
        return;
    }
    
    console.log('Successfully created beds:', createdBeds.length);

    // 5. Update Tenant records with new bed_id (if any tenants found)
    for (let i = 0; i < createdBeds.length; i++) {
        const bed = createdBeds[i];
        if (bed.tenantId) {
            console.log(`Linking tenant ${bed.tenantId} to bed ${bed.id}`);
            const { error: updateError } = await supabase
                .from('tenants')
                .update({ bed_id: bed.id })
                .eq('id', bed.tenantId);
            
            if (updateError) console.error(`Failed to update tenant ${bed.tenantId}:`, updateError);
        }
    }

    // 6. Update Room Occupancy
    const newOccupancy = tenants.length;
    const newStatus = newOccupancy === 0 ? 'AVAILABLE' : (newOccupancy >= room.capacity ? 'FULL' : 'PARTIAL');
    
    const { error: roomUpdateError } = await supabase
        .from('rooms')
        .update({ currentOccupancy: newOccupancy, status: newStatus })
        .eq('id', roomId);

    if (roomUpdateError) {
        console.error('Error updating room:', roomUpdateError);
    } else {
        console.log(`Updated Room: Occupancy=${newOccupancy}, Status=${newStatus}`);
    }
}

await fixRoom102();
