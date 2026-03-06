
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    const invoiceRes = await client.query(`SELECT status, type, total_amount, paid_amount FROM invoices WHERE status IN ('UNPAID', 'PARTIAL')`);
    console.log("Invoices pending dues raw data:");
    console.log(invoiceRes.rows);

    let invoiceTot = 0;
    invoiceRes.rows.forEach(i => {
        invoiceTot += (Number(i.total_amount) - Number(i.paid_amount || 0));
    });
    console.log("Total Invoice Dues:", invoiceTot);

    const dailyRes = await client.query(`SELECT move_in_date, vacate_date, rent_per_day, paid_amount, maintenance_amount FROM daily_stay_details JOIN tenants ON daily_stay_details.tenant_id = tenants.id WHERE tenants.stay_type = 'DAILY' AND tenants.status = 'ACTIVE'`);
    console.log("Daily pending dues raw data:");
    console.log(dailyRes.rows);

    await client.end();
}

main().catch(console.error);
