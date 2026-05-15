# BMS Monorepo Architecture

This document defines the implementation-ready monorepo structure for the BMS platform described in [bms-technical-spec.md](</C:/Users/JOHN ALYN/bms/codex_bms/docs/bms-technical-spec.md:1>).

## Monorepo Standard

- Package manager: `pnpm`
- Task runner and cache: `Turborepo`
- Language: `TypeScript` across apps and shared packages
- Linting: `ESLint` with a shared flat config
- Formatting: `Prettier` with a shared config
- Validation: `Zod` in `@bms/types`
- Web runtime: `Next.js` for `website`, `dashboard`, and `portal`
- Mobile runtime: `Expo React Native`
- Deployment targets: `Vercel` for web apps, `EAS` for mobile

## 1. Directory Tree

```text
bms/
+- apps/
|  +- website/
|  |  +- app/
|  |  +- components/
|  |  +- lib/
|  |  +- public/
|  |  +- styles/
|  |  +- env.ts
|  |  +- proxy.ts
|  |  +- next.config.mjs
|  |  +- package.json
|  |  \- tsconfig.json
|  +- dashboard/
|  |  +- app/
|  |  +- components/
|  |  +- lib/
|  |  +- server/
|  |  +- styles/
|  |  +- env.ts
|  |  +- proxy.ts
|  |  +- next.config.mjs
|  |  +- package.json
|  |  \- tsconfig.json
|  +- portal/
|  |  +- app/
|  |  +- components/
|  |  +- lib/
|  |  +- server/
|  |  +- styles/
|  |  +- env.ts
|  |  +- proxy.ts
|  |  +- next.config.mjs
|  |  +- package.json
|  |  \- tsconfig.json
|  \- mobile/
|     +- app/
|     +- components/
|     +- features/
|     +- lib/
|     +- assets/
|     +- env.ts
|     +- app.config.ts
|     +- babel.config.js
|     +- metro.config.js
|     +- package.json
|     \- tsconfig.json
+- packages/
|  +- api-client/
|  |  +- src/
|  |  |  +- core/
|  |  |  +- domains/
|  |  |  +- adapters/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- auth/
|  |  +- src/
|  |  |  +- client/
|  |  |  +- server/
|  |  |  +- shared/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- config/
|  |  +- src/
|  |  |  +- env/
|  |  |  +- eslint/
|  |  |  +- prettier/
|  |  |  +- tsconfig/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- db/
|  |  +- src/
|  |  |  +- client/
|  |  |  +- repositories/
|  |  |  +- schema/
|  |  |  +- mappers/
|  |  |  \- index.ts
|  |  +- migrations/
|  |  +- seeds/
|  |  +- package.json
|  |  \- tsconfig.json
|  +- notifications/
|  |  +- src/
|  |  |  +- channels/
|  |  |  +- templates/
|  |  |  +- events/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- payments/
|  |  +- src/
|  |  |  +- providers/
|  |  |  +- checkout/
|  |  |  +- webhooks/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- payroll/
|  |  +- src/
|  |  |  +- time/
|  |  |  +- approvals/
|  |  |  +- exports/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- permissions/
|  |  +- src/
|  |  |  +- policies/
|  |  |  +- scopes/
|  |  |  +- evaluators/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- storage/
|  |  +- src/
|  |  |  +- objects/
|  |  |  +- signed-links/
|  |  |  +- uploads/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- types/
|  |  +- src/
|  |  |  +- domain/
|  |  |  +- api/
|  |  |  +- events/
|  |  |  +- enums/
|  |  |  +- schemas/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  +- ui/
|  |  +- src/
|  |  |  +- tokens/
|  |  |  +- primitives/
|  |  |  +- web/
|  |  |  +- native/
|  |  |  \- index.ts
|  |  +- package.json
|  |  \- tsconfig.json
|  \- wordpress/
|     +- src/
|     |  +- content/
|     |  +- intake/
|     |  +- webhooks/
|     |  \- index.ts
|     +- package.json
|     \- tsconfig.json
+- tooling/
|  +- scripts/
|  \- templates/
+- .github/
|  \- workflows/
|     +- ci.yml
|     +- deploy-web.yml
|     +- deploy-mobile.yml
|     \- db-migrate.yml
+- .vscode/
|  +- extensions.json
|  \- settings.json
+- package.json
+- pnpm-workspace.yaml
+- turbo.json
+- tsconfig.json
+- eslint.config.mjs
+- prettier.config.mjs
+- .prettierignore
+- .eslintignore
+- .env.example
\- README.md
```

## 2. Package Responsibilities

### Apps

#### `apps/website`
- Public marketing website
- Headless WordPress content rendering
- Public intake entry points
- Public signed-link landing routes where appropriate
- No direct database access

#### `apps/dashboard`
- Internal back-office application
- Full administration UI for owner, administrator, developer support mode, and employees
- Server-side integration entry point for database, payments, notifications, storage, and WordPress sync
- Primary operational surface for the system of record

#### `apps/portal`
- External authenticated portal for customers, subcontractors, and supercontractors
- Limited feature surface with strict record-scope enforcement
- Public-to-authenticated transition flows for signed links and secure account access
- No direct database access from client components

#### `apps/mobile`
- Expo React Native companion app
- Task execution, time entry, notifications, document access, and project views
- Consumes API only through `@bms/api-client`
- Must not import server-only packages

### Shared packages

#### `@bms/types`
- Canonical domain types
- Zod schemas for validation
- API request and response contracts
- Event payload contracts
- Shared enums and branded identifiers

Rule:
- Lowest-level shared package
- Must not import from any internal package

#### `@bms/config`
- Shared TypeScript base config
- Shared ESLint config
- Shared Prettier config
- Shared env schema loaders
- Shared runtime constants that are not business-domain data

Rule:
- Must not import business packages

#### `@bms/permissions`
- Role definitions
- feature/action/scope/visibility policy model
- permission evaluation helpers
- record-scope resolution logic

Rule:
- Depends only on `@bms/types` and `@bms/config`
- No database access

#### `@bms/ui`
- Design tokens
- shared presentational primitives
- platform-specific component entrypoints
- form styling wrappers around app-local forms

Rule:
- Depends on `@bms/types` and `@bms/config`
- No data fetching, auth, or business logic
- Expose `@bms/ui/web`, `@bms/ui/native`, and `@bms/ui/tokens`

#### `@bms/api-client`
- Typed HTTP client used by web and mobile apps
- Domain-scoped API modules
- Request/response validation at boundaries
- Token/header injection hooks provided by the calling app

Rule:
- Depends on `@bms/types` and `@bms/config`
- Must not depend on `@bms/auth` to avoid cycle

#### `@bms/db`
- Database schema
- migration orchestration
- repository/query layer
- data mappers between persistence models and domain models

Rule:
- Server-only package
- Depends on `@bms/types` and `@bms/config`
- Must not import app code, `@bms/auth`, or `@bms/api-client`

#### `@bms/auth`
- Shared auth models and session helpers
- web and mobile auth client helpers
- server auth guards and session resolution
- integration point for permission checks

Rule:
- Split exports by platform
- `@bms/auth/client` may depend on `@bms/types`, `@bms/config`, and `@bms/permissions`
- `@bms/auth/server` may additionally depend on `@bms/db`
- No dependency on `@bms/api-client`

#### `@bms/storage`
- File upload abstraction
- object storage operations
- signed-link issuance and verification support
- upload metadata helpers

Rule:
- Server-only package
- Depends on `@bms/types` and `@bms/config`

#### `@bms/payments`
- Payment provider abstraction
- checkout session creation
- payment webhook handling
- invoice-payment reconciliation helpers

Rule:
- Server-only package
- Depends on `@bms/types`, `@bms/config`, and `@bms/db`

#### `@bms/payroll`
- Time aggregation logic
- payroll export preparation
- approval rules related to payroll processing

Rule:
- Server-only package
- Depends on `@bms/types`, `@bms/config`, `@bms/db`, and optionally `@bms/permissions`

#### `@bms/wordpress`
- WordPress content fetchers
- webhook verification
- intake bridging between WordPress and BMS
- public content feed adapters

Rule:
- Server-only package
- Depends on `@bms/types` and `@bms/config`

#### `@bms/notifications`
- Notification event model
- email/SMS/push adapters
- template rendering
- delivery orchestration

Rule:
- Server-only package
- Depends on `@bms/types`, `@bms/config`, and `@bms/db`

## 3. Import Rules

### 3.1 Dependency Layers

Use these layers to keep the graph acyclic:

| Layer | Packages | May import |
|---|---|---|
| L0 | `@bms/types`, `@bms/config` | nothing internal |
| L1 | `@bms/permissions`, `@bms/ui`, `@bms/api-client` | L0 |
| L2 | `@bms/db`, `@bms/storage`, `@bms/wordpress` | L0, selected L1 where explicitly allowed |
| L3 | `@bms/auth`, `@bms/payments`, `@bms/payroll`, `@bms/notifications` | L0-L2 |
| L4 | `apps/*` | packages only, never other apps |

### 3.2 Mandatory Rules

1. Apps may not import from other apps.
2. `@bms/types` may not import from any internal package.
3. `@bms/config` may not import from domain or app packages.
4. `@bms/api-client` must remain transport-only and may not import `@bms/auth` or `@bms/db`.
5. `@bms/db` may not import `@bms/auth`, `@bms/payments`, `@bms/payroll`, or app code.
6. `@bms/ui` may not import any server-only code.
7. `apps/mobile` may import only universal packages or explicit native entrypoints.
8. Server-only packages must expose server-only entrypoints and must not be referenced from browser or mobile bundles.
9. Shared domain validation lives in `@bms/types`; app-local form validation may wrap those schemas but may not redefine business contracts.
10. If a package needs a new dependency on a higher layer, the design is wrong and the package should be split instead.

### 3.3 Export Strategy

Use `package.json` `exports` to make boundaries enforceable:

```json
{
  "name": "@bms/auth",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client/index.ts",
    "./server": "./src/server/index.ts"
  }
}
```

Recommended export patterns:

- `@bms/ui/web`
- `@bms/ui/native`
- `@bms/ui/tokens`
- `@bms/auth/client`
- `@bms/auth/server`
- `@bms/types/schemas`
- `@bms/types/api`

### 3.4 Enforcement Mechanisms

- `eslint-plugin-import` with `import/no-cycle`
- `eslint-plugin-boundaries` or `eslint-plugin-perfectionist` style import grouping
- TypeScript project references for explicit build edges
- `dependency-cruiser` or `madge` run in CI to fail circular or forbidden imports
- `no-restricted-imports` for app-to-app and client-to-server violations

### 3.5 Shared Type and Validation Rule

Domain schemas originate in `@bms/types`:

- write Zod schemas first
- derive TypeScript types from schemas
- use same schemas for API validation, form validation, and event contracts
- keep persistence-only fields in `@bms/db`, not in public domain contracts unless intentionally exposed

## 4. Environment Variable Design

### 4.1 Principles

1. Only app entrypoints and `@bms/config` may read raw environment variables.
2. Shared packages receive config objects, not `process.env`.
3. Server secrets never use `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.
4. Public client config must be explicitly whitelisted.
5. Each app has its own validated env loader.

### 4.2 File Strategy

```text
.env.example
apps/website/.env.local
apps/dashboard/.env.local
apps/portal/.env.local
apps/mobile/.env.local
```

Recommended convention:

- root `.env.example` documents every variable across the monorepo
- local real values live in per-app `.env.local`
- shared defaults that are non-secret may live in root `.env`
- no secrets committed to git

### 4.3 Variable Categories

#### Global non-secret
- `NODE_ENV`
- `APP_ENV`
- `LOG_LEVEL`

#### Shared infrastructure secrets
- `DATABASE_URL`
- `REDIS_URL`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_REGION`
- `OBJECT_STORAGE_ACCESS_KEY`
- `OBJECT_STORAGE_SECRET_KEY`

#### Auth
- `AUTH_SECRET`
- `AUTH_ISSUER_URL`
- `AUTH_AUDIENCE`

#### Payments
- `PAYMENTS_PROVIDER`
- `PAYMENTS_SECRET_KEY`
- `PAYMENTS_WEBHOOK_SECRET`

#### Payroll
- `PAYROLL_PROVIDER`
- `PAYROLL_API_KEY`

#### Notifications
- `EMAIL_PROVIDER_API_KEY`
- `SMS_PROVIDER_API_KEY`
- `PUSH_PROVIDER_CREDENTIALS`

#### WordPress
- `WORDPRESS_API_URL`
- `WORDPRESS_WEBHOOK_SECRET`

#### Public web variables
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_MARKETING_SITE_URL`
- `NEXT_PUBLIC_PORTAL_URL`

#### Public mobile variables
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SENTRY_DSN`

### 4.4 Env Validation Structure

Implement env schemas in `@bms/config`:

```text
packages/config/src/env/
├─ base.ts
├─ server.ts
├─ next.ts
├─ expo.ts
└─ index.ts
```

Usage model:

- `apps/website/env.ts` loads `next` public plus website server variables
- `apps/dashboard/env.ts` loads full server variables
- `apps/portal/env.ts` loads portal public plus server variables
- `apps/mobile/env.ts` loads Expo public variables only

### 4.5 Distribution by Platform

#### Vercel
- configure each web app as its own Vercel project
- set `Root Directory` to the repo root
- set `Framework` per app automatically
- set `Install Command` to `pnpm install --frozen-lockfile`
- set `Build Command` to filtered turbo build for the target app
- store secrets in each Vercel project environment

Recommended per-app build command examples:

- website: `pnpm turbo build --filter=website`
- dashboard: `pnpm turbo build --filter=dashboard`
- portal: `pnpm turbo build --filter=portal`

#### Expo EAS
- public mobile config in `EXPO_PUBLIC_*`
- secrets in EAS Secrets
- environment-specific `app.config.ts` reads only the validated mobile env loader

## 5. Local Development Workflow

### 5.1 Tooling

- `pnpm` for workspace management
- `turbo` for task orchestration and caching
- `tsc --build` for project-reference type safety
- optional `husky` + `lint-staged` for pre-commit checks

### 5.2 Root Scripts

Recommended root scripts:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=website --filter=dashboard --filter=portal",
    "dev:mobile": "turbo dev --filter=mobile",
    "build": "turbo build",
    "lint": "turbo lint",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "check": "pnpm lint && pnpm typecheck && pnpm format:check",
    "depcheck": "dependency-cruiser --config .dependency-cruiser.cjs .",
    "db:migrate": "pnpm --filter @bms/db migrate",
    "db:seed": "pnpm --filter @bms/db seed"
  }
}
```

### 5.3 Recommended Daily Workflow

1. Run `pnpm install`.
2. Copy env templates into each app-local `.env.local`.
3. Run `pnpm db:migrate` and `pnpm db:seed` if the dashboard or portal backend requires local data.
4. Run `pnpm dev:web` for the web stack.
5. Run `pnpm dev:mobile` for Expo.
6. Before commit, run `pnpm check` and `pnpm depcheck`.

### 5.4 App Runtime Responsibilities in Dev

- `website` runs independently and talks to public or preview API endpoints
- `dashboard` runs as the primary local server-integrated app
- `portal` runs against the same backend contracts as dashboard, but with external-role restrictions
- `mobile` talks to the same API contract through `@bms/api-client`

### 5.5 Shared Package Build Strategy

For developer speed:

- universal packages should expose source directly to Next.js and Expo via workspace linking
- server-only packages can compile with `tsup` or `tsc` if needed
- apps should use workspace dependencies such as `"@bms/types": "workspace:*"`
- Next apps should set `transpilePackages` for any shared packages that ship source
- Expo should be configured for workspace resolution in `metro.config.js`

## 6. CI/CD Workflow

### 6.1 CI Pipeline

Trigger on:

- every pull request
- push to `main`
- release tags for mobile builds

CI stages:

1. `install`
   - setup Node
   - setup pnpm
   - restore pnpm and turbo cache
   - run `pnpm install --frozen-lockfile`
2. `static-checks`
   - run `pnpm lint`
   - run `pnpm format:check`
   - run `pnpm typecheck`
   - run `pnpm depcheck`
3. `tests`
   - run package and app test suites
4. `build`
   - run `pnpm build`
5. `preview-deploy`
   - trigger Vercel previews for changed web apps
   - optionally trigger Expo preview build for mobile on selected branches

### 6.2 Web Deployment

Each Next.js app should be a separate Vercel project pointing to the same monorepo.

Recommended model:

- `website` deploys on every merge to `main` and PR preview
- `dashboard` deploys on every merge to `main` and PR preview
- `portal` deploys on every merge to `main` and PR preview

Vercel settings:

- root directory: repo root
- install command: `pnpm install --frozen-lockfile`
- build command: `pnpm turbo build --filter=<app-name>`
- output handled by Next.js adapter

### 6.3 Mobile Deployment

Use Expo Application Services:

- preview builds from release candidate branches or manual dispatch
- production builds from signed tags or release workflow
- OTA updates only for JavaScript-safe releases, never for native dependency changes without a build

### 6.4 Database and Migration Deployment

Recommended production rule:

- schema migrations run in a dedicated protected workflow, not from arbitrary app startup
- migration workflow requires approval for production environments
- deployment order is `migrate` then `deploy app`

### 6.5 Required CI Guards

- fail on circular dependency detection
- fail on use of undeclared env vars
- fail on import of server-only packages into client/mobile code
- fail on API contract drift if request/response schemas changed without corresponding type updates
- fail on formatting or lint divergence

### 6.6 Release Discipline

- merge to `main` only through pull request
- require passing CI before merge
- require preview deployment for web apps before production promotion
- tag mobile releases explicitly
- record package and app changes in release notes if behavior or contracts change

## Recommended Monorepo Rules Summary

- `dashboard` is the primary operational web app
- `portal` is the restricted external app
- `website` is public and WordPress-oriented
- `mobile` is API-only and never imports server packages
- `@bms/types` is the contract source of truth
- `@bms/config` is the only place raw env access is normalized
- `@bms/api-client` is transport-only
- server integrations stay in server-only packages
- boundary checks run locally and in CI
