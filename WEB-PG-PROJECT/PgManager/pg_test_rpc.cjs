const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    // Check RPC source
    const res = await client.query(`
        SELECT pg_get_functiondef(p.oid) as def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'generate_monthly_invoices'
    `);
    fs.writeFileSync('generate_monthly_invoices.sql', res.rows[0].def);
    console.log("Written");

    await client.end();
}

main().catch(console.error);
