Business Management System (BMS) — MVP Plan (Phase-1)

Goal
Deliver a usable system for project intake, approvals, tracking, and payments with strict role-based access control, running locally on a single server.

MVP Scope (Must-Haves)
1) Auth + RBAC
- Roles: Owner, Admin, Developer, Employee, Customer, Subcontractor, Supercontractor
- Permissions enforced on every endpoint and UI screen
- Audit logging for approvals and sensitive actions

2) Customer Request Intake
- Public questionnaire with optional image uploads
- Short-term customer creation (name, email only)
- Auto-expire short-term accounts after 30 days inactivity

3) Project Workflow
- Employee can create draft projects
- Owner/Admin approval required to activate project
- Status flow: pending_approval -> active -> completed

4) Project Tracking
- Updates with notes and images
- Customer/Subcontractor share link (no login)
- External comments allowed via share link

5) Documents
- File upload and categorization
- Project-linked document library

6) Invoices & Payments
- Invoice creation
- Stripe Checkout
- Payment status tracking

7) Archiving
- Auto-archive files older than 30 days to external drive
- Restore on demand

Non-Goals (Phase-1)
- Full payroll (Phase-2)
- Bank feeds and advanced accounting
- Native mobile apps (PWA only in Phase-1)

Milestones

Milestone 0: Project Setup (1 week)
- Repo scaffolding
- Local dev environment
- Baseline CI config (optional for local)

Milestone 1: Core Data + Auth (2 weeks)
- PostgreSQL schema + migrations
- Auth (login, password reset)
- RBAC middleware
- Audit log foundation

Milestone 2: Request Intake + Projects (2 weeks)
- Public request form
- Project creation and approval flow
- Project list + detail UI

Milestone 3: Tracking + Comments (2 weeks)
- Project updates with images
- Share links and external comments
- Rate limiting for external comments

Milestone 4: Documents + Invoices (2 weeks)
- Document uploads + library
- Invoice creation + Stripe payments

Milestone 5: Archiving + Hardening (1 week)
- File archive job
- Restore flow
- Backups + basic monitoring

Acceptance Criteria
- Owner/Admin can approve projects and customer accounts
- Employees can create drafts, but cannot activate projects
- Customers/Subcontractors can view and comment via share links
- Stripe payment flow works end-to-end
- Archived files are restored reliably
- 100 concurrent users supported on local server

Risks & Mitigations
- No UPS: risk of downtime/data loss
  - Mitigation: add UPS, enforce nightly backups
- Public admin portal exposure
  - Mitigation: rate limiting, MFA option, IP allowlist
- File storage growth
  - Mitigation: archive at 30 days, compression on upload

Deliverables
- Deployed local MVP
- Admin portal + customer request flow
- Documentation: requirements, schema, API map, UI map, deployment guide, MVP plan
