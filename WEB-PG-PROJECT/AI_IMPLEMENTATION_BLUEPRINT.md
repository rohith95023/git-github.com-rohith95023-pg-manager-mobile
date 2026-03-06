# 📱 PG Manager: AI Implementation Blueprint

This manifest provides a comprehensive technical breakdown of the **PG Manager** system, designed to enable any AI agent or developer to recreate the application (React Native Expo) with 100% feature parity and enhanced UI.

---

## 🏗️ 1. Core Architecture (The Contract)
Strict separation of concerns must be maintained to ensure modularity and multi-database compatibility.

| Layer | Responsibility | Location (Reference) |
| :--- | :--- | :--- |
| **UI Layer** | Visual components, forms, and layouts. No direct DB calls. | `src/components`, `src/pages` |
| **State Layer** | React Hooks managing loading, errors, and local state sync. | `src/hooks` |
| **Logic Layer** | Business rules (rent calc, occupancy logic, status cascades). | `src/services` |
| **Data Layer** | Raw database I/O using Supabase/SQL adapters. | `src/services/api.js` |
| **Database** | Relational schema with RLS and automated triggers. | `database/supabase/` |

---

## 📊 2. Database Schema (PostgreSQL)

### Profiles (`profiles`)
*   `id`: UUID (Primary Key)
*   `full_name`, `email`, `phone`, `gender`
*   `role`: `ADMIN`, `MANAGER`, `TENANT`

### Properties (`pgs`)
*   `owner_id`: UUID (Ref: `profiles.id`)
*   `name`, `address`, `city`, `state`, `pincode`
*   `status`: `ACTIVE`, `INACTIVE` (Archived)
*   **Feature**: Status cascades to rooms and beds.

### Rooms (`rooms`)
*   `pg_id`: UUID (Ref: `pgs.id`)
*   `room_number`, `floor`, `capacity`, `rent`, `deposit`
*   `status`: `AVAILABLE`, `PARTIAL`, `FULL`, `MAINTENANCE`, `INACTIVE`
*   **Logic**: `current_occupancy` is recalculated on every bed change.

### Beds (`beds`)
*   `room_id`: UUID (Ref: `rooms.id`)
*   `bed_number` (e.g., Bed-1, Bed-2)
*   `tenant_id`: UUID (Nullable, Ref: `tenants.id`)
*   `status`: `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`

### Tenants (`tenants`)
*   `pg_id`, `room_id`, `bed_id`
*   `full_name`, `phone`, `email`, `id_number`, `id_type`
*   `stay_type`: `DAILY`, `MONTHLY`
*   `status`: `ACTIVE`, `INACTIVE`, `OVERDUE`, `DELETED`, `NOTICE`
*   `balance`: Running ledger balance.

### Financials & Logs
*   `payments`: `tenant_id`, `amount`, `payment_date`, `status` (PENDING/PAID).
*   `expenses`: `pg_id`, `amount`, `category`, `title`.
*   `daily_stay_details`: Specific rent/balance/date tracking for short-term stays.
*   `notifications`: In-app alert storage.

---

## ✨ 3. Key Feature Specifications

### 🚪 Tenant Lifecycle (Unified Stay Manager)
1.  **Check-In**: 
    *   Step 1: Collect personal identity (Name, Phone, ID Proof).
    *   Step 2: Assign Stay Type (Daily/Monthly), Room, and Bed.
    *   **Automation**: System auto-updates bed status to `OCCUPIED` and triggers `recalculateOccupancy` for the room.
2.  **Rent Calculation**: 
    *   **Monthly**: Anniversary-based billing. If it's the 15th, rent is checked every 15th of the month.
    *   **Daily**: (Days Stated * Daily Rent) + Maintenance Fee.
3.  **Check-Out**: archive tenant, vacate bed, reset room occupancy.

### 🏠 Inventory Management
*   **Auto-Bed Generation**: When a room is created with capacity $N$, the system automatically creates $N$ beds.
*   **Capacity Sync**: Updating room capacity adds/removes beds dynamically (preventing removal if currently occupied).
*   **Hierarchy Filtering**: Filter views by Property → Floor → Room.

### 💹 Dashboard Analytics
*   **Revenue Mapping**: Monthly Revenue vs Expenses.
*   **Occupancy Stats**: Visual grid of rooms (Available/Full/Maintenance).
*   **Dues Radar**: Total outstanding balances across all properties.

---

## 🎨 4. UI Patterns & Interaction Design

### 🚨 Warning Cards & Alert Modals
*   **Component**: `AlertModal.jsx`
*   **Usage**: Used for critical errors or "Action Blocked" states (e.g., "Cannot delete occupied room").
*   **Aesthetics**: Backdrop blur, prominent icons (Lucide), bold colors (Rose for error, Amber for warning).

### 🔔 User Notifications (Toasts)
*   **Component**: `Toast.jsx`
*   **Types**: `success`, `error`, `warning`, `info`.
*   **Pattern**: Floating cards (top-right) with a linear progress bar reflecting the auto-dismiss timer. Use `framer-motion` for slide-in/out.

### 📝 Field Highlighting & Validation
*   **System**: Zod Schema + Local Error State.
*   **Implementation**: 
    *   On Submit: Validate entire form, map errors to `formErrors` object.
    *   Visual: Input borders turn **Rose-500**, showing a small error message below the field.
    *   **Floating Error Card**: A persistent, semi-transparent card appears on the right if validation fails, listing all current issues for easier scannability.
    *   **Real-time Cleansing**: Errors disappear as soon as the user starts typing valid data into the field.

---

## 🔄 5. Data Flow & Logic Cascades

> **Component** → **Hook** (loading/error) → **Service** (business logic) → **API** (query) → **Database** (cascade)

### 🌊 Example: Archive Property Flow
1.  **UI**: User clicks "Archive" on a Property.
2.  **Service**: Validates if any tenants are active (Warns if yes).
3.  **API**: Calls `archive_pg_cascade` (RPC/Logic).
4.  **Database**: 
    *   Updates `pgs.status` to `INACTIVE`.
    *   Updates all associated `rooms.status` and `beds.status` to `MAINTENANCE` or `INACTIVE`.
    *   Appends `(Archived - YYYY-MM-DD)` to the property name.

### 🌊 Example: Income Calculation
1.  **Stats Service** fetches all `payments` where `status = PAID`.
2.  Filters by `currentMonth` if needed.
3.  Sums `amount` while handling currency formatting/parsing.

---

## 🛠️ 6. AI Agent Implementation Instructions

1.  **Initialize**: Setup React Native Expo with Tailwind (NativeWind).
2.  **Types**: Define TypeScript interfaces matching the `database/` SQL schema.
3.  **Services**: Implement `api.js` logic using Supabase JS Client. Ensure all methods return the `{ data, error, status }` contract.
4.  **UI Components**: Prioritize Reusable Layouts:
    *   `AmountInput`: Handles currency formatting on-the-fly.
    *   `StatusBadge`: Dynamic colors based on Enum values.
    *   `OccupancyGrid`: Visual representation of beds.
5.  **Offline Support**: Use React Query (TanStack) or local caching to ensure fast performance.

---

*Prepared by Antigravity for PG Manager v2.0 Platform (Mobile RE-UI Project)*
