
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    const res = await client.query("SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename = 'payments'");
    console.log("Payments RLS Policies:");
    res.rows.forEach(r => console.log(r));

    await client.end();
}

main().catch(console.error);
