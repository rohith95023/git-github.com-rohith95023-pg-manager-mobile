-- SQL Migration for PG Manager Future-Proof Architecture

-- 1. Active Tenants View
CREATE OR REPLACE VIEW active_tenants_view AS
SELECT 
    t.id,
    t.full_name,
    t.status,
    t.phone,
    t.email,
    t.profession,
    t.move_in_date,
    t.rent_per_month,
    t.balance,
    t.pg_id,
    p.name AS pg_name,
    t.room_id,
    r.room_number,
    r.floor,
    t.bed_id,
    b.bed_number,
    t.stay_type,
    t.created_at
FROM tenants t
LEFT JOIN pgs p ON t.pg_id = p.id
LEFT JOIN rooms r ON t.room_id = r.id
LEFT JOIN beds b ON t.bed_id = b.id
WHERE t.status IN ('ACTIVE', 'OVERDUE', 'UPCOMING');

-- 2. Archived Tenants View
CREATE OR REPLACE VIEW archived_tenants_view AS
SELECT 
    t.id,
    t.full_name,
    t.status,
    t.phone,
    t.email,
    t.profession,
    t.move_in_date,
    t.rent_per_month,
    t.balance,
    t.pg_id,
    p.name AS pg_name,
    t.room_id,
    r.room_number,
    r.floor,
    t.bed_id,
    b.bed_number,
    t.stay_type,
    t.created_at
FROM tenants t
LEFT JOIN pgs p ON t.pg_id = p.id
LEFT JOIN rooms r ON t.room_id = r.id
LEFT JOIN beds b ON t.bed_id = b.id
WHERE t.status IN ('DELETED', 'ARCHIVED', 'INACTIVE');

-- 3. Room Status View
CREATE OR REPLACE VIEW room_status_view AS
SELECT 
    r.id,
    r.room_number,
    r.floor,
    r.capacity,
    r.current_occupancy,
    r.status,
    r.rent,
    r.pg_id,
    p.name AS pg_name,
    r.created_at
FROM rooms r
LEFT JOIN pgs p ON r.pg_id = p.id;
