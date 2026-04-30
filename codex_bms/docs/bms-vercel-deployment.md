## Vercel Deployment

This repository contains multiple apps. Vercel must not build the GitHub repository root.

Create separate Vercel projects with these root directories:

- `codex_bms/apps/website`
- `codex_bms/apps/dashboard`
- `codex_bms/apps/portal`

Each app now contains its own:

- `package.json`
- `next.config.mjs`
- `tsconfig.json`
- `next-env.d.ts`

Notes:

- The web apps import shared source from `codex_bms/packages`, so `externalDir` and `outputFileTracingRoot` are enabled in each Next config.
- `dashboard` and `portal` include Next middleware wrappers around the existing path-access rules.
- The current shell uses demo-role middleware inputs until full session-backed auth is wired into Next request handling.

Suggested environment variables:

- `PORTAL_DEMO_ROLE`
- `DASHBOARD_DEMO_ROLE`

For the public website project, no special role env var is required.
