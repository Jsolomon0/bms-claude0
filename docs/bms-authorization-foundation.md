# BMS Authorization Foundation

This document maps the implemented authorization foundation to the required deliverables.

## Deliverable Map

1. Permission registry
   - [packages/permissions/src/registry.ts](</C:/Users/JOHN ALYN/bms/codex_bms/packages/permissions/src/registry.ts:1>)
2. Database schema
   - [packages/db/migrations/0001_authz_foundation.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0001_authz_foundation.sql:1>)
   - [packages/db/src/schema/authz.ts](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/src/schema/authz.ts:1>)
3. Server-side authorization helpers
   - [packages/auth/src/server/authorize.ts](</C:/Users/JOHN ALYN/bms/codex_bms/packages/auth/src/server/authorize.ts:1>)
   - [packages/auth/src/server/public-links.ts](</C:/Users/JOHN ALYN/bms/codex_bms/packages/auth/src/server/public-links.ts:1>)
   - [packages/permissions/src/evaluate.ts](</C:/Users/JOHN ALYN/bms/codex_bms/packages/permissions/src/evaluate.ts:1>)
4. Route protection patterns
   - [packages/auth/src/server/route-protection.ts](</C:/Users/JOHN ALYN/bms/codex_bms/packages/auth/src/server/route-protection.ts:1>)
5. Sample middleware
   - [apps/dashboard/proxy.ts](</C:/Users/JOHN ALYN/bms/codex_bms/apps/dashboard/proxy.ts:1>)
   - [apps/portal/proxy.ts](</C:/Users/JOHN ALYN/bms/codex_bms/apps/portal/proxy.ts:1>)
6. Authorization edge-case tests
   - [tests/authorization.test.ts](</C:/Users/JOHN ALYN/bms/codex_bms/tests/authorization.test.ts:1>)

## Design Notes

### Permission model
- Permission keys use the required fine-grained format such as `project.view.assigned`, `invoice.approve.org`, and `payroll.view.self`.
- Every permission definition declares scope, allowed visibilities, sensitivity, and whether public-link access is valid.
- Role grants are defined centrally and may be overridden per membership through explicit allow or deny entries.

### Record-level authorization
- The evaluator distinguishes coarse permission possession from record-level access.
- Record checks consider organization, assignment, self ownership, partner ownership, and public-link scope.
- Visibility is enforced independently of permission possession.

### Visibility rules
- Internal roles can reach internal records when they also hold the matching permission and scope.
- Customer, subcontractor, and supercontractor visibility are explicit record audiences rather than implied by role.
- `public_link` visibility must be present on a record before public-link access is allowed.

### Signed public links
- Public-link tokens are HMAC-signed and expiration-bound.
- Database rows store only token hashes plus scoped permission keys.
- Authorization requires both a valid signed token and a matching persisted link grant.

## Protection Patterns

### 1. Middleware for coarse path gating
Use middleware only for broad page-level restrictions.

- Example: `/admin` requires owner or administrator
- Example: `/audit` requires an audit-view permission

Do not rely on middleware alone for record security.

### 2. Route handlers for record-level checks
Use `protectRoute()` for authenticated handlers and supply a record resolver when a concrete entity is involved.

Pattern:

```ts
const handler = protectRoute(
  {
    permissionKey: "invoice.approve.org",
    resolveRecord: async (request) => loadInvoiceRecord(request)
  },
  async ({ record }) => ({
    status: 200,
    body: { ok: true, invoiceId: record?.resourceId }
  })
);
```

### 3. Signed-link routes
Use `verifySignedPublicLinkToken()` before the request reaches business logic, then load the persisted link row and pass the resolved link into `protectPublicLinkRoute()`.

Pattern:

```ts
const handler = protectPublicLinkRoute(
  {
    permissionKey: "document.view.public_link",
    resolveRecord: async (request) => loadDocumentRecord(request)
  },
  async ({ record }) => ({
    status: 200,
    body: { id: record.resourceId }
  })
);
```

### 4. Sensitive action auditing
Call `authorizeOrThrow()` with an audit sink for sensitive reads, approvals, membership changes, and every public-link decision.
