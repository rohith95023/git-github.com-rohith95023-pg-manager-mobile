# 📝 Billing Engine V2 Change Log

System-wide transition to Invoice-Based Billing.

---

### **Frontend & API Changes**

#### **File: src/pages/Dashboard/Dashboard.jsx**
- **Removed**: 
    - Calls to `Pn.reconcileAllBalances()` in `useEffect` and refresh handlers.
    - Local `pendingDues` calculation based on `tenants.balance`.
- **Added**:
    - `getDashboardStats` now aggregates dues from `public.invoices`.
- **Reason**: Decouple dashboard from legacy balance drift.

#### **File: src/pages/Tenants/TenantFinder.jsx**
- **Removed**:
    - `calculateBalance` and other monthly rent prediction logic.
    - Rendering of predicting "Total Expected" vs "Paid".
- **Added**:
    - Direct usage of Invoice-derived balances.
- **Reason**: Remove redundant client-side billing logic.

#### **File: src/services/tenant.service.ts**
- **Removed**:
    - Hardcoded `balance: 0` or `balance: some_value` during `createTenant`.
    - Updates to `tenants.balance` in `updateTenant`.
- **Added**:
    - Alignment with Invoice auto-generation on creation.
- **Reason**: Prevent manual modification of the protected legacy column.

#### **File: src/api/payment.api.ts**
- **Removed**:
    - Simple `post` to payments without allocation.
- **Added**:
    - Automatic call to `rpc('allocate_payment')` immediately after payment creation.
- **Reason**: Ensure all funds are legally linked to an invoice immediately.

#### **File: src/services/api.js**
- **Modified**:
    - `getDashboardStats` updated to fetch dues via `public.invoices`.
    - Removed `reconcileAllBalances` legacy function logic.
- **Reason**: Centralize financial truth in the data layer.

---

### **Database (Backend) Changes**

#### **Table: public.invoices**
- **Added**: `owner_id` column for RLS isolation.
- **Added**: `updated_at` and `created_at` consistency.
- **Added**: Check constraints for non-negative totals and paid amounts.
- **Reason**: Core ledger storage.

#### **Table: public.tenants**
- **Modified**: Blocked `UPDATE` on `balance` column via trigger `trg_block_balance_update`.
- **Reason**: Freeze legacy data for audit while preventing new drift.

#### **New Tables**:
- `public.payment_allocations`: Intersection for FIFO mapping.
- `public.tenant_credits`: Storage for overpayments.
- `public.billing_logs`: System-level audit trail.
