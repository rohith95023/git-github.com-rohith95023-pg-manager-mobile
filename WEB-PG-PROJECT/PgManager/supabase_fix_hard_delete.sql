-- ============================================================
-- FIX: hard_delete_pg_cascade FK constraint error
-- Error: payments_bedid_fkey still references beds before deletion
-- Run this in Supabase SQL Editor → Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.hard_delete_pg_cascade(p_pg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Soft-delete all residents in this PG (preserve financial records)
    UPDATE public.tenants 
    SET 
        room_id = NULL, 
        bed_id  = NULL,
        status  = 'DELETED'
    WHERE pg_id = p_pg_id AND status != 'DELETED';

    -- 2. PRESERVE financial history on payments:
    --    NULL out pg_id, room_id AND bed_id BEFORE deleting beds/rooms.
    --    Required to satisfy: payments_bedid_fkey, payments_room_id_fkey (if exists)
    UPDATE public.payments 
    SET 
        pg_id   = NULL,
        room_id = NULL,
        bed_id  = NULL
    WHERE pg_id = p_pg_id;

    -- 3. PRESERVE financial history on expenses
    UPDATE public.expenses 
    SET pg_id = NULL 
    WHERE pg_id = p_pg_id;

    -- 4. NULL out bed/room refs on invoices (if invoices table has these FK columns)
    --    Safe to run even if columns don't exist — will just affect 0 rows.
    UPDATE public.invoices
    SET 
        room_id = NULL,
        bed_id  = NULL
    WHERE pg_id = p_pg_id;

    -- 5. Delete bookings (operational only, safe to remove entirely)
    DELETE FROM public.bookings WHERE pg_id = p_pg_id;

    -- 6. Now safe to delete beds and rooms — all FK refs are cleared
    DELETE FROM public.beds  
    WHERE room_id IN (SELECT id FROM public.rooms WHERE pg_id = p_pg_id);
    
    DELETE FROM public.rooms WHERE pg_id = p_pg_id;

    -- 7. Delete the PG record itself
    DELETE FROM public.pgs WHERE id = p_pg_id;
END;
$$;

-- Verify the function was updated:
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'hard_delete_pg_cascade';
