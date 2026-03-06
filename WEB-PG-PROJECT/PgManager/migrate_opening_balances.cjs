const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🚀 Starting Opening Balance Migration (Shadow Mode)...\n');
  
  try {
    // 1. Fetch active monthly tenants with a positive balance
    const tenantsRes = await pool.query(`
      SELECT id, full_name, balance, owner_id 
      FROM public.tenants 
      WHERE stay_type = 'MONTHLY' 
        AND status = 'ACTIVE' 
        AND balance > 0
    `);

    const tenants = tenantsRes.rows;
    if (tenants.length === 0) {
      console.log('✅ No tenants with positive balances found for migration.');
      return;
    }

    console.log(`Found ${tenants.length} tenants requiring opening balance invoices.`);
    
    let invoicesCreated = 0;
    let totalAmount = 0;

    for (const tenant of tenants) {
      const today = new Date().toISOString().split('T')[0];
      
      await pool.query(`
        INSERT INTO public.invoices (
          tenant_id, 
          owner_id, 
          billing_period_start, 
          billing_period_end, 
          total_amount, 
          paid_amount, 
          status, 
          type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        tenant.id,
        tenant.owner_id,
        today,
        today,
        tenant.balance,
        0,
        'UNPAID',
        'OPENING_BALANCE'
      ]);

      invoicesCreated++;
      totalAmount += parseFloat(tenant.balance);
      console.log(`- Created OPENING_BALANCE for ${tenant.full_name}: ₹${tenant.balance}`);
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Tenants Processed: ${tenants.length}`);
    console.log(`Invoices Created: ${invoicesCreated}`);
    console.log(`Total Amount Snapshotted: ₹${totalAmount.toFixed(2)}`);
    console.log('--------------------------\n');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
