import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xdzshjbepsntlavtcmpp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xPl9e_Q2KCWEp6UbA6UMow_X-VtiIgM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCreateWithInvoice() {
    console.log("Mocking tenant creation...");
    
    // We need an owner_id. Let's use the one we found.
    const owner_id = '8f96ebbd-681f-4bd8-95c7-011700a931af';
    
    const payload = {
        full_name: 'TEST TENANT',
        stay_type: 'MONTHLY',
        move_in_date: new Date().toISOString().split('T')[0],
        rent_per_month: 2000,
        maintenance_amount: 100,
        maintenance_type: 'monthly',
        security_deposit: 500,
        status: 'ACTIVE',
        owner_id: owner_id,
        phone: '1234567890'
    };

    const { data: tenant, error: tError } = await supabase.from("tenants").insert([payload]).select().single();
    if (tError) {
        console.error("Tenant creation failed:", tError);
        return;
    }
    console.log("Tenant created:", tenant.id);

    // Now MANUALLY run the logic from tenant.api.ts to see if it works
    const data = tenant;
    if (data && data.stay_type === 'MONTHLY') {
        const initialRent = Number(data.rent_per_month || data.custom_rent || 0);
        const maintenance = Number(data.maintenance_amount || 0);
        const totalInvoiceAmount = initialRent + maintenance;

        const startDate = new Date(data.move_in_date);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        if (endDate.getDate() !== startDate.getDate()) {
            endDate.setDate(0);
        } else {
            endDate.setDate(endDate.getDate() - 1);
        }

        const insertPayloads = [{
            tenant_id: data.id,
            owner_id: data.owner_id,
            type: 'RENT',
            total_amount: totalInvoiceAmount,
            paid_amount: 0,
            status: 'UNPAID',
            billing_period_start: data.move_in_date,
            billing_period_end: endDate.toISOString().split('T')[0]
        }];

        if (Number(data.security_deposit || 0) > 0) {
            insertPayloads.push({
                tenant_id: data.id,
                owner_id: data.owner_id,
                type: 'DEPOSIT',
                total_amount: Number(data.security_deposit),
                paid_amount: 0,
                status: 'UNPAID',
                billing_period_start: data.move_in_date,
                billing_period_end: endDate.toISOString().split('T')[0]
            });
        }

        console.log("Attempting invoice insert:", insertPayloads);
        const { error: invoiceError } = await supabase.from("invoices").insert(insertPayloads);

        if (invoiceError) {
            console.error("Failed to generate initial invoices:", invoiceError);
        } else {
            console.log("Invoices created successfully!");
        }
    }
}

testCreateWithInvoice();
