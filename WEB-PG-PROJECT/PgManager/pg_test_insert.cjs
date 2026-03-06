
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function testInsert() {
    await client.connect();
    
    // Get newest tenant
    const res = await client.query('SELECT * FROM tenants WHERE stay_type = \'MONTHLY\' ORDER BY created_at DESC LIMIT 1');
    const tenant = res.rows[0];
    
    if (tenant) {
        console.log("Found tenant:", tenant.full_name, "rent:", tenant.rent_per_month, tenant.custom_rent);
        
        const initialRent = Number(tenant.rent_per_month || tenant.custom_rent || 0);

        const startDate = new Date(tenant.move_in_date);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        if (endDate.getDate() !== startDate.getDate()) {
            endDate.setDate(0);
        } else {
            endDate.setDate(endDate.getDate() - 1);
        }

        const payload = {
            tenant_id: tenant.id,
            owner_id: tenant.owner_id,
            type: 'RENT',
            total_amount: initialRent,
            paid_amount: 0,
            status: 'UNPAID',
            billing_period_start: tenant.move_in_date,
            billing_period_end: endDate.toISOString().split('T')[0]
        };

        console.log("Attempting to insert invoice:", payload);
        
        try {
            const result = await client.query(`
                INSERT INTO invoices (tenant_id, owner_id, type, total_amount, paid_amount, status, billing_period_start, billing_period_end)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
            `, [
                payload.tenant_id, payload.owner_id, payload.type, payload.total_amount, payload.paid_amount, payload.status, payload.billing_period_start, payload.billing_period_end
            ]);
            console.log("Insert success:", result.rows[0]);
        } catch (e) {
            console.error("Insert failed:", e.message);
        }
    }

    await client.end();
}

testInsert().catch(console.error);
