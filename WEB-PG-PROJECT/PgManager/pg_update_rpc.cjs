const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    const query = `
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(p_owner_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    r_tenant RECORD;
    v_last_invoice_date DATE;
    v_next_invoice_date DATE;
    v_tenants_checked INTEGER := 0;
    v_invoices_created INTEGER := 0;
    v_rent_amount NUMERIC;
    v_maint_amount NUMERIC;
    v_total_to_charge NUMERIC;
BEGIN
    -- 1. Security check
    IF p_owner_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized execution: owner_id does not match session.';
    END IF;

    -- 2. Iterate through all active MONTHLY tenants
    FOR r_tenant IN (
        SELECT t.id, t.full_name, t.move_in_date, t.rent_per_month, t.maintenance_amount, t.maintenance_type, r.rent as room_rent
        FROM public.tenants t
        LEFT JOIN public.rooms r ON t.room_id = r.id
        WHERE t.owner_id = p_owner_id 
          AND t.status = 'ACTIVE' 
          AND t.stay_type = 'MONTHLY'
    ) LOOP
        v_tenants_checked := v_tenants_checked + 1;

        -- Find the latest invoice start date
        SELECT MAX(billing_period_start) INTO v_last_invoice_date
        FROM public.invoices
        WHERE tenant_id = r_tenant.id;

        -- If no invoices exist, start from move_in_date
        -- If invoices exist, start from next month
        IF v_last_invoice_date IS NULL THEN
            v_next_invoice_date := r_tenant.move_in_date;
        ELSE
            v_next_invoice_date := (v_last_invoice_date + INTERVAL '1 month')::DATE;
        END IF;

        -- Create missing invoices up to today
        WHILE v_next_invoice_date <= CURRENT_DATE LOOP
            -- Double check for existence even with the WHILE loop logic
            IF NOT EXISTS (
                SELECT 1 FROM public.invoices 
                WHERE tenant_id = r_tenant.id 
                AND billing_period_start = v_next_invoice_date
            ) THEN
                v_rent_amount := COALESCE(r_tenant.rent_per_month, r_tenant.room_rent, 0);
                v_maint_amount := CASE 
                    WHEN r_tenant.maintenance_type = 'monthly' THEN COALESCE(r_tenant.maintenance_amount, 0)
                    ELSE 0
                END;
                v_total_to_charge := v_rent_amount + v_maint_amount;

                IF v_total_to_charge > 0 THEN
                    INSERT INTO public.invoices (
                        tenant_id, owner_id, billing_period_start, billing_period_end,
                        total_amount, paid_amount, status, type
                    ) VALUES (
                        r_tenant.id, p_owner_id, v_next_invoice_date,
                        (v_next_invoice_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
                        v_total_to_charge, 0, 'UNPAID', 'RENT'
                    );
                    v_invoices_created := v_invoices_created + 1;
                END IF;
            END IF;
            v_next_invoice_date := (v_next_invoice_date + INTERVAL '1 month')::DATE;
        END LOOP;
    END LOOP;

    -- Logging
    INSERT INTO public.billing_logs (event_type, owner_id, details)
    VALUES ('GENERATION', p_owner_id, jsonb_build_object(
        'tenants_checked', v_tenants_checked,
        'invoices_created', v_invoices_created,
        'timestamp', now()
    ));

    RETURN json_build_object(
        'tenants_checked', v_tenants_checked,
        'invoices_created', v_invoices_created
    );
END;
$function$
;
    `;
    
    await client.query(query);
    console.log("RPC updated successfully.");

    await client.end();
}

main().catch(console.error);
