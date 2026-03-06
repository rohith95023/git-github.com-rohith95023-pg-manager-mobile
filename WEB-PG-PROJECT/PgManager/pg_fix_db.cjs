const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Dropping old constraint...");
    await client.query('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_billing_period_start_key');
    
    console.log("Adding new unique constraint (tenant_id, billing_period_start, type)...");
    await client.query('ALTER TABLE invoices ADD CONSTRAINT invoices_tenant_id_period_type_key UNIQUE (tenant_id, billing_period_start, type)');
    
    console.log("Cleaning up and fixing Rohith's data...");
    await client.query('DELETE FROM invoices WHERE tenant_id = \'1498cf03-d3ed-440a-8520-f7ea9bd875de\'');
    
    // Insert RENT (Rent + One-time Maint if applicable)
    // Rohith: Rent 2000, Maint 99 (one-time), Deposit 500
    // The onboarding logic or RPC will handle maint. For now let's just insert what should be there.
    await client.query(`
        INSERT INTO public.invoices (tenant_id, owner_id, billing_period_start, billing_period_end, total_amount, paid_amount, status, type)
        VALUES ('1498cf03-d3ed-440a-8520-f7ea9bd875de', '8f96ebbd-681f-4bd8-95c7-011700a931af', '2026-03-01', '2026-03-31', 2099, 0, 'UNPAID', 'RENT')
    `);
    
    await client.query(`
        INSERT INTO public.invoices (tenant_id, owner_id, billing_period_start, billing_period_end, total_amount, paid_amount, status, type)
        VALUES ('1498cf03-d3ed-440a-8520-f7ea9bd875de', '8f96ebbd-681f-4bd8-95c7-011700a931af', '2026-03-01', '2026-03-01', 500, 0, 'UNPAID', 'DEPOSIT')
    `);

    console.log("Done.");
    await client.end();
}

main().catch(console.error);
