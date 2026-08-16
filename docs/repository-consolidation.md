# BMS Repository Consolidation

## Canonical repository

`Jsolomon0/bms-claude0` is the canonical repository for the generic Business Management System (BMS) platform.

It contains the flattened Turborepo workspace with the primary applications, shared packages, tests, scripts, and technical documentation. Generic platform development should originate here.

## Repository lineage

### `Jsolomon0/bms-claude`

Initial BMS MVP and architecture prototype. It contains the early Fastify/Prisma server, React/Vite web shell, and the first requirements, schema, API, UI, and deployment documents.

Status: historical predecessor. Preserve for history; do not use as the active development base.

### `Jsolomon0/bms_codex`

Expanded the MVP into the larger BMS implementation under a nested `codex_bms/` monorepo. This is the direct predecessor of the flattened workspace.

Status: historical predecessor. Preserve for history; do not use as the active development base.

### `Jsolomon0/bms-claude0`

Flattened the `codex_bms/` workspace to repository root and removed the legacy standalone `server/` and `web/` implementation. It contains the generic BMS platform without client-specific branding.

Status: canonical generic BMS repository.

### `Jsolomon0/VetCor_Norcross_CL_BMS`

Shares the BMS platform lineage through the monorepo flattening point, then adds VetCor of Norcross-specific website, branding, SEO, marketing, and deployment work.

Status: client-specific implementation/fork. Keep client customization here. Only reusable, client-neutral fixes should be backported to the canonical BMS repository.

### `Jsolomon0/bms-codex-2`

Empty repository at the time of the consolidation review.

Status: no implementation to consolidate.

## Consolidation policy

1. Build generic BMS platform features in `Jsolomon0/bms-claude0`.
2. Keep client branding, copy, site configuration, marketing components, and client-specific workflows in client repositories such as `VetCor_Norcross_CL_BMS`.
3. Backport only client-neutral bug fixes, tooling improvements, security fixes, test fixes, and reusable platform enhancements from client repositories.
4. Do not wholesale-merge a client repository into the canonical platform.
5. Treat `bms-claude` and `bms_codex` as historical snapshots unless a specific missing capability is proven to exist only there.
6. Before retiring a predecessor, compare its final tree against the canonical repository and preserve any unique documentation or implementation that is still valuable.

## Backports included with this consolidation

- Refresh the payroll integration test approval expiry so the fixture is not permanently expired.
- Normalize `vercel.json` formatting while preserving its existing build semantics.

No VetCor branding or marketing changes are included in these backports.
