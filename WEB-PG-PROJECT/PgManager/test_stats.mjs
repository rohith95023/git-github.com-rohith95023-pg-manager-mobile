import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xdzshjbepsntlavtcmpp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xPl9e_Q2KCWEp6UbA6UMow_X-VtiIgM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testStats() {
    console.log("Fetching invoice info...");
    const invoiceDues = await supabase.from("invoices").select("total_amount, paid_amount, tenants!inner(status)").in("status", ["UNPAID", "PARTIAL"]).neq("tenants.status", "DELETED");
    console.log("Filtered invoices:", invoiceDues.data);
    
    const allInvoices = await supabase.from("invoices").select("id, tenant_id, status, type, total_amount, paid_amount").in("status", ["UNPAID", "PARTIAL"]);
    console.log("All unpaid invoices:", allInvoices.data);
    
    // Let's also fetch tenants to see if there is another tenant
    const t = await supabase.from("tenants").select("id, full_name, status");
    console.log("All tenants:", t.data);
}
testStats();
