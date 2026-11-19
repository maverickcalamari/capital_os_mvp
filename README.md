# Capital OS — AI CFO Command Center

Capital OS is a production-ready, AI-powered financial operating system. It
turns budgeting, transactions, goals, investments, forecasting, and
decision-support into a single, database-backed SaaS experience.

## Run locally

```bash
npm install
npm run dev
```

## Architecture

- **Frontend:** React + TypeScript + Vite, Recharts, Zustand, Framer Motion,
  React Hook Form, Zod.
- **Backend:** Supabase (PostgreSQL, Row Level Security, Auth, Storage).
- **Deploy:** Netlify (`netlify.toml` included).

### Data layer

All persistence is Supabase-backed via a typed repository layer
(`src/lib/repository.ts`) and async hooks (`src/lib/hooks.ts`). The old
localStorage layer has been removed.

### Auth

Email/password auth with sign-up, sign-in, and password reset. Every user's
financial data is isolated by Row Level Security (`auth.uid() = user_id`).
New accounts are auto-seeded with a starter budget, sample opportunities, and
notifications.

### Modules

- **Dashboard** — AI CFO summary, cash flow, net worth, budget pressure,
  wealth forecast, opportunity picks, action plan.
- **AI CFO Allocator** — adjust income/expenses/savings target and apply the
  recommended plan.
- **Opportunity Scanner** — ranked opportunities with a scoring engine
  (capital efficiency, risk, effort, liquidity).
- **Finance Copilot** — natural-language decision support with real
  calculations (affordability, income scenarios, debt payoff, allocation).
- **Transactions** — full CRUD with search, filter, sort, and pagination.
- **Budget** — monthly category budgets with variance, duplicate-to-next-month,
  and add/edit/delete.
- **Investments** — portfolio tracking with weighted return.
- **Goals** — measurable targets with progress tracking.
- **Reports** — executive brief with JSON data export.
- **Net Worth** — editable balance sheet with 6-year forecast chart.
- **Settings** — profile and financial assumptions.

### Forecasting

`src/lib/finance.ts` implements deterministic multi-year forecasting and a
Monte Carlo simulation for net-worth projection under return volatility.

## Supabase schema

Migrations are applied via the Supabase MCP tools:

- `001_capital_os.sql` — starter tables (now extended).
- `002_capital_os_production` — full production schema: profiles, accounts,
  opportunities, reports, forecasts, notifications, settings + per-verb RLS,
  indexes, triggers, auto-profile/settings on signup.
- `003_receipts_bucket` — public storage bucket for receipt uploads.

## Production readiness

- PWA manifest, icons, sitemap, robots.txt.
- Security headers in `netlify.toml`.
- Error boundary wraps the app.
- WCAG-conscious contrast and reduced-motion support.
- Mobile-first responsive layout with safe-area support.

## Environment variables

Set in `.env` (pre-populated in the hosted environment):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Vercel deployment

Use the Vite framework preset with Node.js 22, npm ci, and npm run build. The checked-in Vercel configuration serves dist and rewrites browser routes to the SPA. Without credentials, the app runs in guest mode. The planning copilot uses local calculations.

For cloud accounts, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in each deployment environment. The legacy VITE_SUPABASE_ANON_KEY remains supported. Use a publishable or anon key. Set the Auth Site URL and allowed redirect URLs to the intended deployment. On a new project, apply all checked-in migrations in order before enabling accounts, including the final private receipt storage migration. For an existing project, inspect migration history before any changes. Verify account isolation and receipt access using two test accounts.
