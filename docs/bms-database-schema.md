# BMS Database Schema

This document describes the normalized PostgreSQL schema added for the BMS platform.

## 1. Schema Proposal

### 1.1 Design Conventions

- Primary keys: UUID, application-generated
- Multi-tenancy boundary: every domain root carries `tenant_id`
- Authorization fields:
  - `organization_id`
  - `customer_id` where customer-owned access matters
  - `owner_user_id` or equivalent workflow owner field
  - `partner_organization_id` on partner-scoped project records
  - `visibility_flags visibility_flag_enum[]`
- Soft delete and archive strategy on mutable master records:
  - `archived_at`
  - `archived_by_user_id`
  - `deleted_at`
  - `deleted_by_user_id`
- Retention controls on records that may be subject to legal/accounting hold:
  - `retention_locked`
  - `retention_until`
  - `legal_hold`
- Append-only exception:
  - `audit_logs`
  - `clock_events`
  - `inventory_movements`
  - `transactions`
  - `messages`
  These are intentionally not soft-deleted in normal workflows.

### 1.2 Foundation and Access

Implemented in [0001_authz_foundation.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0001_authz_foundation.sql:1>):

- `tenants`
- `users`
- `organizations`
- `contacts`
- `roles`
- `permissions`
- `role_permissions`
- `user_role_memberships`
- `membership_permission_overrides`
- `audit_logs`
- `public_share_links`
- `public_share_link_scopes`

Purpose:

- establish platform identity and access boundaries
- support role-based permission grants and per-membership overrides
- support signed expiring public links with narrow permission scopes
- store append-only audit events

### 1.3 Parties and Profiles

Implemented in [0002_parties.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0002_parties.sql:1>):

- `customers`
- `employees`
- `subcontractors`
- `supercontractors`

Purpose:

- normalize party specialization instead of overloading `organizations`
- preserve different lifecycle and retention rules for customers vs workforce vs external partners
- allow `user_role_memberships.customer_id` to reference an actual customer record

### 1.4 Intake and Engagement

Implemented in [0003_intake_and_requests.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0003_intake_and_requests.sql:1>):

- `leads`
- `project_requests`
- `consultations`
- `invites`

Purpose:

- separate pre-customer intake from converted customer/project records
- keep invitations and consultation scheduling independently queryable

### 1.5 Project Delivery

Implemented in [0004_projects_and_documents.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0004_projects_and_documents.sql:1>):

- `projects`
- `phases`
- `tasks`
- `assignments`
- `progress_updates`
- `change_orders`

Purpose:

- normalize project hierarchy
- keep assignments generic enough for users, contacts, organizations, and customers
- preserve project/customer/partner ownership fields for authorization checks

### 1.6 Documents and Sharing

Implemented in [0004_projects_and_documents.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0004_projects_and_documents.sql:1>):

- `documents`
- `document_versions`
- `document_access_rules`
- `public_share_links`
- `public_share_link_scopes`

Purpose:

- separate document metadata from versioned file blobs
- store explicit access rules instead of inferring visibility only from the parent record
- keep public link scopes narrow and auditable

### 1.7 Workforce Time

Implemented in [0005_workforce_time.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0005_workforce_time.sql:1>):

- `pay_periods`
- `timesheets`
- `clock_events`
- `time_entries`

Purpose:

- distinguish raw clock captures from approved time accounting
- support employee payroll periods and project-linked time tracking

### 1.8 Finance

Implemented in [0006_finance.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0006_finance.sql:1>):

Requested tables:

- `invoices`
- `invoice_items`
- `payments`
- `expenses`
- `bills`
- `purchase_orders`
- `receipts`
- `transactions`

Support tables added for normalization:

- `payment_allocations`
- `purchase_order_items`
- `bill_items`

Purpose:

- avoid storing many-to-many payment/invoice relationships in a single header table
- preserve line-item level bill and purchase-order detail
- keep `transactions` as immutable finance postings rather than editing source documents in place

### 1.9 Inventory and Communications

Implemented in [0007_inventory_and_communications.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0007_inventory_and_communications.sql:1>):

Requested tables:

- `inventory_items`
- `inventory_movements`
- `project_material_allocations`
- `notifications`
- `message_threads`
- `message_participants`

Support table added for normalization:

- `messages`

Purpose:

- keep stock state derived from immutable movements
- keep thread membership separate from message bodies
- support project/customer-linked communications with per-recipient notifications

### 1.10 Ownership and Visibility Strategy

The schema uses three separate ideas intentionally:

- Ownership:
  - `owner_user_id`
  - `organization_id`
  - `customer_id`
  - `partner_organization_id`
- Audience:
  - `visibility_flags`
- Access exceptions:
  - `document_access_rules`
  - `public_share_link_scopes`

This separation matters. A record may be owned by an internal organization, visible to a customer, and still have narrower document-level access rules.

## 2. Migration Order

1. [0001_authz_foundation.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0001_authz_foundation.sql:1>)
   Creates tenants, users, organizations, contacts, RBAC tables, audit logs, and public share links.
2. [0002_parties.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0002_parties.sql:1>)
   Creates customer, employee, subcontractor, and supercontractor profiles.
3. [0003_intake_and_requests.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0003_intake_and_requests.sql:1>)
   Creates pre-project intake workflow tables.
4. [0004_projects_and_documents.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0004_projects_and_documents.sql:1>)
   Creates project hierarchy plus document metadata, versions, and access rules.
5. [0005_workforce_time.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0005_workforce_time.sql:1>)
   Creates pay periods, timesheets, clock events, and time entries.
6. [0006_finance.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0006_finance.sql:1>)
   Creates invoices, payments, expenses, bills, purchase orders, receipts, and immutable transactions.
7. [0007_inventory_and_communications.sql](</C:/Users/JOHN ALYN/bms/codex_bms/packages/db/migrations/0007_inventory_and_communications.sql:1>)
   Creates inventory tracking plus messaging and notification tables.

## 3. Seed Strategy

### 3.1 Reference Seed First

Seed once per environment:

- `tenants`
- `roles`
- `permissions`
- `role_permissions`

Recommended baseline roles:

- owner
- administrator
- developer
- employee
- customer
- subcontractor
- supercontractor

### 3.2 System Bootstrap Seed

Seed next:

- one internal organization
- one owner user
- one administrator user
- one employee record linked to the owner/admin users
- a minimal chart of sample contacts

### 3.3 Scenario Seed Packs

Create repeatable scenario seeds by domain:

- `customer_short_term`
  - short-term customer
  - lead
  - project request
  - expiring public share link
- `customer_long_term`
  - long-term customer
  - active project
  - invoices and payments
- `partner_delivery`
  - subcontractor organization
  - supercontractor organization
  - partner-scoped assignments
- `payroll_time`
  - employee
  - pay period
  - clock events
  - submitted timesheet

### 3.4 Seed Safety Rules

- never seed live payment tokens or secrets
- seed public share links only with synthetic hashed tokens
- seed finance records with obviously fake external references
- seed enough archived/deleted/legal-hold cases to test retention logic

## 4. High-Risk Tables Requiring Extra Audit Logic

### Highest priority

- `user_role_memberships`
  Changes here alter effective access immediately.
- `membership_permission_overrides`
  These create narrow exceptions that are easy to misuse.
- `public_share_links`
  Every issue, revoke, expiry, and access should be logged.
- `document_access_rules`
  These can expose sensitive documents outside normal record ownership.
- `audit_logs`
  This table should be append-only and protected from operational edits.

### Finance-sensitive

- `invoices`
- `payments`
- `payment_allocations`
- `expenses`
- `bills`
- `purchase_orders`
- `transactions`

Required audit focus:

- status changes
- amount changes
- approval changes
- void/reverse/reallocate events
- retention or legal-hold changes

### Workforce-sensitive

- `pay_periods`
- `timesheets`
- `time_entries`
- `clock_events`

Required audit focus:

- manual edits after submission
- approval or rejection decisions
- payroll lock/unlock events
- imported or system-generated corrections

### External-visibility sensitive

- `projects`
- `change_orders`
- `documents`
- `document_versions`
- `message_threads`
- `notifications`

Required audit focus:

- visibility flag changes
- ownership reassignment
- public or partner-facing publication events
- archive/delete transitions on retained records
