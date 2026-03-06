
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    // Check latest tenant
    const res = await client.query("SELECT * FROM tenants WHERE stay_type = 'MONTHLY' ORDER BY created_at DESC LIMIT 1");
    const t = res.rows[0];
    if (t) {
        console.log("Tenant:", t.full_name, t.id);
        
        const q2 = await client.query("SELECT * FROM invoices WHERE tenant_id = $1", [t.id]);
        console.log("Invoices:", q2.rows);

        const q3 = await client.query("SELECT * FROM payments WHERE tenant_id = $1", [t.id]);
        console.log("Payments:", q3.rows);

        const q4 = await client.query("SELECT * FROM payment_allocations");
        console.log("Allocations:", q4.rows.filter(a => q3.rows.find(p => p.id === a.payment_id)));
    }
    await client.end();
}

main().catch(console.error);
