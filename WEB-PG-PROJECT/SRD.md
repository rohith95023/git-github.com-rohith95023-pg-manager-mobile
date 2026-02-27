# 🏠 System Replication Document (SRD) - PG Manager

This document serves as a complete technical blueprint for the **PG Manager Application**. Any AI agent or human developer can use this document to clone, understand, and rebuild the exact same application.

---

## 1️⃣ System Overview

**PG Manager** is an enterprise-grade multi-property Paying Guest (PG) management platform.

### Tech Stack
*   **Frontend:** React (v19) + Vite
*   **Backend:** Supabase PostgreSQL (BaaS)
*   **Styling:** Tailwind CSS + Lucide React
*   **State Management:** React Hooks + Context API
*   **Data Validation:** Zod
*   **Architecture:** Multi-admin architecture isolated using PostgreSQL Row Level Security (RLS).

### Major Modules
*   **Authentication:** Secure login, session management, and role assignment.
*   **Dashboard:** Real-time analytics, revenue mapping, occupancy stats, and system exports.
*   **Tenants:** Complete lifecycle management for long-term (Monthly) and short-term (Daily) stays.
*   **Rooms & Beds:** Granular inventory matrix tracking real-time availability.
*   **Payments:** Rent collection, deposit handling, and ledger reconciliation.
*   **Financial Records:** Income, expenses, and automated balances.
*   **Maintenance:** Tracking room/bed upkeep and associated costs.
*   **Reports:** Downloadable snapshot logs and CSV/XLSX generation.

---

## 2️⃣ Complete Folder Architecture

The codebase adheres to a strict, scalable pattern.

```text
src/
  ├── api/              # Database-specific queries (Supabase adapters)
  ├── services/         # Business logic & calculations (DB-agnostic)
  ├── hooks/            # Custom React hooks (loading, error handling, caching)
  ├── components/       # Reusable UI elements (Buttons, Inputs, Cards)
  ├── pages/            # High-level views (Dashboard, Tenants, etc.)
  ├── routes/           # React Router DOM configuration
  ├── layouts/          # Persistent scaffolding (Sidebar, Topbar)
  ├── utils/            # Helper functions (date parsers, currency formatters)
  ├── types/            # TypeScript interfaces / Supabase schema definitions
database/               # SQL dump files & migration scripts
```

### Responsibilities
*   **api/**: Only module allowed to execute raw queries or touch database clients.
*   **services/**: Only module allowed to process raw data into business entities.
*   **hooks/**: Only module allowed to manage React lifecycles and bind services to state.
*   **components/**: Only module allowed to render visual UI based on props.

---

## 3️⃣ Data Flow Rules

To ensure modularity and multi-database compatibility, data must always flow sequentially.

**Component → Hook → Service → API → Database**

> **🚨 CRITICAL RULE:** Components must *never* directly call database queries, `supabase.from()`, or perform SQL operations. They must dispatch intents to Hooks.

1.  **Component** calls `login(credentials)`.
2.  **Hook** sets `isLoading(true)` and delegates to `authService.login()`.
3.  **Service** applies validation, prepares data payloads, and calls `authAPI.login()`.
4.  **API** translates the normalized request into DB-specific syntax (e.g., Supabase Auth).
5.  **Database** executes and returns.

---

## 4️⃣ API Layer Documentation

The API layer is responsible for raw database I/O. Below are the expected API categories.

### `tenant.api`
| Purpose | Fetching and mutating resident records. |
| :--- | :--- |
| **Methods** | `getAll`, `getActive`, `getById`, `create`, `update`, `archive`, `hardDelete`, `search` |
| **Return Shape** | `{ id: uuid, full_name: string, status: enum, balance: number, stay_details: object }` |

### `room.api`
| Purpose | Property and room layout management. |
| :--- | :--- |
| **Methods** | `getAll`, `getByPgId`, `create`, `update`, `delete`, `recalculateOccupancy` |
| **Return Shape** | `{ id: uuid, room_number: string, capacity: number, current_occupancy: number, status: enum }` |

### `bed.api`
| Purpose | Granular bed inventory and assignment. |
| :--- | :--- |
| **Methods** | `getAll`, `getByRoomId`, `updateStatus`, `assignTenant`, `vacateTenant` |
| **Return Shape** | `{ id: uuid, room_id: uuid, bed_number: string, status: enum, tenant_id: uuid }` |

### `payment.api`
| Purpose | Recording revenue and deposits. |
| :--- | :--- |
| **Methods** | `getAll`, `getByTenantId`, `create`, `updateStatus` |
| **Return Shape** | `{ id: uuid, tenant_id: uuid, amount: number, payment_date: string, type: enum }` |

### `financial.api`
| Purpose | Expense tracking and profit calculation logic points. |
| :--- | :--- |
| **Methods** | `getAllExpenses`, `createExpense`, `getProfitLossSummary` |
| **Return Shape** | `{ expenses: array, totalIncome: number, totalExpense: number, net: number }` |

### `maintenance.api`
| Purpose | Service requests and room repairs. |
| :--- | :--- |
| **Methods** | `getRoomMaintenance`, `reportIssue`, `resolveIssue` |
| **Return Shape** | `{ id: uuid, entity_id: uuid, description: string, cost: number, status: enum }` |

### `auth.api`
| Purpose | User authentication sessions. |
| :--- | :--- |
| **Methods** | `login`, `logout`, `resetPassword`, `getSession` |
| **Return Shape** | `{ user: { id: uuid, email: string, role: string }, session: object }` |

### `dashboard.api`
| Purpose | Aggregated multi-table metrics for visualization. |
| :--- | :--- |
| **Methods** | `getStatsSnapshot`, `getRecentActivity` |
| **Return Shape** | `{ metrics: { activeTenants: number, monthlyRevenue: number, ... }, recent: array }` |

---

## 5️⃣ Service Layer Rules

The Service layer acts as the brain of the application.

*   **Calculations**: Reconciles balances (e.g., Anniversary-based rent calculation).
*   **Tenant Lifecycle**: Bundles assigning a bed, creating a daily_stay log, and updating room occupancy into a single logical transaction block.
*   **Validation**: Applies business rules (e.g., Cannot check-out a tenant with pending dues without an override).
*   **Database-Agnostic**: Services *must not* care if the backend is Supabase, MySQL, or Mongo. They only speak pure JavaScript/TypeScript objects.

---

## 6️⃣ Hooks Layer Description

Hooks are the bridge between React's UI loop and the headless Services.

*   **Loading States**: Manages `isLoading`, `isSubmitting`, `isSyncing`.
*   **Error Handling**: Catches try/catch blocks from Services and fires UI Toasts/Alerts.
*   **Caching**: Uses `useMemo` or context to store fetched arrays locally to prevent spamming the database.
*   **Rules**: Hooks must NEVER write business logic or perform filtering that belongs in the Service.

---

## 7️⃣ Database Architecture

The system utilizes a relational model.

*   **admins (`profiles`)**: App owners/managers.
*   **properties (`pgs`)**: Physical buildings owned by an admin.
*   **rooms**: Sub-units of properties.
*   **beds**: Sub-units of rooms.
*   **tenants**: Linked to a specific bed. Contains unified identity details.
*   **payments**: Linked to tenants.
*   **financial_records (`expenses`)**: Operational costs linked to properties.
*   **maintenance**: Repair tracking linked to rooms/beds.

### Ownership Logic
> `admin.id` owns `pg.owner_id` -> cascade owns `room.pg_id` -> cascade owns `bed.room_id`.

**Reference Database:** Supabase PostgreSQL.

---

## 8️⃣ Multi-Database Compatibility

The system is designed to allow swapping the backend engine.

Equivalent schema mapping files exist (or can be generated) for:
*   **MySQL** (Relational map)
*   **MongoDB** (Document map)

### Schema Mapping Rules
If the database changes, the entity structures (JSON shapes) parsed by the API layer returning to the Service layer **must remain identical**. No structural changes are permitted in the frontend when the database swaps.

---

## 9️⃣ Security & RLS

Row Level Security (RLS) is the absolute source of truth for isolation in a multi-admin, SaaS-like environment.

*   **Admin Isolation**: Policies restrict users to see *only* properties and tenants where `auth.uid() == owner_id`.
*   **Critical Rule**: The Frontend **must not** filter `admin_id` manually in JS or in API WHERE clauses. The database engine must enforce filtering via JWT evaluation.

---

## 🔟 Routing & Lazy Loading

To achieve high Lighthouse scores and fast Time-to-Interactive:

*   **Layouts Load Eagerly**: Shell components (Navigation, Sidebar) are bundled immediately.
*   **Pages Use Lazy Loading**: Feature modules are split.
    *   `const Tenants = lazy(() => import('./pages/Tenants'))`
*   **Heavy Modules Load Dynamically**: Modals, complex charts (Recharts), and exports (XLSX) are fetched asynchronously only when needed.

---

## 1️⃣1️⃣ Coding Standards

We enforce strict maintainability parameters:

*   **File Size Limiter**: Maximum 500 lines per file. Refactor into child components if exceeded.
*   **Naming Conventions**:
    *   Components/Files: `PascalCase` (`ExportModal.jsx`)
    *   Hooks/Functions: `camelCase` (`useExpenses`, `fetchData`)
    *   Types/Interfaces: `PascalCase` (`ExpenseFormData`)
*   **Separation of Concerns**: UI, logic, and data layers stay explicitly mapped to their respective folders.

---

## 1️⃣2️⃣ Environment Setup

### Required Variables
Create a `.env.local` file at the project root:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

### Installation & Run Steps
1.  Verify Node.js (v18+) is installed.
2.  Run `npm install`
3.  Execute `npm run dev` to start Vite.
4.  Execute `npm run build` for production bundles.

---

## 1️⃣3️⃣ Database Switch Instructions

If migrating from Supabase to MySQL/Mongo:

1.  **Stop**: Do not touch `src/components`, `src/hooks`, or `src/services`.
2.  **Target API Layer**: Open `src/api/`. Rewrite the internal implementation of `api.js` to route via Axios/Fetch to your new custom backend endpoints.
3.  **Preserve Types**: Ensure responses correctly map to the expected arrays/objects defined in this SRD.
4.  **Schema Source**: Deploy schemas directly matching the exact naming defined in section 7 to your new database.

---

## 1️⃣4️⃣ Developer Safety Rules

*   **🚫 Never embed DB queries inside components:** It shatters portability and creates vendor lock-in.
*   **🚫 Never bypass RLS:** Using `service_role` keys on the client is strictly prohibited.
*   **🛡️ Maintain Data Shapes:** All API returns must format dates and array structures identically, regardless of the active database adapter.

---

## 1️⃣5️⃣ Final Goal

This SRD structure guarantees that:
*   An AI agent possesses sufficient context to rebuild the absolute entire architecture.
*   A developer can reliably clone, configure, and maintain the platform.
*   A database migration can occur safely without UI disruption.
*   System intent and structure are crystal clear without requiring line-by-line source code reading.

---

## 🧠 AI Reconstruction Booster Section

### 🎯 Purpose
This section defines strict reconstruction rules so that any AI agent or developer can recreate the PG Manager system deterministically without guessing architecture decisions.

This acts as a technical contract for rebuilding the application.

### 1️⃣ System Blueprint Map
The application must always follow this architectural blueprint:

*   **UI Layer**        → `src/components`, `src/pages`
*   **State Layer**     → `src/hooks`
*   **Logic Layer**     → `src/services`
*   **Data Layer**      → `src/api`
*   **Database Layer**  → Supabase / MySQL / MongoDB

No layer may bypass another.

**Strict rules:**
*   Components must never import from `api/`
*   Services must never import from `components/`
*   API must never contain business logic

### 2️⃣ Deterministic File Creation Rules
When recreating the system, generate files using this specific structure:

```text
src/
  api/
    tenant.api.ts
    room.api.ts
    bed.api.ts
    payment.api.ts
    financial.api.ts
    maintenance.api.ts
    auth.api.ts
    dashboard.api.ts

  services/
    tenant.service.ts
    financial.service.ts
    dashboard.service.ts

  hooks/
    useTenants.ts
    usePayments.ts
    useDashboard.ts
```

Naming must remain identical.

### 3️⃣ Standard Response Contract
All API responses must follow a unified format:

```json
{
  "data": "any",
  "error": "string | null",
  "status": 200
}
```

**Rules:**
*   Services rely on this exact shape.
*   Hooks must not alter the structure.
*   Database engine changes must preserve this exact contract.

### 4️⃣ Entity Mapping Contract
The following entities must exist with identical naming across all databases:

*   `admins` (profiles)
*   `pgs` (properties)
*   `rooms`
*   `beds`
*   `tenants`
*   `payments`
*   `financial_records`
*   `maintenance`

AI agents must not rename entities or fields during reconstruction.

### 5️⃣ Event Flow Templates

**Tenant Check-In Flow**
1. `tenant.service.createTenant()`
2. `bed.api.assignTenant()`
3. `room.api.recalculateOccupancy()`
4. `financial.api.createLedgerEntry()`

**Payment Recording Flow**
1. `payment.service.recordPayment()`
2. `payment.api.create()`
3. `financial.service.updateBalance()`
4. `dashboard.api.refreshSnapshot()`

These sequences must remain intact.

### 6️⃣ Environment Reconstruction Steps
When rebuilding:

1. Clone repository
2. Create `.env.local`
3. Install dependencies (`npm install`)
4. Start dev server (`npm run dev`)

**Required environment variables:**
*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`

### 7️⃣ Multi-Database Adapter Rule
When database changes:
*   Only modify `src/api/*`
*   Do not modify services, hooks, or components
*   Return data shapes must remain identical

Adapters must translate queries internally without affecting frontend logic.

### 8️⃣ Performance Preservation Rules
AI reconstruction must maintain:
*   Lazy-loaded pages
*   Eager-loaded layouts
*   Memoized financial calculations
*   Paginated tenant lists

No monolithic bundle generation allows.

### 9️⃣ Security Enforcement Rules
*   **RLS** remains the primary security layer.
*   Frontend must not filter admin ownership manually.
*   Service role keys must never be used on the client side.

### 🔟 Reconstruction Validation Checklist
After rebuilding, the system must support:

*   ✔ Multi-admin login
*   ✔ Tenant lifecycle management
*   ✔ Bed assignment logic
*   ✔ Financial ledger updates
*   ✔ Dashboard metrics
*   ✔ Lazy route loading

If any of these fail, reconstruction is incomplete.
