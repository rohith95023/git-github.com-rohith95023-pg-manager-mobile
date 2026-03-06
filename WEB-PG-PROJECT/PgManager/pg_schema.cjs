
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    // Check columns of invoices
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices'");
    console.log("Invoices schema:");
    res.rows.forEach(r => console.log(r.column_name, r.data_type));
    
    // Check constraint errors
    try {
        await client.query("SELECT * FROM invoices LIMIT 1");
        console.log("SELECT OK.");
    } catch (e) {
        console.error("SELECT Error:", e.message);
    }
    await client.end();
}

main().catch(console.error);
