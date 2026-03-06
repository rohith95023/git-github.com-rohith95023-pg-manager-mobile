
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    const res = await client.query("SELECT enum_range(NULL::payment_status)");
    console.log("payment_status ENUM:", res.rows[0]);
    await client.end();
}

main().catch(console.error);
