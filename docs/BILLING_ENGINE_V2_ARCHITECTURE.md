# 🏗️ Billing Engine V2 Architecture

## Overview
The Billing Engine V2 represents a fundamental shift in the application's financial model. It moves away from "Running Balances" (which are prone to incremental drift) to a robust **Double-Entry Invoice Ledger System**.

## Core Concepts

### 1. Invoice-Based Source of Truth
- **Legacy**: `tenants.balance` was the primary reference.
- **New**: The `public.invoices` table is the only source of truth. Each charge is a discrete record.
- **Dynamic Calculation**: Tenant balance is calculated by summing `(total_amount - paid_amount)` for all outstanding invoices via the `get_outstanding_balance()` RPC.

### 2. FIFO Allocation Model
Payments are not just "deducted" from a total. They are **allocated** to specific invoices using a First-In-First-Out (FIFO) approach:
1. When a payment is created, `allocate_payment()` is triggered.
2. It identifies the oldest `UNPAID` or `PARTIAL` invoices for the tenant.
3. It creates rows in `payment_allocations` to link the payment to those invoices.
4. It updates the invoice `paid_amount` and `status` until the payment is exhausted.

### 3. Persisted Credit Model
If a tenant overpays:
- The leftover amount is stored in the `tenant_credits` table.
- These credits are tracked per tenant and can be applied to future invoices.

### 4. Reverse Allocation (Atomicity)
To ensure financial integrity, the system includes a `handle_payment_deletion` trigger:
- If a payment record is deleted, the trigger automatically identifies all linked `payment_allocations`.
- It subtracts the allocated amounts from the corresponding invoices, restoring them to their previous states (`UNPAID` or `PARTIAL`).
- If the payment had created a credit, that credit is also reversed.

### 5. Anniversary Billing Logic
Invoices are generated based on the tenant's `move_in_date`:
- The `generate_monthly_invoices()` RPC iterates through active monthly residents.
- It calculates the next billing anniversary and generates a new `RENT` invoice if one doesn't exist.
- This process is **idempotent** and safe to run multiple times per day.

## RPC Summary
- `allocate_payment(payment_id, tenant_id, owner_id)`: Distributes payment funds to invoices.
- `generate_monthly_invoices(owner_id)`: Batch generates recurring monthly rent.
- `get_outstanding_balance(tenant_id, owner_id)`: Calculates current due.
- `billing_health_check(owner_id)`: Audits the ledger for discrepancies.

## Mobile Integration Rules
- **DO NOT** use `tenants.balance`.
- **Primary Balance**: Always call `rpc('get_outstanding_balance', {p_tenant_id, p_owner_id})`.
- **Payment Creation**: Ensure every payment creation is followed by a call to `allocate_payment`.
- **Dues Breakdown**: Fetch `invoices` where `status != 'PAID'` to show the tenant exactly what they are paying for.
