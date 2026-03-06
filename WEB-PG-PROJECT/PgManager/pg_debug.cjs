
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    // Check latest tenants
    const res = await client.query('SELECT id, full_name, stay_type, created_at FROM tenants ORDER BY created_at DESC LIMIT 5');
    console.log("Latest tenants:", res.rows);

    if (res.rows.length > 0) {
        // Check invoices for the latest tenant
        const q2 = await client.query('SELECT * FROM invoices WHERE tenant_id = $1', [res.rows[0].id]);
        console.log(`Invoices for newest tenant (${res.rows[0].full_name}):`, q2.rows);

        const q3 = await client.query('SELECT * FROM billing_logs WHERE tenant_id = $1', [res.rows[0].id]);
        console.log(`Logs for newest tenant:`, q3.rows);

        // Check if there's any partials
        const q4 = await client.query('SELECT SUM(total_amount - paid_amount) as bal FROM invoices WHERE tenant_id = $1 AND status IN (\'UNPAID\', \'PARTIAL\')', [res.rows[0].id]);
        console.log(`Computed Balance for newest tenant:`, q4.rows[0]);
    }

    await client.end();
}

main().catch(console.error);
