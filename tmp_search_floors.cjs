const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Searching for functions that reference 'floors'...");
    
    const query = `
        SELECT 
            n.nspname as schema,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND pg_get_functiondef(p.oid) ILIKE '%floors%';
    `;
    
    const res = await client.query(query);
    
    console.log(`Found ${res.rowCount} functions referencing 'floors'.`);
    
    for (const row of res.rows) {
        console.log(`\n--- Function: ${row.function_name} ---`);
        console.log(row.definition);
    }

    await client.end();
}

main().catch(console.error);
