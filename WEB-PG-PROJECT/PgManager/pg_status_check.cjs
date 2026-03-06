const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    const tenants = await client.query("SELECT id, full_name, stay_type, status, owner_id FROM tenants WHERE status != 'DELETED'");
    console.log("Active Tenants:", tenants.rows);

    const invoices = await client.query("SELECT id, tenant_id, type, total_amount, paid_amount, status FROM invoices");
    console.log("All Invoices:", invoices.rows);

    const logs = await client.query("SELECT * FROM billing_logs ORDER BY created_at DESC LIMIT 5");
    console.log("Recent Billing Logs:", logs.rows);

    await client.end();
}

main().catch(console.error);
