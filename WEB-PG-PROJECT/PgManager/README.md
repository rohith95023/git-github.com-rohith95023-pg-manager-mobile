# PG Manager

A premium PG management application built with React, Vite, and Supabase.

## Features

- **Resident Management**: Unified onboarding for monthly and daily stays.
- **Room & Bed Tracking**: Real-time room availability and bed assignment.
- **Daily Stay Engine**: Automated rent calculation and checkout tracking for short-term residents.
- **Dashboard**: High-level overview of revenue, occupancy, and pending checkouts.
- **Premium UI**: Modern dark mode with sleek glassmorphism and micro-animations.

## Technical Architecture

### Database Schema (Supabase)

The system uses a robust relational schema designed for scalability:

- **`tenants`**: Core identity table storing resident name, phone, and identity proof.
- **`daily_stay_details`**: Operational table specifically for daily stays (1:1 with `tenants`). This table handles dynamic calculations for rent and balances.
- **`pgs`, `rooms`, `beds`**: Hierarchical structure for property management.

### Daily Stay Refactor

Recently refactored the daily stay logic to decouple identity from operational data.
- **Identity Layer**: `tenants` table now primarily holds KYC and basic stay info (move-in date).
- **Operational Layer**: `daily_stay_details` stores `rent_per_day`, `paid_amount`, and auto-calculated `total_rent` and `balance_amount`.
- **Triggers**: PostgreSQL triggers automatically calculate financials whenever rent or payments are updated.
- **Status Automation**: A scheduled function (`update_daily_statuses`) automatically transitions tenants between `UPCOMING`, `ACTIVE`, `OVERDUE`, and `COMPLETED` based on checkout dates and payment status.

## Getting Started

1. Clone the repository.
2. Set up a Supabase project and apply migrations found in the project root.
3. Configure `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Run `npm install` and `npm run dev`.

## Deployment

Deploys to Vercel/Netlify with standard Vite build commands.

