const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    // Check all invoices
    const invoiceRes = await client.query(`SELECT id, tenant_id, status, type, total_amount, paid_amount FROM invoices`);
    console.log("All Invoices:", invoiceRes.rows);

    await client.end();
}

main().catch(console.error);
