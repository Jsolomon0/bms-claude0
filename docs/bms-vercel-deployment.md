## Vercel Deployment

This repository contains multiple apps. Use separate Vercel projects for each deployed app.

Recommended Vercel projects and root directories:

- `website`: `codex_bms`
- `codex_bms/apps/dashboard`
- `codex_bms/apps/portal`

Each app now contains its own:

- `package.json`
- `next.config.mjs`
- `tsconfig.json`
- `next-env.d.ts`

The `website` project is intentionally built from the monorepo root so Vercel uses the root `package-lock.json` and npm workspace graph. The root [vercel.json](</C:/Users/JOHN ALYN/bms/claude_bms/vercel.json:1>) runs:

- `npm install`
- `npm run vercel:build:website`

The wrapper script sets `NEXT_IGNORE_INCORRECT_LOCKFILE=1` for the Vercel website build. Next.js 16 currently misidentifies this npm workspace lockfile layout as incomplete even after install, so the flag suppresses that false-positive warning.

Vercel project settings:

- `website`
- `Framework Preset`: `Next.js`
- `Root Directory`: `codex_bms`
- `Install Command`: use `vercel.json`
- `Build Command`: use `vercel.json`
- `Output Directory`: leave empty or unset

- `dashboard` and `portal`
- `Framework Preset`: `Next.js`
- `Root Directory`: the app directory for that project, for example `codex_bms/apps/dashboard`
- `Build Command`: leave the default Next.js behavior in place, or use `npm run build`
- `Output Directory`: leave empty or unset

Do not set `Output Directory` to `public`. That setting is for static sites and will cause Vercel to fail after a successful Next.js build because the app correctly emits `.next`, not a `public` build artifact.

Notes:

- The web apps import shared source from `codex_bms/packages`, so `externalDir` and `outputFileTracingRoot` are enabled in each Next config.
- `dashboard` and `portal` include Next middleware wrappers around the existing path-access rules.
- The current shell uses demo-role middleware inputs until full session-backed auth is wired into Next request handling.

Suggested environment variables:

- `PORTAL_DEMO_ROLE`
- `DASHBOARD_DEMO_ROLE`

For the public website project, no special role env var is required.
