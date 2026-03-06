const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Fetching function definitions for archive and restore...");
    const res = await client.query(`
        SELECT proname, prosrc 
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE proname IN ('archive_pg_cascade', 'restore_pg_cascade', 'hard_delete_pg_cascade') 
        AND nspname = 'public'
    `);
    
    res.rows.forEach(row => {
        console.log(`--- FUNCTION: ${row.proname} ---`);
        console.log(row.prosrc);
        console.log('------------------------------');
    });

    await client.end();
}

main().catch(console.error);
