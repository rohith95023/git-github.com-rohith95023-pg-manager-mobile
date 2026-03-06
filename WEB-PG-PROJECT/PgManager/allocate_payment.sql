
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

    -- 3. Allocation logic
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
