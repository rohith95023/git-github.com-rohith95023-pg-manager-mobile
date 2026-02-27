# Field Name Analysis: Code vs Supabase Schema

## Critical Field Name Mismatches

### 1. Foreign Key Fields (snake_case in DB, camelCase in code)

| Code Usage | Schema Field | Table | Status |
|------------|--------------|-------|--------|
| `pgId` | `pg_id` | rooms, tenants, beds | ❌ MISMATCH |
| `roomId` | `room_id` | beds, tenants | ❌ MISMATCH |
| `bedId` | `bed_id` | tenants | ❌ MISMATCH |
| `tenantId` | `tenant_id` | beds, payments | ❌ MISMATCH |
| `ownerId` | `owner_id` | pgs | ❌ MISMATCH |
| `managerId` | `manager_id` | pgs | ❌ MISMATCH |

### 2. Room Fields

| Code Usage | Schema Field | Status |
|------------|--------------|--------|
| `floorNumber` | `floor` | ❌ MISMATCH |
| `roomNumber` | `room_number` | ❌ MISMATCH |
| `monthlyRent` | `rent` | ❌ MISMATCH |
| `securityDeposit` | `deposit` | ❌ MISMATCH |
| `currentOccupancy` | `current_occupancy` | ❌ MISMATCH |

### 3. Tenant Fields

| Code Usage | Schema Field | Status |
|------------|--------------|--------|
| `move_in_date` | `check_in_date` | ⚠️ DIFFERENT NAME |
| `stay_type` | **NOT IN SCHEMA** | ❌ MISSING |
| `profession` | **NOT IN SCHEMA** | ❌ MISSING |
| `balance` | **NOT IN SCHEMA** | ❌ MISSING |
| `rent_per_month` | **NOT IN SCHEMA** | ❌ MISSING |
| `security_deposit` | **NOT IN SCHEMA** | ❌ MISSING |
| `id_number` | `id_proof_number` | ❌ MISMATCH |
| `aadhar_number` | `id_proof_number` | ❌ MISMATCH |

### 4. Payment Fields

| Code Usage | Schema Field | Status |
|------------|--------------|--------|
| `txndate` | `payment_date` | ❌ MISMATCH |
| `reservationId` | **NOT IN SCHEMA** | ❌ MISSING |
| `billingMonth` | **NOT IN SCHEMA** | ❌ MISSING |

### 5. Expense Fields

| Code Usage | Schema Field | Status |
|------------|--------------|--------|
| `expenseDate` | `date` | ❌ MISMATCH |

### 6. Booking Fields

| Code Usage | Schema Field | Status |
|------------|--------------|--------|
| `check_in_date` | **NOT IN SCHEMA** | ❌ MISSING |
| `check_out_date` | **NOT IN SCHEMA** | ❌ MISSING |

### 7. Timestamp Fields

| Code Usage | Schema Field | Status |
|------------|--------------|--------|
| `createdAt` | `created_at` | ❌ MISMATCH |
| `updatedAt` | `updated_at` | ❌ MISMATCH |

## Impact Analysis

### High Priority Issues
1. **Foreign key queries failing** - Using camelCase (`pgId`) instead of snake_case (`pg_id`)
2. **Room queries failing** - Using `floorNumber`, `monthlyRent` instead of `floor`, `rent`
3. **Tenant queries with missing fields** - `stay_type`, `profession`, `balance` don't exist in schema
4. **Payment date queries** - Using `txndate` instead of `payment_date`

### Medium Priority Issues
1. Date field inconsistency (`move_in_date` vs `check_in_date`)
2. ID proof field names (`id_number` vs `id_proof_number`)

## Recommendations

1. **Update Supabase schema** to add missing fields OR
2. **Update code** to use correct field names from schema
3. **Standardize naming convention** - Choose either snake_case or camelCase consistently
