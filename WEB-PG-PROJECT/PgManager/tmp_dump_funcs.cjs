const { Client } = require('pg');
const fs = require('fs');

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
    
    let out = "";
    res.rows.forEach(row => {
        out += `--- FUNCTION: ${row.proname} ---\n`;
        out += row.prosrc;
        out += '\n------------------------------\n';
    });

    fs.writeFileSync('funcs_dump.txt', out);
    console.log("Dumped to funcs_dump.txt");

    await client.end();
}

main().catch(console.error);
