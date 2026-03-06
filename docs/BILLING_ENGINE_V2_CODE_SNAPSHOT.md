# 📸 Billing Engine V2 Code Snapshot

This file contains the final production backend logic for the Billing Engine V2.

## 1. Core RPC Definitions

### `allocate_payment`
```sql
CREATE OR REPLACE FUNCTION allocate_payment(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid
) RETURNS void AS $$
DECLARE
  v_remaining_amount numeric;
  v_invoice record;
  v_alloc_amount numeric;
  v_new_paid numeric;
  v_new_status text;
  v_total_allocated numeric := 0;
BEGIN
    -- 1. Security check
    IF auth.uid() <> p_owner_id THEN
        RAISE EXCEPTION 'Unauthorized: Owner ID mismatch';
    END IF;

    -- 2. Lock the payment row
    SELECT amount INTO v_remaining_amount 
    FROM public.payments 
    WHERE id = p_payment_id 
    AND tenant_id = p_tenant_id 
    AND owner_id = p_owner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.billing_logs (event_type, tenant_id, owner_id, details)
        VALUES ('ERROR', p_tenant_id, p_owner_id, jsonb_build_object('message', 'Payment not found', 'payment_id', p_payment_id));
        RAISE EXCEPTION 'Payment not found or tenant mismatch';
    END IF;

    -- 3. Allocation logic (FIFO)
    FOR v_invoice IN 
        SELECT id, total_amount, paid_amount 
        FROM public.invoices
        WHERE tenant_id = p_tenant_id
        AND status IN ('UNPAID', 'PARTIAL')
        ORDER BY billing_period_start ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_remaining_amount <= 0;

        v_alloc_amount := LEAST(v_remaining_amount, v_invoice.total_amount - v_invoice.paid_amount);
        v_new_paid := v_invoice.paid_amount + v_alloc_amount;
        v_new_status := CASE WHEN v_new_paid >= v_invoice.total_amount THEN 'PAID' ELSE 'PARTIAL' END;

        INSERT INTO public.payment_allocations (payment_id, invoice_id, amount_applied)
        VALUES (p_payment_id, v_invoice.id, v_alloc_amount);

        UPDATE public.invoices
        SET paid_amount = v_new_paid, status = v_new_status, updated_at = now()
        WHERE id = v_invoice.id;

        v_remaining_amount := v_remaining_amount - v_alloc_amount;
        v_total_allocated := v_total_allocated + v_alloc_amount;
    END LOOP;

    -- 4. Overpayment Handling
    IF v_remaining_amount > 0 THEN
        INSERT INTO public.tenant_credits (tenant_id, amount, payment_id, owner_id)
        VALUES (p_tenant_id, v_remaining_amount, p_payment_id, p_owner_id)
        ON CONFLICT (tenant_id) 
        DO UPDATE SET amount = public.tenant_credits.amount + EXCLUDED.amount, updated_at = now();
    END IF;

    -- Logging
    INSERT INTO public.billing_logs (event_type, tenant_id, owner_id, details)
    VALUES ('ALLOCATION', p_tenant_id, p_owner_id, jsonb_build_object(
        'payment_id', p_payment_id,
        'allocated', v_total_allocated,
        'credit_created', v_remaining_amount
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `generate_monthly_invoices`
```sql
CREATE OR REPLACE FUNCTION generate_monthly_invoices(
  p_owner_id uuid
) RETURNS json AS $$
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
    IF p_owner_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized execution: owner_id does not match session.';
    END IF;

    FOR r_tenant IN (
        SELECT t.id, t.full_name, t.move_in_date, t.rent_per_month, t.maintenance_amount, t.maintenance_type, r.rent as room_rent
        FROM public.tenants t
        LEFT JOIN public.rooms r ON t.room_id = r.id
        WHERE t.owner_id = p_owner_id 
          AND t.status = 'ACTIVE' 
          AND t.stay_type = 'MONTHLY'
    ) LOOP
        v_tenants_checked := v_tenants_checked + 1;

        SELECT MAX(billing_period_start) INTO v_last_invoice_date
        FROM public.invoices
        WHERE tenant_id = r_tenant.id;

        IF v_last_invoice_date IS NULL THEN
            v_last_invoice_date := r_tenant.move_in_date;
        END IF;

        v_next_invoice_date := (v_last_invoice_date + INTERVAL '1 month')::DATE;

        WHILE v_next_invoice_date <= CURRENT_DATE LOOP
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

    RETURN json_build_object(
        'tenants_checked', v_tenants_checked,
        'invoices_created', v_invoices_created
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `get_outstanding_balance`
```sql
CREATE OR REPLACE FUNCTION get_outstanding_balance(
  p_tenant_id uuid,
  p_owner_id uuid
) RETURNS numeric AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    IF p_owner_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized execution: owner_id does not match session.';
    END IF;

    SELECT COALESCE(SUM(total_amount - paid_amount), 0)
    INTO v_balance
    FROM public.invoices
    WHERE tenant_id = p_tenant_id
      AND owner_id = p_owner_id
      AND status IN ('UNPAID', 'PARTIAL');

    RETURN ROUND(v_balance, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Trigger Logic

### Payment Deletion (Reverse Allocation)
```sql
CREATE OR REPLACE FUNCTION handle_payment_deletion()
RETURNS TRIGGER AS $$
DECLARE
    v_allocated_amount numeric;
    v_credit_to_remove numeric;
BEGIN
    UPDATE public.invoices i
    SET 
        paid_amount = i.paid_amount - pa.amount_applied,
        status = CASE 
            WHEN (i.paid_amount - pa.amount_applied) <= 0 THEN 'UNPAID'
            ELSE 'PARTIAL'
        END,
        updated_at = now()
    FROM public.payment_allocations pa
    WHERE pa.invoice_id = i.id
    AND pa.payment_id = OLD.id;

    SELECT COALESCE(SUM(amount_applied), 0) INTO v_allocated_amount
    FROM public.payment_allocations 
    WHERE payment_id = OLD.id;

    v_credit_to_remove := OLD.amount - v_allocated_amount;

    IF v_credit_to_remove > 0 THEN
        UPDATE public.tenant_credits
        SET 
            amount = GREATEST(0, amount - v_credit_to_remove),
            updated_at = now()
        WHERE tenant_id = OLD.tenant_id;
    END IF;

    DELETE FROM public.payment_allocations WHERE payment_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Schema Reference

### `invoices`
- `id`: uuid (Primary Key)
- `tenant_id`: uuid (FK -> tenants.id)
- `owner_id`: uuid (FK -> auth.users)
- `billing_period_start`: date
- `billing_period_end`: date
- `total_amount`: numeric (Check > 0)
- `paid_amount`: numeric (Default 0, Check >= 0)
- `status`: text ('UNPAID', 'PARTIAL', 'PAID')
- `type`: text ('RENT', 'OPENING_BALANCE', 'CREDIT')

### `payment_allocations`
- `id`: uuid (Primary Key)
- `payment_id`: uuid (FK -> payments.id CASCADE)
- `invoice_id`: uuid (FK -> invoices.id)
- `amount_applied`: numeric

### `tenant_credits`
- `id`: uuid (Primary Key)
- `tenant_id`: uuid (Unique)
- `amount`: numeric (Check >= 0)
- `owner_id`: uuid (FK -> auth.users)
- `payment_id`: uuid (Originating payment)
