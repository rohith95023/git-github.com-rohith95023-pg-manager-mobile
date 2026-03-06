const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Fetching active monthly tenants...");
    const tenants = await client.query(`
        SELECT t.id, t.full_name, t.move_in_date, t.rent_per_month, t.maintenance_amount, t.maintenance_type, t.security_deposit, r.rent as room_rent, t.owner_id
        FROM public.tenants t
        LEFT JOIN public.rooms r ON t.room_id = r.id
        WHERE t.status = 'ACTIVE' 
          AND t.stay_type = 'MONTHLY'
    `);

    for (const r_tenant of tenants.rows) {
        console.log(`Processing tenant: ${r_tenant.full_name}`);
        
        const invoiceRes = await client.query(`SELECT MAX(billing_period_start) as last_date FROM public.invoices WHERE tenant_id = $1 AND type = 'RENT'`, [r_tenant.id]);
        let v_last_invoice_date = invoiceRes.rows[0].last_date;
        let v_next_invoice_date;
        let v_is_first_invoice;

        if (v_last_invoice_date === null) {
            v_next_invoice_date = new Date(r_tenant.move_in_date);
            v_is_first_invoice = true;
        } else {
            v_next_invoice_date = new Date(v_last_invoice_date);
            v_next_invoice_date.setMonth(v_next_invoice_date.getMonth() + 1);
            v_is_first_invoice = false;
        }

        const today = new Date();
        while (v_next_invoice_date <= today) {
            const startStr = v_next_invoice_date.toISOString().split('T')[0];
            
            // Rent Invoice
            const rent = Number(r_tenant.rent_per_month || r_tenant.room_rent || 0);
            let maint = 0;
            if (r_tenant.maintenance_type === 'monthly') {
                maint = Number(r_tenant.maintenance_amount || 0);
            } else if (r_tenant.maintenance_type === 'one_time' && v_is_first_invoice) {
                maint = Number(r_tenant.maintenance_amount || 0);
            }
            
            const total = rent + maint;
            if (total > 0) {
                const end = new Date(v_next_invoice_date);
                end.setMonth(end.getMonth() + 1);
                end.setDate(end.getDate() - 1);
                console.log(`Creating RENT invoice: ${startStr} (Amount: ${total})`);
                await client.query(`
                    INSERT INTO public.invoices (tenant_id, owner_id, billing_period_start, billing_period_end, total_amount, paid_amount, status, type)
                    VALUES ($1, $2, $3, $4, $5, 0, 'UNPAID', 'RENT')
                `, [r_tenant.id, r_tenant.owner_id, startStr, end.toISOString().split('T')[0], total]);
            }

            // Deposit Invoice
            if (v_is_first_invoice && Number(r_tenant.security_deposit || 0) > 0) {
                console.log(`Creating DEPOSIT invoice: ${r_tenant.security_deposit}`);
                await client.query(`
                    INSERT INTO public.invoices (tenant_id, owner_id, billing_period_start, billing_period_end, total_amount, paid_amount, status, type)
                    VALUES ($1, $2, $3, $3, $4, 0, 'UNPAID', 'DEPOSIT')
                `, [r_tenant.id, r_tenant.owner_id, startStr, r_tenant.security_deposit]);
            }
            
            v_next_invoice_date.setMonth(v_next_invoice_date.getMonth() + 1);
            v_is_first_invoice = false;
        }
    }

    console.log("Manual sync complete.");
    await client.end();
}

main().catch(console.error);
