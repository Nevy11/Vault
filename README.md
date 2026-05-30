# Vault Project Documentation

## Overview

Vault is a secure wallet web application built with React, TanStack Start, Supabase, and Vite. It includes a web frontend, Supabase-managed backend data and serverless functions, and deployment support for Vercel.

The project focuses on user authentication, wallet management, deposits/withdrawals, financial insights, KYC onboarding, and real-time transaction activity.

## Live app

- Live production URL: https://vault-one-plum.vercel.app/

## How to use

1. Open the live URL in a browser.
2. Sign up with an email address or log in with an existing account.
3. Complete any required KYC onboarding flows.
4. Use the dashboard to view wallet balances, transactions, and financial recommendations.
5. Deposit funds, withdraw money, send payments, and review receipts from the app.

## Tech Stack

- React 19
- TanStack Router & TanStack Start
- Vite 7
- Tailwind CSS 4
- Supabase JS
- pnpm package manager
- Vercel deployment support

## Repository Structure

### Root

- `package.json` — root package config and shared dependencies.
- `pnpm-workspace.yaml` — workspace configuration.
- `vite.config.ts` — Vite config for TanStack Start SSR and client build.
- `vite.spa.config.ts` — dedicated SPA-only build config.
- `tsconfig.json` — global TypeScript configuration.
- `vercel.json` — Vercel build and routing configuration.
- `wrangler.jsonc` — Cloudflare worker / Vite plugin integration config.
- `README.md` — project overview and usage notes.
- `.env.local` — local environment variables for the web app (not committed).
- `docs/README.md` — this generated documentation file.

### Web application

- `src/main.tsx` — client entry point.
- `src/server.ts` — custom SSR wrapper for TanStack Start.
- `src/router.tsx` — router creation with query client and scroll restoration.
- `src/routeTree.gen.ts` — generated TanStack Router route tree.
- `src/routes/` — route page modules.
- `src/components/` — reusable UI components.
- `src/hooks/` — custom hooks.
- `src/lib/` — utilities, error capture, profile signal, and shared helpers.
- `src/api/` — Supabase and payment integration logic.
- `src/styles.css` — application styling and theming.

### Backend & Deployment

- `api/ssr.ts` — Vercel server handler that forwards requests to the built SSR bundle.
- `supabase/` — Supabase local development config, database migrations, seed data, and edge functions.
- `supabase/functions/` — server-side functions for account management, payments, Stripe, M-Pesa, AI chat, and support flows.
- `public/` — static assets.
- `dist/` — build output.

## Application Architecture

### Web app

The web application is built as a TanStack Start SSR app with the following bootstrap flow:

1. `src/main.tsx` initializes the client and router.
2. `src/router.tsx` creates a TanStack Router instance using `routeTree` and a `QueryClient`.
3. `src/routes/__root.tsx` defines the root route shell, metadata, error boundaries, and profile hydration.
4. `src/server.ts` wraps the generated SSR entry with error normalization for server rendering.
5. `vercel.json` routes all non-asset requests to `api/ssr.ts`, which forwards traffic to the built SSR bundle.

### Routing

The app supports these primary routes:

- `/` — landing page / sign-in entrypoint
- `/login` — login form
- `/sign-up` — sign-up flow
- `/dashboard` — authenticated dashboard
- `/finance-advisor` — financial advisory page
- `/finance-hub` — finance hub
- `/help` — help page
- `/kyc` — KYC onboarding
- `/loans` — loans page
- `/savings` — savings page
- `/transactions` — transaction history
- `/settings` — user/settings page
- `/pay/$username` — pay-by-username flow

The routes are generated in `src/routeTree.gen.ts` and mounted under the root route defined in `src/routes/__root.tsx`.

### UI and components

- `src/components/top-nav.tsx` handles navigation, profile, and sign-out behavior.
- `src/components/ui/` contains shared UI primitives, inputs, buttons, dialogs, and layout utilities.
- `src/components` contains page-specific panels, dashboards, finance advisors, receipt history, and wallet actions.
- The app uses Radix UI primitives, Tailwind CSS, and class variance authority for styling.

### Data & state management

- `@tanstack/react-query` is used for data fetching and caching.
- `zustand` may be used for lightweight state storage across the app.
- Profile state is managed through `src/lib/profile-signal.ts` and hydrated from Supabase session state.
- Supabase is configured in `src/api/supabase.ts` and shared across hooks and components.

## Supabase Backend

### Local dev config

- `supabase/config.toml` configures local Supabase services, including API, DB, realtime, storage, auth, and studio.
- Local Supabase ports are set to `54321` for the API, `54322` for the database, and `54323` for Studio.
- Auth is enabled with email sign-up and refresh token rotation.

### Migrations

The project includes a long migration history under `supabase/migrations/`.

Important migration topics include:

- enum creation
- transactions and wallet tables
- withdrawals and secure withdrawal logic
- ledger/ledger entries
- savings, loans, notifications, receipts, and financial insights
- M-Pesa transaction support
- Stripe transaction logging and issuing card support
- real-time replication and notification triggers

### Seed data

- `supabase/seed.sql` populates sample sub-accounts, ledger entries, and M-Pesa transactions for the first authenticated user.

### Supabase functions

Key serverless functions include:

- `delete-account/` — account deletion logic
- `financial-health-check/` — financial health evaluation
- `gemini-chat/` — AI chat integration
- `mpesa-callback/` — M-Pesa callback handler
- `mpesa-deposit/` — M-Pesa deposit flow
- `send-support-email/` — support email sending
- `stripe-checkout/` — Stripe checkout support
- `stripe-create-intent/` — Stripe payment intents
- `stripe-issuing/` — Stripe issuing card operations
- `stripe-issuing-auth/` — Stripe issuing auth flow
- `stripe-webhook/` — Stripe webhook event handling

## Mobile Companion App

The `mobile` folder contains an Expo React Native app with a minimal authenticated flow.

- The app uses Expo, React Navigation, and Supabase.
- Screens included are `LoginScreen`, `SignUpScreen`, `DashboardScreen`, and `ReceiptHistoryScreen`.
- The mobile app is configured to authenticate against the same Supabase backend as the web app.
- Environment variables are defined in `mobile/.env` or standard `EXPO_PUBLIC_*` names.

## Deployment

### Vercel

The project is configured for Vercel deployment:

- `vercel.json` builds the client bundle from `dist/client` and routes all application traffic through `api/ssr.ts`.
- Static assets under `/assets/*` are served directly.
- All remaining paths are forwarded to server-side rendering.

### SSR behavior

- `src/server.ts` loads the generated TanStack Start server entry and catches catastrophic SSR errors.
- `api/ssr.ts` adapts Express-style requests into Web Fetch requests, forwards them to the SSR server, and pipes back the response.

## Local Development

### Web app

From the repo root:

```bash
pnpm install
pnpm dev
```

The dev server uses Vite and typically runs on `http://localhost:8081`.

### Supabase local backend

Use Supabase CLI tooling for local development and migrations.

### Environment variables

The web app uses environment variables in `.env.local`, including:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

Expo may also accept `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Build & Scripts

From the root:

- `pnpm dev` — start the Vite development server
- `pnpm run build` — build both SPA and SSR artifacts
- `pnpm run build:spa` — build the client bundle only
- `pnpm run build:ssr` — build the SSR server bundle only
- `pnpm run preview` — preview the production build locally
- `pnpm run lint` — run ESLint
- `pnpm run format` — run Prettier

## Key Concepts & Notes

- The app uses TanStack Start for SSR-friendly React rendering and a generated route tree for predictable routing.
- Profile state is hydrated from Supabase session events and stored in `profileSignal`.
- The `TopNav` component is a global shell element that handles sign-out and displays profile status.
- Supabase functions support payments, account deletion, AI chat, Stripe issuing, and M-Pesa integration.
- The project maintains a strong database migration history in `supabase/migrations/` to support financial workflows, notifications, receipts, and data integrity.

## Recommendations

- Keep `src/routeTree.gen.ts` generated by TanStack Router and do not edit it manually.
- If adding routes, update the corresponding `src/routes/*.tsx` file and regenerate the route tree.
- Keep Supabase local config in sync with deployed project settings, especially auth redirect URLs and `site_url`.
- Use `pnpm` at the root and `npm` or `pnpm` inside `mobile/` consistently with the selected package manager.

## Further Reading

- `README.md` — root project notes and quick-start guidance.
- `supabase/config.toml` — local Supabase development configuration.
- `supabase/migrations/` — ordered database schema history.
- `api/ssr.ts` — Vercel SSR request adapter.
- `src/routes/__root.tsx` — application shell, metadata, and error boundaries.

---

_Last updated: May 30, 2026._
