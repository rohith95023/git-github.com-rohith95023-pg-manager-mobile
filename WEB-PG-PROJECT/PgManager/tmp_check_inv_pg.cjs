const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking Invoices and their PG IDs (via Tenants)...");
    const res = await client.query(`
        SELECT i.id, i.tenant_id, t.pg_id, t.full_name, t.status as tenant_status
        FROM public.invoices i
        JOIN public.tenants t ON i.tenant_id = t.id
        WHERE i.status = 'PAID'
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
