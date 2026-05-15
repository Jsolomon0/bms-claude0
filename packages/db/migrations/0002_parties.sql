CREATE TYPE customer_type_enum AS ENUM (
  'short_term',
  'long_term'
);

CREATE TYPE customer_status_enum AS ENUM (
  'prospect',
  'active',
  'inactive',
  'expired',
  'retained_legal',
  'archived'
);

CREATE TYPE employee_status_enum AS ENUM (
  'invited',
  'active',
  'on_leave',
  'suspended',
  'terminated',
  'archived'
);

CREATE TYPE subcontractor_status_enum AS ENUM (
  'invited',
  'active',
  'inactive',
  'suspended',
  'archived'
);

CREATE TYPE supercontractor_status_enum AS ENUM (
  'invited',
  'active',
  'inactive',
  'suspended',
  'archived'
);

CREATE TABLE customers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_type customer_type_enum NOT NULL,
  status customer_status_enum NOT NULL DEFAULT 'prospect',
  account_number TEXT,
  short_term_expires_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
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
  CHECK (
    organization_id IS NOT NULL OR primary_contact_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX uq_customers_tenant_account_number_active
  ON customers (tenant_id, account_number)
  WHERE account_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_customers_tenant_status_type
  ON customers (tenant_id, status, customer_type)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_owner_user_id ON customers (owner_user_id) WHERE deleted_at IS NULL;

CREATE TABLE employees (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  manager_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_number TEXT,
  status employee_status_enum NOT NULL DEFAULT 'invited',
  hire_date DATE,
  termination_date DATE,
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

CREATE UNIQUE INDEX uq_employees_org_employee_number_active
  ON employees (organization_id, employee_number)
  WHERE employee_number IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_employees_user_active
  ON employees (user_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_org_status ON employees (organization_id, status) WHERE deleted_at IS NULL;

CREATE TABLE subcontractors (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status subcontractor_status_enum NOT NULL DEFAULT 'invited',
  approved_at TIMESTAMPTZ,
  insurance_expires_at DATE,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal', 'subcontractor']::visibility_flag_enum[],
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

CREATE UNIQUE INDEX uq_subcontractors_org_active
  ON subcontractors (organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_subcontractors_status ON subcontractors (status) WHERE deleted_at IS NULL;

CREATE TABLE supercontractors (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status supercontractor_status_enum NOT NULL DEFAULT 'invited',
  approved_at TIMESTAMPTZ,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal', 'supercontractor']::visibility_flag_enum[],
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

CREATE UNIQUE INDEX uq_supercontractors_org_active
  ON supercontractors (organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_supercontractors_status ON supercontractors (status) WHERE deleted_at IS NULL;

ALTER TABLE user_role_memberships
  ADD CONSTRAINT fk_user_role_memberships_customer_id
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
