require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testStats() {
    console.log("Fetching invoices...");
    const invoiceDues = await supabase.from("invoices").select("total_amount, paid_amount").in("status", ["UNPAID", "PARTIAL"]);
    
    let totalPendingDues = (invoiceDues?.data || []).reduce((sum, inv) => 
        sum + (Number(inv.total_amount) - Number(inv.paid_amount)), 0);
        
    console.log("Invoices:", invoiceDues.data);
    console.log("Total Invoice Dues:", totalPendingDues);
}
testStats();
