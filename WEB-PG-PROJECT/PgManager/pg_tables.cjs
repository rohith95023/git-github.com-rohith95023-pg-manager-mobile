
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Tables in public schema:");
    res.rows.forEach(r => console.log(r.table_name));
    await client.end();
}

main().catch(console.error);
