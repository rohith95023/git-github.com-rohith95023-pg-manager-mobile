const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function simulateGeneration() {
  console.log('🧪 Simulating Monthly Invoice Generation (Dry Run)...\n');
  
  try {
    // 1. Fetch the primary test tenant
    const tenantRes = await pool.query(`
      SELECT 
        t.id, 
        t.full_name, 
        t.move_in_date, 
        COALESCE(t.rent_per_month, r.rent, 0) as rent,
        COALESCE(t.maintenance_amount, 0) as maint,
        t.maintenance_type,
        t.balance as current_db_balance
      FROM public.tenants t
      LEFT JOIN public.rooms r ON t.room_id = r.id
      WHERE t.full_name = 'AAAAAAAAA' 
      LIMIT 1
    `);

    const tenant = tenantRes.rows[0];
    if (!tenant) {
      console.log('❌ Tenant "AAAAAAAAA" not found.');
      return;
    }

    // 2. Fetch latest invoice info
    const invoiceRes = await pool.query(`
      SELECT billing_period_start, type, total_amount
      FROM public.invoices
      WHERE tenant_id = $1
      ORDER BY billing_period_start DESC
      LIMIT 1
    `, [tenant.id]);

    const latestInvoice = invoiceRes.rows[0];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`--- Tenant: ${tenant.full_name} ---`);
    console.log(`- Move-in Date: ${tenant.move_in_date}`);
    console.log(`- Latest Invoice Start: ${latestInvoice?.billing_period_start || 'NONE'}`);
    console.log(`- Latest Invoice Type: ${latestInvoice?.type || 'N/A'}`);
    
    // 3. Simulation Logic (matching generate_monthly_invoices RPC)
    let nextStart = new Date(latestInvoice ? latestInvoice.billing_period_start : tenant.move_in_date);
    nextStart.setMonth(nextStart.getMonth() + 1);
    
    console.log(`- Next Calculated Cycle Start: ${nextStart.toISOString().split('T')[0]}`);
    console.log(`- Current System Date: ${todayStr}`);

    let invoicesToGenerate = 0;
    let tempNext = new Date(nextStart);
    while (tempNext <= today) {
        invoicesToGenerate++;
        tempNext.setMonth(tempNext.getMonth() + 1);
    }

    const monthlyCharge = parseFloat(tenant.rent) + (tenant.maintenance_type === 'monthly' ? parseFloat(tenant.maint) : 0);
    const projectedInvoiceTotal = parseFloat(tenant.current_db_balance) + (invoicesToGenerate * monthlyCharge);

    console.log(`\n--- Generation Projection ---`);
    console.log(`- Pending Cycles Detected: ${invoicesToGenerate}`);
    console.log(`- Monthly Charge per Cycle: ₹${monthlyCharge.toFixed(2)}`);
    console.log(`- Projected New Invoice Balance: ₹${projectedInvoiceTotal.toFixed(2)}`);

    // 4. Running Balance Comparison (Anniversary Logic)
    const moveIn = new Date(tenant.move_in_date);
    let monthDiff = (today.getFullYear() - moveIn.getFullYear()) * 12 + (today.getMonth() - moveIn.getMonth());
    if (today.getDate() >= moveIn.getDate()) monthDiff++;
    monthDiff = Math.max(1, monthDiff);

    // Fetch total paid for accurate running balance
    const payRes = await pool.query('SELECT SUM(amount) as paid FROM public.payments WHERE tenant_id = $1 AND status IN (\'PAID\', \'COMPLETED\')', [tenant.id]);
    const totalPaid = parseFloat(payRes.rows[0]?.paid || 0);
    
    let expectedTotalDebt = monthDiff * parseFloat(tenant.rent);
    if (tenant.maintenance_type === 'monthly') expectedTotalDebt += (monthDiff * parseFloat(tenant.maint));
    else if (tenant.maintenance_type === 'one_time') expectedTotalDebt += parseFloat(tenant.maint);

    const runningBalance = Math.max(0, expectedTotalDebt - totalPaid);

    console.log(`\n--- Shadow Mode Comparison ---`);
    console.log(`- Running Balance (Legacy): ₹${runningBalance.toFixed(2)}`);
    console.log(`- Projected Invoice Balance: ₹${projectedInvoiceTotal.toFixed(2)}`);
    
    const diff = Math.abs(runningBalance - projectedInvoiceTotal);
    console.log(`- Net Difference: ₹${diff.toFixed(2)}`);

    if (diff <= 1) {
      console.log('\n✅ SIMULATION SUCCESS: Invoice logic aligns with running balance.');
      console.log('Action: It is safe to run generate_monthly_invoices().');
    } else {
      console.log('\n❌ SIMULATION FAILED: Mismatch detected.');
      console.log('Hold: Do not run generate_monthly_invoices yet.');
    }

  } catch (err) {
    console.error('Simulation error:', err);
  } finally {
    await pool.end();
  }
}

simulateGeneration();
