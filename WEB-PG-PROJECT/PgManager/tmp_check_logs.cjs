const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking Billing Logs...");
    const res = await client.query(`SELECT * FROM public.billing_logs ORDER BY created_at DESC LIMIT 20`);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
