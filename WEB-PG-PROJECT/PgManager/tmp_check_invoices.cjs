const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking Invoices...");
    
    const count = await client.query(`SELECT status, count(*) FROM public.invoices GROUP BY status`);
    console.log("\nInvoices counts:\n", count.rows);

    const invoices = await client.query(`SELECT * FROM public.invoices LIMIT 5`);
    console.log("\nSample Invoices:\n", invoices.rows);

    await client.end();
}

main().catch(console.error);
