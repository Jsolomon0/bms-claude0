# BMS Technical Specification

## 1. System Architecture Summary

### 1.1 Product Objective
The BMS platform is the operational system of record for customer, project, document, partner, workforce, and financial workflows. It consists of:

- A web application as the authoritative data-entry and administration surface
- A mobile companion application for stakeholder access and task execution
- A headless WordPress website for public-facing content, marketing pages, and intake entry points

The BMS web application, not WordPress, owns all business records and workflow state.

### 1.2 Architecture Style
The recommended implementation is a modular monolith with well-defined domain boundaries and versioned APIs. This keeps initial delivery practical while preserving a clean path to later service extraction for finance, documents, notifications, and reporting.

Core runtime components:

- `Web App`: primary internal and partner operational UI
- `Mobile App`: companion UI for employees, customers, subcontractors, and supercontractors
- `Public Website (Headless WordPress)`: public content and landing pages
- `BMS API`: authoritative application layer and policy enforcement point
- `Background Workers`: async jobs for notifications, document processing, payment reconciliation, retention jobs, and reporting aggregation
- `Relational Database`: authoritative transactional store
- `Object Storage`: document, image, and attachment store
- `Search/Index Layer`: optional in MVP, recommended once document/project volume grows
- `Audit Log Store`: append-only audit trail for security and compliance events

### 1.3 System Context

#### Internal channels
- Web app is the only full-administration surface
- Mobile app exposes scoped task flows, approvals, uploads, time entry, project status, and notifications

#### External channels
- WordPress renders public pages and consumes BMS data only through approved read-only or webhook-driven integration paths
- Public no-login access for projects, documents, and payments is granted only through signed expiring links issued by BMS

### 1.4 Headless WordPress Integration
WordPress is a presentation layer, not a workflow engine. Integration rules:

- Public website content is managed in WordPress
- Operational data is authored and stored in BMS
- Website forms submit to BMS intake APIs directly or via secure server-to-server webhook
- BMS may expose selected read-only content to WordPress, such as public case studies, approved project highlights, and partner directory entries
- Customer, project, invoice, payment, or document records must never be mastered in WordPress
- Authentication for secure business workflows is handled by BMS, not WordPress

### 1.5 Access Model
Seven platform roles are required:

- Owner
- Administrator
- Developer
- Employee
- Customer
- Subcontractor
- Supercontractor

Access control is enforced on every request using a four-dimensional permission tuple:

- `Feature`: module or resource family
- `Action`: create, read, update, delete, approve, submit, export, publish, assign, pay, reconcile, etc.
- `Record Scope`: all records, organization, assigned project, own records, partner organization, public signed-link scope
- `Visibility`: internal confidential, internal operational, partner-shared, customer-shared, public-via-signed-link

No UI-only authorization is allowed. The API is the policy enforcement source of truth.

### 1.6 Customer Lifecycle
Customers are classified as:

- `short_term`
- `long_term`

Short-term customer rule:

- If no qualifying activity occurs for 30 consecutive days, the customer transitions to `expired`
- Qualifying activity includes project activity, document exchange, invoice/payment activity, authenticated portal access, or staff-recorded interaction
- On expiration, portal access is disabled, new public links are blocked, and operational visibility is reduced to authorized internal users
- If invoices, payments, tax, legal, contract, or audit-relevant artifacts exist, the customer record transitions to `retained_legal` instead of being hard-deleted
- Retained records remain discoverable only to roles with retention visibility permissions

Long-term customers do not auto-expire.

### 1.7 Public Signed-Link Access
No-login access is permitted only through signed expiring links for approved resource types:

- project status views
- document download/view
- invoice/payment pages

Signed-link requirements:

- cryptographically signed token
- resource-bound and action-bound
- explicit expiry timestamp
- revocable before expiry
- optional single-use or max-use count for sensitive documents
- full audit logging of issuance, access, failure, revocation, and expiration

## 2. Module Boundaries

### 2.1 CRM
Owns:

- customer accounts
- contacts
- customer classification
- lifecycle state
- relationship history
- account ownership

Does not own:

- intake submissions before conversion
- project execution
- invoices and payments

### 2.2 Intake
Owns:

- website and internal intake submissions
- qualification pipeline
- conversion into CRM customer and project records
- intake attachments

Does not own:

- canonical customer after conversion
- project execution state after project creation

### 2.3 Projects
Owns:

- project master record
- milestones
- tasks
- assignments
- status tracking
- stakeholder participation
- public status snapshots

Depends on:

- CRM for customer
- documents for files
- partner management for external parties
- finance modules for billing and cost context

### 2.4 Documents
Owns:

- files and versions
- metadata
- access control mappings
- signatures or acknowledgments if later added
- signed-link issuance for document access

Does not own:

- project workflow
- invoice state

### 2.5 Invoicing
Owns:

- invoices
- line items
- taxes
- due dates
- invoice states
- payment intents/links

Depends on:

- CRM/customer
- projects
- payments

### 2.6 Payments
Owns:

- payment transactions
- reconciliation status
- gateway references
- refunds
- public payment session access

Does not own:

- invoice creation rules
- general ledger

### 2.7 Expenses
Owns:

- employee or partner expense submissions
- categories
- receipts
- approval status
- reimbursement status

### 2.8 Bills
Owns:

- vendor or partner payables
- bill line items
- due dates
- approval workflow
- payment scheduling status

### 2.9 Payroll and Time Tracking
Owns:

- time entries
- timesheets
- payroll periods
- pay codes
- approval workflow

MVP note:

- payroll may remain export-based in MVP while time tracking is native

### 2.10 Inventory
Owns:

- items
- stock levels
- reservations
- allocations to projects
- adjustment history

### 2.11 Reporting
Owns:

- saved reports
- dashboard definitions
- operational aggregates
- scheduled exports

Does not own:

- source-of-truth transactional records

### 2.12 Notifications
Owns:

- notification templates
- delivery preferences
- in-app notifications
- email/SMS/push dispatch history

### 2.13 Partner Management
Owns:

- partner organizations
- subcontractor and supercontractor identities
- project affiliations
- insurance/compliance metadata
- partner contacts
- partner status and qualification

Business distinction:

- `Subcontractor`: external party assigned to perform work on specific projects
- `Supercontractor`: external party with broader oversight or management responsibility, potentially supervising multiple subcontractors across assigned projects

## 3. Role-Permission Matrix

### 3.1 Permission Model

#### Actions
- `C`: create
- `R`: read
- `U`: update
- `D`: delete
- `A`: approve/reject
- `S`: submit/share/send
- `X`: export
- `M`: manage permissions/settings
- `P`: pay/reconcile financial transaction

#### Record scopes
- `ALL`: all records in tenant
- `ORG`: own organization
- `ASSIGNED`: explicitly assigned project/account/work item
- `OWN`: actor's own record
- `PARTNER`: partner organization plus assigned projects
- `PUBLIC`: signed-link resource only
- `NONE`: no direct access

#### Visibility classes
- `IC`: internal confidential
- `IO`: internal operational
- `PS`: partner-shared
- `CS`: customer-shared
- `PL`: public via signed link only

### 3.2 Global Role Rules

| Role | Baseline Scope | Notes |
|---|---|---|
| Owner | `ALL` | Full business and financial authority; may override retention and visibility rules where legally allowed |
| Administrator | `ALL` except owner-only governance controls | Manages users, configuration, workflows, and operational records |
| Developer | `NONE` by default for business data; controlled support scope only | Access limited to environment, diagnostics, schemas, and explicitly granted masked datasets |
| Employee | `ASSIGNED` and `OWN` | Operational role with limited cross-module access based on assignment |
| Customer | `OWN` and project/account-linked `CS` | Limited to own account, own projects, own invoices/payments, and approved documents |
| Subcontractor | `PARTNER` for assigned projects, `OWN` for profile/time/expenses | No visibility into unrelated customers, partners, or global financials |
| Supercontractor | `PARTNER` across managed projects and subordinate partner relationships | Broader oversight than subcontractor, but still external and scope-limited |

### 3.3 Module Access Matrix

| Module | Owner | Administrator | Developer | Employee | Customer | Subcontractor | Supercontractor |
|---|---|---|---|---|---|---|---|
| CRM | `C/R/U/D/A/X/M ALL IC/IO/CS` | `C/R/U/D/A/X/M ALL IC/IO/CS` | `R NONE` unless delegated support session | `C/R/U ASSIGNED IO/CS` | `R/U OWN CS` limited profile/contact fields | `R OWN` contact and org profile only | `R/U PARTNER` partner profile only |
| Intake | `C/R/U/D/A/X ALL IC/IO` | `C/R/U/D/A/X ALL IC/IO` | `R NONE` unless delegated support session | `C/R/U/A ASSIGNED IO` | `C OWN` public/portal submission, `R OWN` status | `C/R OWN` partner onboarding/intake only | `C/R/U PARTNER` for managed partner onboarding |
| Projects | `C/R/U/D/A/X/M ALL IC/IO/PS/CS` | `C/R/U/D/A/X/M ALL IC/IO/PS/CS` | `R NONE` unless delegated support session | `C/R/U/A ASSIGNED IO/PS/CS` | `R OWN CS/PL`, limited acknowledgments and uploads | `R/U ASSIGNED PS`, task completion and file upload only | `R/U PARTNER PS`, oversight on assigned projects |
| Documents | `C/R/U/D/A/S/X/M ALL IC/IO/PS/CS/PL` | `C/R/U/D/A/S/X/M ALL IC/IO/PS/CS/PL` | `R NONE` unless delegated support session | `C/R/U/S ASSIGNED IO/PS/CS` | `R/S OWN CS/PL`, upload only if explicitly enabled | `C/R/U/S ASSIGNED PS` | `C/R/U/S PARTNER PS/CS` where authorized |
| Invoicing | `C/R/U/D/A/S/X ALL IC/CS` | `C/R/U/D/A/S/X ALL IC/CS` | `R NONE` unless delegated support session | `R/U ASSIGNED IO`, create only if granted | `R OWN CS/PL` | `R ASSIGNED` only subcontractor-facing invoices or remittance views | `R PARTNER` for managed billing views |
| Payments | `R/U/A/P/X ALL IC/CS/PL` | `R/U/A/P/X ALL IC/CS/PL` | `R NONE` unless delegated support session | `R ASSIGNED IO` | `R/P OWN CS/PL` | `R OWN` reimbursement or partner payment status only | `R PARTNER` for managed partner settlements |
| Expenses | `C/R/U/D/A/P/X ALL IC` | `C/R/U/D/A/P/X ALL IC` | `R NONE` unless delegated support session | `C/R/U OWN`, `R/A ASSIGNED` if approver | `NONE` | `C/R/U OWN`, `R ASSIGNED` if contract allows | `R/A PARTNER` for supervised subcontractor expenses if enabled |
| Bills | `C/R/U/D/A/P/X ALL IC` | `C/R/U/D/A/P/X ALL IC` | `R NONE` unless delegated support session | `C/R/U ASSIGNED`, `A` only if delegated | `NONE` | `R OWN` only for bills submitted by that partner | `R/U PARTNER` for submitted partner bills |
| Payroll/Time | `C/R/U/D/A/X ALL IC` | `C/R/U/D/A/X ALL IC` | `R NONE` unless delegated support session | `C/R/U OWN`, `R/A ASSIGNED` manager scope | `NONE` | `C/R/U OWN` time entries if contracted | `R/A PARTNER` time oversight where enabled |
| Inventory | `C/R/U/D/A/X ALL IO` | `C/R/U/D/A/X ALL IO` | `R NONE` unless delegated support session | `R/U ASSIGNED IO` | `NONE` | `R ASSIGNED` issued/reserved items only | `R PARTNER` project inventory visibility only |
| Reporting | `R/X/M ALL IC/IO/PS/CS` | `R/X/M ALL IC/IO/PS/CS` | `R` platform telemetry only, no raw business data by default | `R/X ASSIGNED IO` | `R OWN` statement/status views only | `R OWN/PARTNER` operational and payment views only | `R PARTNER` broader managed-project summaries |
| Notifications | `C/R/U/D/M ALL` | `C/R/U/D/M ALL` | `R` delivery telemetry only | `R/U OWN`, `S` operational triggers by workflow | `R/U OWN` preferences | `R/U OWN` preferences | `R/U OWN/PARTNER` preferences |
| Partner Management | `C/R/U/D/A/X/M ALL IC/IO/PS` | `C/R/U/D/A/X/M ALL IC/IO/PS` | `R NONE` unless delegated support session | `R/U ASSIGNED IO/PS` | `R NONE` except visible partner contacts on own project | `R/U OWN org + assigned PS` | `R/U PARTNER + managed subcontractor relationships PS` |
| Security/Admin | `C/R/U/D/A/M ALL` | `C/R/U/D/A/M ALL except owner-only policies` | `R/U` environment and diagnostics only | `NONE` | `NONE` | `NONE` | `NONE` |

### 3.4 Owner-Only Controls
The following capabilities are reserved to `Owner` unless explicitly delegated in policy configuration:

- retention override and legal hold release
- financial close override
- tenant-wide export of confidential records
- owner role assignment
- platform-wide integration credential management

### 3.5 Developer Access Constraints
`Developer` is not a business operator role. It exists for implementation and support. Requirements:

- no standing access to customer financial or personnel records
- access must be time-bound and explicitly approved
- sensitive fields must be masked unless break-glass support mode is approved
- all developer data access is separately audited

## 4. Database Entity List

### 4.1 Identity and Access
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_role_assignments`
- `teams`
- `team_memberships`
- `access_policies`
- `signed_links`
- `sessions`
- `mfa_factors`
- `audit_events`

### 4.2 CRM and Intake
- `customers`
- `customer_contacts`
- `customer_addresses`
- `customer_notes`
- `customer_relationship_events`
- `customer_tags`
- `intake_submissions`
- `intake_attachments`
- `intake_status_history`
- `lead_sources`

### 4.3 Project Delivery
- `projects`
- `project_customer_links`
- `project_status_history`
- `project_milestones`
- `project_tasks`
- `project_assignments`
- `project_participants`
- `project_public_views`

### 4.4 Documents
- `documents`
- `document_versions`
- `document_links`
- `document_access_grants`
- `document_acknowledgments`
- `document_tags`

### 4.5 Finance
- `invoices`
- `invoice_line_items`
- `invoice_status_history`
- `payment_transactions`
- `payment_allocations`
- `payment_gateway_events`
- `refunds`
- `expenses`
- `expense_receipts`
- `expense_approvals`
- `bills`
- `bill_line_items`
- `bill_approvals`

### 4.6 Workforce
- `time_entries`
- `timesheets`
- `timesheet_approvals`
- `payroll_periods`
- `payroll_exports`

### 4.7 Inventory
- `inventory_items`
- `inventory_locations`
- `inventory_movements`
- `inventory_reservations`
- `inventory_allocations`

### 4.8 Partner Management
- `partner_organizations`
- `partner_contacts`
- `partner_types`
- `partner_project_assignments`
- `partner_compliance_records`
- `partner_relationships`

### 4.9 Reporting and Notifications
- `saved_reports`
- `dashboard_widgets`
- `report_runs`
- `notification_templates`
- `notification_preferences`
- `notification_events`
- `notification_deliveries`

### 4.10 Recommended Common Columns
Every mutable business entity should include at minimum:

- `id`
- `tenant_id`
- `status`
- `visibility_class`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`
- `archived_at`
- `archived_by`

Customer-specific recommended columns:

- `customer_type` (`short_term`, `long_term`)
- `lifecycle_state` (`prospect`, `active`, `inactive`, `expired`, `retained_legal`, `archived`)
- `last_activity_at`
- `retention_hold_reason`
- `retention_until`

## 5. API Domain List

All APIs should be versioned under `/api/v1`. Public signed-link routes should be isolated from authenticated routes.

### 5.1 Identity and Access API
- `/auth`
- `/users`
- `/roles`
- `/permissions`
- `/policies`
- `/sessions`
- `/mfa`

### 5.2 CRM API
- `/customers`
- `/customer-contacts`
- `/customer-activity`
- `/customer-lifecycle`

### 5.3 Intake API
- `/intake/submissions`
- `/intake/attachments`
- `/intake/conversions`
- `/public/intake`

### 5.4 Project API
- `/projects`
- `/project-milestones`
- `/project-tasks`
- `/project-assignments`
- `/project-participants`
- `/project-status`

### 5.5 Document API
- `/documents`
- `/document-versions`
- `/document-access`
- `/signed-links/documents`

### 5.6 Invoicing and Payments API
- `/invoices`
- `/invoice-line-items`
- `/payments`
- `/payment-links`
- `/payment-reconciliation`
- `/signed-links/payments`

### 5.7 Expenses and Bills API
- `/expenses`
- `/expense-approvals`
- `/bills`
- `/bill-approvals`

### 5.8 Payroll and Time API
- `/time-entries`
- `/timesheets`
- `/timesheet-approvals`
- `/payroll-periods`
- `/payroll-exports`

### 5.9 Inventory API
- `/inventory/items`
- `/inventory/movements`
- `/inventory/reservations`
- `/inventory/allocations`

### 5.10 Reporting API
- `/reports`
- `/dashboards`
- `/exports`

### 5.11 Notifications API
- `/notifications`
- `/notification-preferences`
- `/notification-templates`

### 5.12 Partner Management API
- `/partners`
- `/partner-contacts`
- `/partner-compliance`
- `/partner-relationships`
- `/partner-project-assignments`

### 5.13 Website Integration API
- `/website/content-feed`
- `/website/project-highlights`
- `/website/partner-directory`
- `/website/webhooks/intake`

### 5.14 Public Signed-Link API
- `/public/projects/{token}`
- `/public/documents/{token}`
- `/public/payments/{token}`

## 6. MVP Scope

The MVP should prioritize the minimum operational backbone that establishes the BMS platform as the system of record.

### 6.1 Included in MVP
- tenant-aware authentication and strict RBAC
- user management for all seven roles
- CRM with short-term and long-term customer support
- short-term customer 30-day inactivity expiration job
- retention-safe customer archival behavior
- intake capture from WordPress and internal staff
- project creation, assignment, milestone tracking, and stakeholder views
- document upload, versioning, scoped sharing, and signed expiring public links
- invoicing and basic online payment flow
- expense submission and approval
- bill capture and approval
- native time tracking and timesheet approval
- partner management for subcontractor and supercontractor organizations
- notifications via in-app and email
- baseline operational reporting
- audit logging for authentication, permission changes, record access, signed-link events, and financial state changes

### 6.2 MVP Mobile Scope
- authentication
- project status viewing
- task visibility
- document viewing/upload where authorized
- invoice/payment view
- time entry
- notification center

### 6.3 MVP WordPress Integration Scope
- website intake forms into BMS
- optional public project highlight feed from BMS to WordPress
- no-login signed-link pages for approved project/document/payment views

### 6.4 Deferred from MVP Even if Designed Now
- fully automated payroll calculation and tax filing
- advanced inventory forecasting
- business intelligence warehouse
- offline mobile synchronization beyond essential cache
- complex approval matrix designer

## 7. Later-Phase Scope

### 7.1 Phase 2
- advanced reporting and analytics warehouse
- scheduled report subscriptions
- richer mobile workflows, including approvals and camera-first field operations
- inventory procurement and reorder automation
- partner compliance renewal workflows
- customer self-service document acknowledgments and approval steps
- payment reconciliation automation

### 7.2 Phase 3
- full payroll engine or external payroll provider orchestration
- e-signature integration
- configurable workflow builder
- advanced contract management
- AI-assisted search, summarization, and intake triage
- cross-project supercontractor portfolio dashboards
- data warehouse and external BI connectors

## 8. Security and Audit Requirements

### 8.1 Authentication and Session Security
- support MFA for all internal roles; strongly recommended for external partner roles; optional but configurable for customers
- use short-lived access tokens and revocable refresh sessions
- support session revocation on role change, password reset, or suspicious activity
- separate public signed-link access from authenticated sessions

### 8.2 Authorization
- enforce authorization server-side on every request
- evaluate access against feature, action, scope, and visibility
- support explicit deny rules that override role defaults
- require object-level checks for every record fetch and mutation

### 8.3 Data Classification
Minimum visibility classes:

- `internal_confidential`
- `internal_operational`
- `partner_shared`
- `customer_shared`
- `public_signed_link`

Records may only be exposed to channels and roles allowed by both role policy and visibility class.

### 8.4 Signed-Link Security
- tokens must be opaque and high entropy
- token payload must bind resource type, resource id, allowed action, expiry, and optional use limit
- links must be revocable by internal users with proper permission
- token validation failures must not disclose resource existence
- maximum default expiry should be conservative; recommended default is 24 hours, configurable per use case

### 8.5 Audit Logging
Audit events must be immutable and timestamped. At minimum log:

- authentication success/failure
- MFA enrollment and removal
- role and permission changes
- user creation, deactivation, and reactivation
- customer lifecycle transitions
- project access and status changes
- document upload, download, share, revoke, and signed-link use
- invoice issuance, update, payment, refund, and reconciliation
- bill, expense, and timesheet approvals
- retention holds, archival, deletion requests, and legal overrides
- developer break-glass access sessions

### 8.6 Retention and Deletion
- short-term customers expire after 30 days of inactivity
- expiration disables operational access but does not bypass legal retention requirements
- hard deletion is blocked if linked legal, financial, payroll, contract, tax, or audit artifacts exist
- records under legal or accounting retention move to retained state with restricted visibility
- retention policies must be configurable by record category and jurisdiction

### 8.7 Privacy and Data Protection
- encrypt data in transit and at rest
- store secrets in managed secret storage, never in source control
- mask sensitive fields in logs and developer tooling
- limit production data exposure in non-production environments
- support export and deletion workflows subject to legal retention constraints

### 8.8 Operational Security
- rate limit login, intake, payment, and signed-link endpoints
- maintain dependency and vulnerability scanning
- require backup and restore procedures for transactional and document data
- support disaster recovery objectives for core business continuity

## Implementation Notes

### Recommended Delivery Strategy
Build the platform as a modular monolith first, with the following enforcement priorities in order:

1. identity, RBAC, and audit
2. customer lifecycle and retention
3. project and document workflows
4. invoicing and payments
5. partner and workforce workflows

### Non-Negotiable Constraints
- BMS web app remains the primary system of record
- WordPress never becomes the authoritative source for business workflow data
- public access always uses signed expiring links
- external roles never receive tenant-wide visibility by default
