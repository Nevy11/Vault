# Vault

Vault is a secure wallet web application built with React, TanStack Start, Supabase, and Vite. It supports SSR, user authentication, KYC onboarding, real-time account activity, deposits, withdrawals, and wallet management.

Live demo: https://vault-one-plum.vercel.app/

## Key features

- Email/PIN login and sign-up flows
- OTP verification for authentication
- SSR-ready render pipeline using TanStack Start
- Supabase backend for auth, profiles, wallets, and activity logs
- Dark mode support with refined UI contrast
- Dashboard with send/deposit/withdraw workflows
- Vercel deployment support via `api/ssr.ts`

## Tech stack

- React 19
- TanStack Router & TanStack Start
- Vite 7
- Tailwind CSS 4
- Supabase JS
- `pnpm` package manager
- Vercel deployment for SSR and static assets

## Repository structure

- `src/` — application source code
  - `routes/` — route pages like `login`, `sign-up`, `dashboard`, `settings`
  - `components/` — reusable UI and page components
  - `lib/` — utility modules, Supabase client, profile signal, helpers
  - `hooks/` — custom React hooks
  - `server.ts` — SSR entry wrapper for TanStack Start
  - `router.tsx` — app router configuration
- `supabase/` — Supabase functions and migrations
- `vite.config.ts` — standard Vite config for SSR build
- `vite.spa.config.ts` — SPA-only client build config
- `vercel.json` — Vercel deployment config

## Local development

1. Install dependencies:

```bash
pnpm install
```

2. Create environment variables:

```bash
cp .env.example .env.local
```

3. Set the Supabase values in `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_key
# or
VITE_SUPABASE_ANON_KEY=your_public_key
```

4. Run the dev server:

```bash
pnpm dev
```

Then open `http://localhost:8080`.

## Build & preview

- Build SSR and SPA artifacts:

```bash
pnpm run build
```

- Preview the built app:

```bash
pnpm run preview
```

- Build only the SPA client bundle:

```bash
pnpm run build:spa
```

- Build only the SSR app:

```bash
pnpm run build:ssr
```

## Deployment

This project is configured to deploy on Vercel with SSR support.

- `vercel.json` routes static asset requests to `/assets/*`
- all other requests are handled by `api/ssr.ts`
- `api/ssr.ts` forwards requests into the built SSR bundle at `dist/server/index.js`

### Recommended deploy steps

1. Push your branch to GitHub.
2. Ensure Vercel is connected to the repository.
3. Trigger a new deploy.

If the app loads without styles in production, verify the site is building the client bundle and that the `dist/client/index.html` includes the generated stylesheet link.

## Common scripts

- `pnpm dev` — start Vite dev server
- `pnpm run build` — build SPA and SSR outputs
- `pnpm run build:spa` — build only SPA client
- `pnpm run build:ssr` — build only SSR server
- `pnpm run preview` — preview the production build locally
- `pnpm run lint` — run ESLint
- `pnpm run format` — run Prettier formatting

## Notes

- The app uses custom CSS variables and `@theme inline` definitions in `src/styles.css`.
- `src/components/ui/input.tsx` defines the base input styling used across login/sign-up forms.
- `src/components/top-nav.tsx` controls the profile dropdown and sign-out behavior.
- `src/api/server.ts` normalizes SSR response errors and ensures runtime-safe server rendering.

## Troubleshooting

### Missing CSS in production

- Confirm `src/main.tsx` imports `./styles.css`
- Confirm `dist/client/index.html` contains a `<link rel="stylesheet" ...>` entry
- Verify Vercel is using the latest `vercel.json` and `api/ssr.ts` configuration

### Auth / sign-out issues

- `src/components/top-nav.tsx` uses `supabase.auth.signOut()` and clears `useProfileSignal()` state.
- Routes are handled through `@tanstack/react-router` and should match `/dashboard` and `/settings`.

## License

This project is private.
