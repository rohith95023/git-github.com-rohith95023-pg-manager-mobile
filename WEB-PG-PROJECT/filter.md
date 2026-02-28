# WEB-PG-PROJECT COMPONENT ANALYSIS REPORT

## Complete Filter and Logic Blueprint for Mobile Replication

---

# 1. DASHBOARD

## A. Component Overview
- **Purpose**: Real-time overview of all PG properties with key metrics and quick access to detailed data
- **Data Sources Used**: 
  - `statsAPI.getDashboardStats()` - Aggregated statistics
  - `paymentAPI.getAll()` - Recent payments
  - Supabase direct queries for detailed breakdowns
- **Supabase Tables**: `pgs`, `rooms`, `beds`, `tenants`, `payments`, `expenses`, `daily_stay_details`, `bookings`
- **Main Queries**:
  - Dashboard stats: Monthly revenue, expenses, net profit, occupancy rates
  - Recent payments: Last 5 payments with tenant/booking joins
  - Daily stay tenants with checkout dates

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| None (display-only) | - | - | - | Cards are clickable for details | N/A | N/A |

**Filter Blocking Logic**: N/A - Dashboard is display-only with clickable cards

## C. Search Logic
- **Search Fields**: None (uses clickable stat cards to expand details)
- **Query Pattern**: N/A
- **Debounce Logic**: N/A

## D. Sorting Logic
- **Sort Fields**: Pre-defined stat card order
- **Default Sorting**: Fixed order (Total PGs → Active Rooms → Residents → etc.)
- **Asc/Desc**: N/A

## E. Pagination Logic
- **Pagination Method**: None (shows aggregated stats)
- **Default Page Size**: N/A

## F. Filter Dependency Mapping
- **Dependencies**: None
- **Cascading Behavior**: When clicking a stat card, fetches related details from relevant tables

## G. Edge Cases
- **Empty State**: Loading spinner while fetching data
- **Reset Logic**: Refresh button syncs all data via `handleSyncAll()`
- **Combined Filter Conflicts**: N/A

---

# 2. PG PROPERTIES

## A. Component Overview
- **Purpose**: Manage PG properties with CRUD operations, archiving, and status management
- **Data Sources Used**: 
  - `pgAPI.getAll()`, `pgAPI.getArchived()` - Fetch active/archived PGs
  - `roomAPI.getAll()` - Room data for analytics
  - Direct Supabase queries for beds, tenants, payments
- **Supabase Tables**: `pgs`, `rooms`, `beds`, `tenants`, `payments`
- **Main Queries**: Aggregated analytics per PG (total beds, occupied beds, residents count, monthly revenue, pending dues)

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| showArchived | Toggle | true/false | false | Tab buttons (Active/Archived) | `showArchived` | Switches between active and archived PG lists |
| searchTerm | Search Input | Text (name/city) | "" | Search input in header | `searchTerm` | Client-side `ilike` filter on name/city |

### Filter Blocking Analysis
**Why Filters Are Blocked**:
1. **Status Change Blocked**: When PG is ARCHIVED
   - **Block Reason**: "This property is currently ARCHIVED. Room inventory is locked"
   - **When Unblocked**: When property status is changed from ARCHIVED to ACTIVE

2. **Archive Action Blocked**: When PG has active tenants
   - **Block Reason**: "This property has X active resident(s). Please handle them before archiving"
   - **When Unblocked**: When all tenants are moved out or status changed to INACTIVE

3. **Delete Action Blocked**: When PG has financial records
   - **Block Reason**: "Cannot delete property with financial records"
   - **When Unblocked**: When all related payments/expenses are deleted

## C. Search Logic
- **Search Fields**: `name`, `city`
- **Query Pattern**: Client-side filtering with `toLowerCase().includes()`
- **Debounce Logic**: None (immediate client-side filter)

## D. Sorting Logic
- **Sort Fields**: Pre-defined display order
- **Default Sorting**: By creation date (newest first implicitly via fetch order)
- **Asc/Desc**: Not configurable

## E. Pagination Logic
- **Pagination Method**: None (displays all PGs)
- **Default Page Size**: N/A

## F. Filter Dependency Mapping
- **Dependencies**: 
  - `searchTerm` filters `displayPgs` (client-side computed from all PGs)
  - `showArchived` toggles between activePgs and archivedPgs arrays

## G. Edge Cases
- **Empty State**: Shows count of filtered results
- **Reset Logic**: Clicking "Active" or "Archived" tabs resets filter
- **Combined Filter Conflicts**: Search works within active OR archived tab

---

# 3. ROOMS & BEDS

## A. Component Overview
- **Purpose**: Manage rooms and beds within properties with occupancy tracking
- **Data Sources Used**: 
  - `roomAPI.getAll()`, `pgAPI.getAll()`, `pgAPI.getArchived()`
- **Supabase Tables**: `rooms`, `beds`, `pgs`
- **Main Queries**: Room list with PG join, bed status tracking

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| activeTab | Tab | "rooms"/"beds" | "rooms" | Tab navigation | `activeTab` | Switches view between rooms and beds |
| filterPg | Dropdown | PG IDs + "ALL" | "" | Filter bar | `filterPg` | Client-side filter on room.pg_id |
| searchTerm | Search Input | Text (room number) | "" | Search input | `searchTerm` | Client-side filter on room_number |
| showArchived | Toggle | true/false | false | Toggle button | `showArchived` | Filters by status |

### Filter Blocking Analysis
**Status Change Blocked**:
- When property is ARCHIVED: "This property is currently ARCHIVED. Room inventory is locked - please restore the property first"
- **When Unblocked**: Restore the PG to ACTIVE status

**Delete Action Blocked**:
- When room has active tenants: Warning dialog about occupants
- When property is archived: Blocked entirely

## C. Search Logic
- **Search Fields**: `room_number`
- **Query Pattern**: Client-side `includes()` after toLowerCase()
- **Debounce Logic**: None (immediate)

## D. Sorting Logic
- **Sort Fields**: `floor`, `room_number`
- **Default Sorting**: By floor then room number (ascending)
- **Asc/Desc**: Not configurable in UI

## E. Pagination Logic
- **Pagination Method**: None (all rooms displayed)
- **Default Page Size**: N/A

## F. Filter Dependency Mapping
- **Dependencies**:
  - `filterPg` → floors dropdown populated based on selected PG
  - Room number suggestions auto-populate based on PG + floor selection

## G. Edge Cases
- **Empty State**: "No rooms found" message
- **Reset Logic**: Tab change resets some filters
- **Combined Filter Conflicts**: Search within selected PG filter

---

# 4. RESIDENT DIRECTORY (TENANTS)

## A. Component Overview
- **Purpose**: Manage tenants/residents with full CRUD, filtering, search, and bulk operations
- **Data Sources Used**: 
  - `tenantAPI.search()` - Paginated tenant search
  - `pgAPI.getAll()`, `roomAPI.getAll()`, `bedAPI.getAll()`
- **Supabase Tables**: `tenants`, `pgs`, `rooms`, `beds`, `daily_stay_details`

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| statusFilter | Dropdown | ALL, ACTIVE, INACTIVE | ALL | Filter bar | `statusFilter` | Server: `eq('status', status)` if not ALL |
| professionFilter | Dropdown | ALL + professions list | ALL | Filter bar | `professionFilter` | Server: `eq('profession', ...)` if not ALL |
| pgFilter | Dropdown | ALL + PG names | ALL | Filter bar | `pgFilter` | Server: `eq('pg_id', ...)` if not ALL |
| floorFilter | Dropdown | ALL + floor numbers | ALL | Filter bar | `floorFilter` | Server: Room floor join filter |
| roomFilter | Dropdown | ALL + room numbers | ALL | Filter bar | `roomFilter` | Server: `eq('room_id', ...)` if not ALL |
| sortBy | Dropdown | move_in_date, full_name, etc. | move_in_date | Sort dropdown | `sortBy` | Server: `order(sortBy, {ascending: sortOrder === 'asc'})` |
| sortOrder | Dropdown | asc/desc | desc | Sort dropdown | `sortOrder` | Server: Combined with sortBy |
| searchTerm | Search Input | Text | "" | Search input | `searchTerm` | Server: `ilike('%search%')` on multiple fields |
| page | Number | 1 to totalPages | 1 | Pagination controls | `page` | Server: `range((page-1)*pageSize, page*pageSize)` |
| pageSize | Number | 10, 25, 50 | 10 | Size selector | `pageSize` | Server: Limits result count |

### Filter Blocking Analysis
**Add Tenant Button Blocked**:
- When no PGs exist: "No properties found. Create a property first."
- When no rooms exist: "No rooms available. Create a room first."
- When no beds available: "All beds are full. Add more capacity first."
- **When Unblocked**: When at least 1 PG, 1 room, and 1 available bed exists

**Delete Tenant Blocked**:
- When tenant has outstanding balance: "Cannot delete [name] because they have an outstanding balance of ₹X"
- **When Unblocked**: When balance is ₹0 (paid in full)

## C. Search Logic
- **Search Fields**: `full_name`, phone, email (via API)
- **Query Pattern**: Server-side `ilike` with wildcard
- **Debounce Logic**: 500ms debounce on searchTerm

## D. Sorting Logic
- **Sort Fields**: `move_in_date`, `full_name`, `pg_name`, `floor`
- **Default Sorting**: `move_in_date` descending (newest first)
- **Asc/Desc**: Configurable via dropdown

## E. Pagination Logic
- **Pagination Method**: Offset-based (`range` in Supabase)
- **Default Page Size**: 10
- **Page Calculation**: `totalPages = ceil(totalCount / pageSize)`

## F. Filter Dependency Mapping
- **Dependencies**:
  - `pgFilter` → populates `floorFilter` options (fetched from rooms table)
  - `pgFilter` + `floorFilter` → populates `roomFilter` options
  - Changing `pgFilter` resets `floorFilter` and `roomFilter` to ALL
  - Any filter change resets page to 1

## G. Edge Cases
- **Empty State**: "No resident records found" message
- **Reset Logic**: Clear Search button resets all filters
- **Combined Filter Conflicts**: All filters combine with AND logic

---

# 5. SMART TENANT FINDER

## A. Component Overview
- **Purpose**: Advanced search and filtering of tenants with balance synchronization
- **Data Sources Used**: 
  - `tenantAPI.search()` - Paginated search with filters
  - `pgAPI.getAll()` - Property list
  - `paymentAPI.getByTenantId()` - For balance sync
- **Supabase Tables**: `tenants`, `pgs`, `daily_stay_details`

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| statusFilter | Dropdown | ALL, ACTIVE, INACTIVE | ALL | Filter bar | `statusFilter` | Server: `eq('status', ...)` |
| professionFilter | Dropdown | ALL + profession list | ALL | Filter bar | `professionFilter` | Server: `eq('profession', ...)` |
| pgFilter | Dropdown | ALL + PG names | ALL | Filter bar | `pgFilter` | Server: `eq('pg_id', ...)` |
| sortBy | Dropdown | move_in_date, full_name, pg_name, floor | move_in_date | Sort dropdown | `sortBy` | Server: `order(sortBy, ...)` |
| sortOrder | Dropdown | asc/desc | desc | Sort dropdown | `sortOrder` | Server: Combined with sortBy |
| searchTerm | Search Input | Text | "" | Search input | `searchTerm` | Server: `ilike('%search%')` |
| page | Number | 1 to totalPages | 1 | Pagination | `page` | Server: offset calculation |

### Filter Blocking Analysis
**No blocking mechanism** - This is a read-only search component

## C. Search Logic
- **Search Fields**: name, phone, email, room number, ID
- **Query Pattern**: Server-side `ilike` with wildcard
- **Debounce Logic**: 400ms debounce

## D. Sorting Logic
- **Sort Fields**: `move_in_date`, `full_name`, `pg_name`, `floor`
- **Default Sorting**: `move_in_date` descending (newest first)
- **Predefined Options**:
  - "Newest First" (move_in_date:desc)
  - "Oldest First" (move_in_date:asc)
  - "Name (A-Z)" (full_name:asc)
  - "PG Name (A-Z)" (pg_name:asc)
  - "Floor (Low-High)" (floor:asc)

## E. Pagination Logic
- **Pagination Method**: Offset-based
- **Default Page Size**: 8
- **Page Size**: Fixed at 8

## F. Filter Dependency Mapping
- **Dependencies**: None (simpler than Resident Directory)
- **Cascading Behavior**: None

## G. Edge Cases
- **Empty State**: Shows loading skeletons, then "no results" message
- **Reset Logic**: Clear Search button resets all filters
- **Balance Sync**: Can sync tenant balance with expected monthly rent

---

# 6. FINANCIAL RECORDS (PAYMENTS)

## A. Component Overview
- **Purpose**: Record and manage rent payments, deposits, and other transactions
- **Data Sources Used**: 
  - `paymentAPI.getAll()` - All payments
  - `pgAPI.getAll()` - Properties
  - Direct Supabase for tenant data with joins
- **Supabase Tables**: `payments`, `tenants`, `pgs`, `rooms`, `beds`, `daily_stay_details`, `reservations`

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| filterStatus | Dropdown | "", PAID, PENDING, COMPLETED, FAILED, PARTIAL | "" | Filter bar | `filterStatus` | Client-side filter on status |
| filterPg | Dropdown | "" + PG names | "" | Filter bar | `filterPg` | Client-side filter on pg_id |
| searchTerm | Search Input | Text | "" | Search input | `searchTerm` | Client-side filter on tenant name |

### Filter Blocking Analysis
**Payment Creation Blocked**:
- When tenant has no balance: Auto-fills ₹0 but allows override
- When overpayment: Shows confirmation dialog before allowing
- Duplicate payment detection: Warns if same billing month already paid

## C. Search Logic
- **Search Fields**: Tenant name (from joined data)
- **Query Pattern**: Client-side `toLowerCase().includes()`
- **Debounce Logic**: None (immediate)

## D. Sorting Logic
- **Sort Fields**: Payment date (default)
- **Default Sorting**: By payment_date descending
- **Grouping**: Rent payments grouped by tenant + billing month

## E. Pagination Logic
- **Pagination Method**: None (displays all with virtual "Due" records)
- **Virtual Records**: Creates outstanding due records from tenants with balance > 0

## F. Filter Dependency Mapping
- **Dependencies**:
  - Tenant dropdown auto-populates based on selected PG
  - Amount auto-fills with tenant's current balance

## G. Edge Cases
- **Empty State**: "No payment records found"
- **Outstanding Dues**: Shows as virtual records (not in DB)
- **Overpayment**: Confirmation dialog with option to proceed or cancel

---

# 7. EXPENSE TRACKER

## A. Component Overview
- **Purpose**: Log and manage property operational expenses
- **Data Sources Used**: 
  - `expenseAPI.getAll()` - All expenses
  - `pgAPI.getAll()` - Properties
- **Supabase Tables**: `expenses`, `pgs`

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| filterCategory | Dropdown | "" (All), MAINTENANCE, REPAIRS, UTILITIES, SALARY, FOOD, INTERNET, CLEANING, OTHER | "" | Filter bar | `filterCategory` | Client-side: `expense.category === filterCategory` |
| searchTerm | Search Input | Text | "" | Search input | `searchTerm` | Client-side: `ilike` on title/description/vendor |

### Filter Blocking Analysis
**No blocking mechanism** - Expense tracking has no restrictions

## C. Search Logic
- **Search Fields**: `title`, `description`, `vendor_name`
- **Query Pattern**: Client-side `toLowerCase().includes()`
- **Debounce Logic**: None (immediate client-side filter)

## D. Sorting Logic
- **Sort Fields**: Date (default), amount
- **Default Sorting**: By date descending
- **Asc/Desc**: Not configurable in UI

## E. Pagination Logic
- **Pagination Method**: None (all expenses displayed)
- **Default Page Size**: N/A

## F. Filter Dependency Mapping
- **Dependencies**: None
- **Cascading Behavior**: None

## G. Edge Cases
- **Empty State**: "No expense records found"
- **Monthly Stats**: Shows total for current month in modal
- **Category Styles**: Each category has unique visual styling

---

# 8. PROFIT & LOSS

## A. Component Overview
- **Purpose**: Financial analysis with revenue vs expenses breakdown and profitability metrics
- **Data Sources Used**: 
  - `pnlAPI.getSummary()` - Monthly summary data
  - `pnlAPI.getCategoryStats()` - Expense category breakdown
- **Supabase Tables**: `payments`, `expenses` (via API views/functions)

## B. Filters Analysis
| Filter Field | Type | Possible Values | Default | UI Location | State Variable | Query Modification |
|--------------|------|-----------------|---------|-------------|----------------|-------------------|
| filterMonth | Dropdown | "all" + available months | "all" | Header filter | `filterMonth` | Filters summary and category data by month |

### Filter Blocking Analysis
**No blocking mechanism** - P&L is a read-only analytical component

## C. Search Logic
- **Search Fields**: N/A
- **Query Pattern**: N/A
- **Debounce Logic**: N/A

## D. Sorting Logic
- **Sort Fields**: Month (inherits from data)
- **Default Sorting**: By month descending (newest first)
- **Asc/Desc**: Not configurable

## E. Pagination Logic
- **Pagination Method**: None
- **Default Page Size**: N/A

## F. Filter Dependency Mapping
- **Dependencies**:
  - `availableMonths` computed from summary data
  - Changing filterMonth updates both summary and category charts

## G. Edge Cases
- **Empty State**: "No data available" in table
- **Loading State**: Spinner while fetching
- **Profit Margin**: Calculated as (profit/revenue)*100

---

# SUMMARY: FILTER BLOCKING PATTERNS

| Component | Blocked Action | Blocking Condition | Unblock Condition |
|-----------|----------------|-------------------|------------------|
| PG Properties | Status Change | Property is ARCHIVED | Restore property to ACTIVE |
| PG Properties | Archive | Has active tenants | Move out or inactivate all tenants |
| Rooms & Beds | Status Change | Property is ARCHIVED | Restore property to ACTIVE |
| Rooms & Beds | Delete | Property is ARCHIVED | Restore property first |
| Resident Directory | Add Tenant | No PGs/Rooms/Beds available | Create required entities first |
| Resident Directory | Delete Tenant | Has outstanding balance | Clear balance to ₹0 |
| Payments | Submit | Duplicate billing month | Confirm or cancel |
| Payments | Submit | Overpayment | Confirm or cancel |

---

# KEY IMPLEMENTATION NOTES FOR MOBILE

1. **Real-time Updates**: All components use Supabase realtime subscriptions
2. **Debounce**: Search inputs use 400-500ms debounce
3. **Server-side vs Client-side**: 
   - Tenants, Rooms, PGs use server-side filtering via API
   - Expenses, Payments use client-side filtering
4. **Pagination**: Only Tenants and Tenant Finder use server-side pagination
5. **Filter Dependencies**: PG → Floor → Room cascading in Tenants
6. **Balance Calculations**: Complex logic for Daily vs Monthly stays
