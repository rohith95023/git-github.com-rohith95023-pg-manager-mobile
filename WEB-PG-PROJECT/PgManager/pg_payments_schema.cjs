
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    const res = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='payments'");
    console.log("Payments schema:");
    res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type}) NULL: ${r.is_nullable}`));

    await client.end();
}

main().catch(console.error);
