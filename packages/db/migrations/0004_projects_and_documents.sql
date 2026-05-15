CREATE TYPE project_status_enum AS ENUM (
  'draft',
  'active',
  'on_hold',
  'completed',
  'cancelled',
  'archived'
);

CREATE TYPE phase_status_enum AS ENUM (
  'planned',
  'active',
  'blocked',
  'completed',
  'cancelled'
);

CREATE TYPE task_status_enum AS ENUM (
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

CREATE TYPE assignment_status_enum AS ENUM (
  'pending',
  'accepted',
  'declined',
  'completed',
  'removed'
);

CREATE TYPE assignment_target_type_enum AS ENUM (
  'user',
  'contact',
  'organization',
  'customer'
);

CREATE TYPE progress_update_status_enum AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE change_order_status_enum AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'implemented',
  'cancelled'
);

CREATE TYPE document_status_enum AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE TYPE document_version_status_enum AS ENUM (
  'draft',
  'current',
  'superseded',
  'archived'
);

CREATE TYPE document_access_principal_type_enum AS ENUM (
  'user',
  'role',
  'organization',
  'customer',
  'subcontractor',
  'supercontractor',
  'public_link'
);

CREATE TYPE document_access_level_enum AS ENUM (
  'view',
  'download',
  'upload',
  'manage'
);

CREATE TYPE access_effect_enum AS ENUM (
  'allow',
  'deny'
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  originating_project_request_id UUID REFERENCES project_requests(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  partner_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  project_code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  status project_status_enum NOT NULL DEFAULT 'draft',
  started_at DATE,
  due_at DATE,
  completed_at DATE,
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

CREATE UNIQUE INDEX uq_projects_org_code_active
  ON projects (organization_id, project_code)
  WHERE project_code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_projects_customer_status
  ON projects (customer_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_owner_user_id ON projects (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_partner_org_id ON projects (partner_organization_id) WHERE deleted_at IS NULL;

CREATE TABLE phases (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  status phase_status_enum NOT NULL DEFAULT 'planned',
  started_at DATE,
  due_at DATE,
  completed_at DATE,
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

CREATE UNIQUE INDEX uq_phases_project_sequence_active
  ON phases (project_id, sequence_number)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_phases_project_status ON phases (project_id, status) WHERE deleted_at IS NULL;

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status_enum NOT NULL DEFAULT 'todo',
  priority SMALLINT NOT NULL DEFAULT 3,
  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (priority BETWEEN 1 AND 5)
);

CREATE INDEX idx_tasks_project_status ON tasks (project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_phase_id ON tasks (phase_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_owner_user_id ON tasks (owner_user_id) WHERE deleted_at IS NULL;

CREATE TABLE assignments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignment_target_type assignment_target_type_enum NOT NULL,
  assignee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assignee_contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  assignee_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assignee_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  role_label TEXT,
  status assignment_status_enum NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (
    (assignment_target_type = 'user' AND assignee_user_id IS NOT NULL AND assignee_contact_id IS NULL AND assignee_organization_id IS NULL AND assignee_customer_id IS NULL) OR
    (assignment_target_type = 'contact' AND assignee_user_id IS NULL AND assignee_contact_id IS NOT NULL AND assignee_organization_id IS NULL AND assignee_customer_id IS NULL) OR
    (assignment_target_type = 'organization' AND assignee_user_id IS NULL AND assignee_contact_id IS NULL AND assignee_organization_id IS NOT NULL AND assignee_customer_id IS NULL) OR
    (assignment_target_type = 'customer' AND assignee_user_id IS NULL AND assignee_contact_id IS NULL AND assignee_organization_id IS NULL AND assignee_customer_id IS NOT NULL)
  )
);

CREATE INDEX idx_assignments_project_status ON assignments (project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_task_id ON assignments (task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_assignee_user_id ON assignments (assignee_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_assignee_org_id ON assignments (assignee_organization_id) WHERE deleted_at IS NULL;

CREATE TABLE progress_updates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status progress_update_status_enum NOT NULL DEFAULT 'draft',
  summary TEXT NOT NULL,
  details TEXT,
  percent_complete NUMERIC(5, 2),
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CHECK (percent_complete IS NULL OR (percent_complete >= 0 AND percent_complete <= 100))
);

CREATE INDEX idx_progress_updates_project_created_at ON progress_updates (project_id, created_at DESC);
CREATE INDEX idx_progress_updates_author_user_id ON progress_updates (author_user_id, created_at DESC);

CREATE TABLE change_orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  change_order_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status change_order_status_enum NOT NULL DEFAULT 'draft',
  cost_impact_amount NUMERIC(14, 2),
  schedule_impact_days INTEGER,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal', 'customer']::visibility_flag_enum[],
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

CREATE UNIQUE INDEX uq_change_orders_project_number_active
  ON change_orders (project_id, change_order_number)
  WHERE change_order_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_change_orders_project_status ON change_orders (project_id, status) WHERE deleted_at IS NULL;

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  change_order_id UUID REFERENCES change_orders(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  document_category TEXT NOT NULL,
  status document_status_enum NOT NULL DEFAULT 'draft',
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

CREATE INDEX idx_documents_project_id ON documents (project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_customer_id ON documents (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_org_status ON documents (organization_id, status) WHERE deleted_at IS NULL;

CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  checksum_sha256 TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  status document_version_status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (version_number > 0),
  CHECK (byte_size >= 0)
);

CREATE UNIQUE INDEX uq_document_versions_document_version
  ON document_versions (document_id, version_number);
CREATE INDEX idx_document_versions_document_status
  ON document_versions (document_id, status, created_at DESC);

CREATE TABLE document_access_rules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  principal_type document_access_principal_type_enum NOT NULL,
  principal_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  principal_role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  principal_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  principal_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  access_level document_access_level_enum NOT NULL,
  effect access_effect_enum NOT NULL DEFAULT 'allow',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (principal_type = 'user' AND principal_user_id IS NOT NULL AND principal_role_id IS NULL AND principal_organization_id IS NULL AND principal_customer_id IS NULL) OR
    (principal_type = 'role' AND principal_user_id IS NULL AND principal_role_id IS NOT NULL AND principal_organization_id IS NULL AND principal_customer_id IS NULL) OR
    (principal_type = 'organization' AND principal_user_id IS NULL AND principal_role_id IS NULL AND principal_organization_id IS NOT NULL AND principal_customer_id IS NULL) OR
    (principal_type IN ('subcontractor', 'supercontractor') AND principal_user_id IS NULL AND principal_role_id IS NULL AND principal_organization_id IS NOT NULL AND principal_customer_id IS NULL) OR
    (principal_type = 'customer' AND principal_user_id IS NULL AND principal_role_id IS NULL AND principal_organization_id IS NULL AND principal_customer_id IS NOT NULL) OR
    (principal_type = 'public_link' AND principal_user_id IS NULL AND principal_role_id IS NULL AND principal_organization_id IS NULL AND principal_customer_id IS NULL)
  )
);

CREATE INDEX idx_document_access_rules_document_id ON document_access_rules (document_id);
CREATE INDEX idx_document_access_rules_principal_user_id ON document_access_rules (principal_user_id) WHERE principal_user_id IS NOT NULL;
CREATE INDEX idx_document_access_rules_principal_org_id ON document_access_rules (principal_organization_id) WHERE principal_organization_id IS NOT NULL;
