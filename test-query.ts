import { supabase } from "./src/lib/supabaseClient";

async function testPayments() {
    const { data, error } = await supabase.from('payments').select(`
        *, 
        pgs!pg_id(name), 
        tenants!tenant_id(full_name, status, move_in_date, rooms!room_id(room_number, floor), pgs!pg_id(name), beds!bed_id(bed_number)), 
        bookings!reservation_id(status, tenants!tenant_id(full_name), rooms!room_id(room_number), pgs!pg_id(name))
    `).order("payment_date", { ascending: false }).limit(5);

    if (error) {
        console.error("Error fetching payments:", error);
    } else {
        console.log("Payments data sample:", JSON.stringify(data?.[0], null, 2));
    }
}

testPayments();
