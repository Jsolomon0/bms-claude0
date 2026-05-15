# BMS Security Hardening

## Security Checklist

- Authentication: protected-route and middleware entry points now support rate limiting and structured security telemetry.
- Authorization verification: sensitive route authorization remains server-side and now shares hardened guard rails for rate limits and privileged approvals.
- Audit log completeness: security events now audit privileged approval creation/denial, rate-limit blocks, invalid public-link attempts, retention enforcement, and fallback-secret usage.
- Rate limiting: shared in-memory limiter added for route and middleware protection patterns with 429 responses and monitoring hooks.
- Signed URL security: public-link tokens now validate secret quality, token shape, payload shape, nonce format, and issued-at/expiry semantics.
- Secret handling: runtime secrets resolve from environment variables first and log fallback usage without exposing secret values.
- Retention/deletion policy enforcement: retained documents require explicit privileged approval before archival and emit retention enforcement audit events.
- Privileged action approvals: approval records now gate public-link issuance and payroll export, with resource-bound approval matching.
- Monitoring hooks and structured logging: shared logger and monitoring hooks now emit consistent security event names for invalid links, approvals, secrets, and rate limits.

## Threat Model Summary

- Credential and session abuse: repeated anonymous or authenticated probing against protected routes is now rate limited and logged.
- Broken access control: privileged actions now require both authorization and an explicit approval record tied to actor, resource, and action.
- Public-link abuse: signed-link verification now rejects malformed or weakly protected tokens and records invalid verification attempts.
- Secret exposure risk: demo/runtime secrets are no longer silently hardcoded as the effective source of truth; fallback usage is visible in logs and audits.
- Retention-policy bypass: operators cannot archive retained documents without an explicit approval checkpoint.
- Audit gap risk: security-relevant operational events now enter the same audit stream as domain actions.

## Known Gaps

- Rate limiting is currently in-memory; distributed deployments still need a shared backend such as Redis.
- Approval records are currently in-memory runtime state; production use still needs durable persistence and reviewer identity assurance.
- Secret resolution warns on fallback usage but does not yet integrate with a dedicated secret manager or key rotation workflow.
- Structured logging and monitoring hooks are in-process adapters; production still needs shipping to an external log pipeline and alerting backend.
- Retention enforcement is implemented for retained document archival first; broader deletion/retention workflows across finance and identity records still need the same pattern.
