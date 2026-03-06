
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    // Check types
    const r1 = await client.query("SELECT enum_range(NULL::payment_type)");
    console.log("payment_type:", r1.rows[0]);

    // Check payment method
    const r2 = await client.query("SELECT enum_range(NULL::payment_method)");
    console.log("payment_method:", r2.rows[0]);

    await client.end();
}

main().catch(console.error);
