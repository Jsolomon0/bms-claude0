CREATE TYPE lead_status_enum AS ENUM (
  'new',
  'qualified',
  'converted',
  'disqualified',
  'archived'
);

CREATE TYPE project_request_status_enum AS ENUM (
  'submitted',
  'screening',
  'approved',
  'rejected',
  'converted',
  'archived'
);

CREATE TYPE consultation_status_enum AS ENUM (
  'requested',
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE invite_status_enum AS ENUM (
  'pending',
  'accepted',
  'expired',
  'revoked'
);

CREATE TABLE leads (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status lead_status_enum NOT NULL DEFAULT 'new',
  source TEXT,
  summary TEXT NOT NULL,
  notes TEXT,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_leads_tenant_status ON leads (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_owner_user_id ON leads (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_customer_id ON leads (customer_id) WHERE deleted_at IS NULL;

CREATE TABLE project_requests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  requested_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status project_request_status_enum NOT NULL DEFAULT 'submitted',
  request_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  requested_start_date DATE,
  requested_budget_amount NUMERIC(14, 2),
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal', 'customer']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (requested_budget_amount IS NULL OR requested_budget_amount >= 0)
);

CREATE UNIQUE INDEX uq_project_requests_tenant_request_number_active
  ON project_requests (tenant_id, request_number)
  WHERE request_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_project_requests_customer_status
  ON project_requests (customer_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_project_requests_owner_user_id ON project_requests (owner_user_id) WHERE deleted_at IS NULL;

CREATE TABLE consultations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_request_id UUID REFERENCES project_requests(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  scheduled_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  scheduled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status consultation_status_enum NOT NULL DEFAULT 'requested',
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  notes TEXT,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal', 'customer']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (scheduled_end_at IS NULL OR scheduled_start_at IS NULL OR scheduled_end_at >= scheduled_start_at)
);

CREATE INDEX idx_consultations_request_status ON consultations (project_request_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_consultations_employee_start ON consultations (scheduled_employee_id, scheduled_start_at) WHERE deleted_at IS NULL;

CREATE TABLE invites (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  partner_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  invited_role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status invite_status_enum NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    customer_id IS NULL OR partner_organization_id IS NULL
  )
);

CREATE INDEX idx_invites_email_status ON invites (LOWER(email), status);
CREATE INDEX idx_invites_expires_at ON invites (expires_at);
