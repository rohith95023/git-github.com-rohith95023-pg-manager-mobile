const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Fetching allocate_payment function...");
    const res = await client.query(`
        SELECT proname, prosrc 
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE proname = 'allocate_payment'
        AND nspname = 'public'
    `);
    
    if (res.rows.length === 0) {
        console.log("allocate_payment NOT FOUND");
    } else {
        console.log(res.rows[0].prosrc);
    }

    await client.end();
}

main().catch(console.error);
