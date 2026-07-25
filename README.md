# Capital OS Premium MVP

## Run locally
```bash
npm install
npm run dev
```

## What works
All primary navigation routes, editable budget, transactions, investments, goals, net-worth modeling, exports, opportunity reviews, Copilot actions, notifications, search, task toggles, mobile navigation, and local persistence.

## Database-ready architecture
The app currently uses a repository layer backed by localStorage so it works immediately. A Supabase schema with row-level security is included at `supabase/migrations/001_capital_os.sql`.

To connect Supabase later:
1. Create a Supabase project.
2. Run the included migration.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify environment variables.
4. Install `@supabase/supabase-js` and replace the repository methods in `src/lib/storage.ts` with Supabase queries.

## Netlify
The included `netlify.toml` uses `npm run build`, publishes `dist`, and supports SPA routing.

## Device motion
Subtle card movement reacts to supported device orientation. It is disabled on narrow layouts and for users who prefer reduced motion.
