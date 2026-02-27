# Field Name Fixes Applied

## Summary
Fixed critical field name mismatches between code and Supabase schema in `src/services/api.js`.

## Changes Made

### 1. Foreign Key Fields (Fixed to snake_case)
- ✅ `pgId` → `pg_id` (in rooms, tenants queries)
- ✅ `roomId` → `room_id` (in beds, tenants queries)
- ✅ `bedId` → `bed_id` (in tenants queries)
- ✅ `tenantId` → `tenant_id` (in beds, payments queries)
- ✅ `ownerId` → `owner_id` (in pgs queries)
- ✅ `managerId` → `manager_id` (already correct in schema)

### 2. Room Fields (Fixed to match schema)
- ✅ `floorNumber` → `floor`
- ✅ `roomNumber` → `room_number`
- ✅ `monthlyRent` → `rent`
- ✅ `securityDeposit` → `deposit`
- ✅ `currentOccupancy` → `current_occupancy`

### 3. Tenant Fields
- ✅ `move_in_date` → `check_in_date` (where applicable)
- ⚠️ `stay_type` - **Field doesn't exist in schema** - queries commented out
- ⚠️ `profession` - **Field doesn't exist in schema** - removed from search queries
- ⚠️ `balance` - **Field doesn't exist in schema** - logic preserved but may fail
- ⚠️ `rent_per_month` - **Field doesn't exist in schema** - logic preserved but may fail
- ✅ `id_number`, `aadhar_number` → `id_proof_number` (in search queries)

### 4. Payment Fields
- ✅ `txndate` → `payment_date`
- ⚠️ `reservationId` → `reservation_id` (may not exist in schema)

### 5. Expense Fields
- ✅ `expenseDate` → `date`

### 6. Booking Fields
- ✅ `check_in_date` → `requested_date` (bookings table uses `requested_date`)

### 7. Timestamp Fields
- ✅ `createdAt` → `created_at`

## Files Modified
- `src/services/api.js` - All API queries updated to use correct field names

## Remaining Issues

### Fields Not in Schema (Need Database Migration or Code Removal)
1. **`stay_type`** - Used extensively but not in tenants schema
2. **`profession`** - Used in filters/search but not in schema
3. **`balance`** - Used in tenant calculations but not in schema
4. **`rent_per_month`** - Used in calculations but not in schema
5. **`security_deposit`** - Used in payments but not in tenants schema

### Recommendations
1. **Add missing fields to Supabase schema** via migration, OR
2. **Remove references** to these fields in frontend components
3. **Update TypeScript types** to reflect actual schema

## Next Steps
1. Test API calls to verify fixes work
2. Update frontend components that use camelCase field names
3. Add database migrations for missing fields if needed
4. Update TypeScript types file
