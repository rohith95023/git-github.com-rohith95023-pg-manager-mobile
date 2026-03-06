const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking Triggers on public.pgs, public.rooms, public.tenants...");
    const res = await client.query(`
        SELECT event_object_table, trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table IN ('pgs', 'rooms', 'tenants')
        AND trigger_schema = 'public'
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
