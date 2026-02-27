-- Supabase Reference Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE booking_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED');
CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'PARTIAL', 'PAID');
CREATE TYPE pg_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DELETED');
CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'FULL');
CREATE TYPE room_type AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'DORM', 'FOUR_SHARE', 'FIVE_SHARE', 'OTHERS');
CREATE TYPE stay_type AS ENUM ('TEMPORARY', 'ADVANCE');
CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'INACTIVE', 'UPCOMING', 'COMPLETED', 'OVERDUE', 'DELETED', 'NOTICE');
CREATE TYPE user_role AS ENUM ('ADMIN',
    gender VARCHAR(10),
    dob DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 'TENANT', 'MANAGER');

-- Tables

CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT,
    full_name TEXT,
    gender TEXT,
    phone TEXT,
    role user_role,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE pgs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address TEXT,
    amenities TEXT[],
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    gender_type TEXT,
    maintenance_amount NUMERIC,
    maintenance_type TEXT,
    manager_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id),
    pincode TEXT,
    security_deposit NUMERIC,
    state TEXT,
    status TEXT,
    support_contact TEXT,
    total_floors INTEGER,
    total_rooms INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    floor_name TEXT,
    floor_number INTEGER NOT NULL,
    pg_id UUID REFERENCES pgs(id)
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capacity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_occupancy INTEGER,
    deposit NUMERIC,
    floor INTEGER,
    pg_id UUID REFERENCES pgs(id),
    previous_status TEXT,
    rent NUMERIC,
    room_number TEXT NOT NULL,
    room_type TEXT,
    status TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    balance NUMERIC,
    bed_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    custom_rent NUMERIC,
    dob DATE,
    email TEXT,
    emergency_contact TEXT,
    full_name TEXT NOT NULL,
    gender TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    id_number TEXT,
    id_type TEXT,
    maintenance_amount NUMERIC,
    maintenance_paid BOOLEAN,
    maintenance_type TEXT,
    move_in_date DATE,
    owner_id UUID,
    pg_id UUID REFERENCES pgs(id),
    phone TEXT,
    profession TEXT,
    profile_id UUID REFERENCES profiles(id),
    rent_cycle TEXT,
    rent_per_day NUMERIC,
    rent_per_month NUMERIC,
    room_id UUID REFERENCES rooms(id),
    security_deposit NUMERIC,
    status tenant_status,
    stay_type TEXT,
    updated_at TIMESTAMP WITH TIME ZONE,
    vacate_date DATE
);

CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    previous_status TEXT,
    room_id UUID REFERENCES rooms(id),
    status TEXT,
    tenant_id UUID REFERENCES tenants(id),
    updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE tenants ADD CONSTRAINT tenants_bed_id_fkey FOREIGN KEY (bed_id) REFERENCES beds(id);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_id UUID REFERENCES beds(id),
    check_in_date DATE,
    check_out_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pg_id UUID REFERENCES pgs(id),
    remarks TEXT,
    requested_date DATE,
    room_id UUID REFERENCES rooms(id),
    status booking_status,
    stay_type stay_type,
    tenant_id UUID REFERENCES tenants(id),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE daily_stay_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    balance_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    maintenance_amount NUMERIC,
    maintenance_paid BOOLEAN,
    maintenance_type TEXT,
    move_in_date DATE NOT NULL,
    paid_amount NUMERIC,
    rent_per_day NUMERIC NOT NULL,
    tenant_id UUID REFERENCES tenants(id) UNIQUE,
    total_rent NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE,
    vacate_date DATE NOT NULL
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount NUMERIC NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE,
    description TEXT,
    notes TEXT,
    owner_id UUID,
    pg_id UUID REFERENCES pgs(id),
    title TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    vendor_name TEXT
);

CREATE TABLE master_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    entity_id UUID,
    entity_type TEXT NOT NULL,
    form_data JSONB NOT NULL,
    metadata JSONB,
    operation_type TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    message TEXT,
    title TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount NUMERIC NOT NULL,
    bed_id UUID REFERENCES beds(id),
    billing_month TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    owner_id UUID,
    payment_date DATE,
    payment_method TEXT,
    pg_id UUID REFERENCES pgs(id),
    reservation_id UUID REFERENCES bookings(id),
    room_id UUID REFERENCES rooms(id),
    status payment_status,
    tenant_id UUID REFERENCES tenants(id),
    type TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE system_data_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filename TEXT NOT NULL,
    format TEXT NOT NULL,
    owner_id UUID,
    record_count INTEGER,
    snapshot_data JSONB NOT NULL
);
