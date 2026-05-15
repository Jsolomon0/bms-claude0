CREATE TYPE tenant_status_enum AS ENUM (
  'active',
  'suspended',
  'archived'
);

CREATE TYPE user_status_enum AS ENUM (
  'invited',
  'active',
  'locked',
  'disabled',
  'archived'
);

CREATE TYPE organization_type_enum AS ENUM (
  'internal',
  'customer',
  'subcontractor',
  'supercontractor',
  'vendor',
  'mixed'
);

CREATE TYPE organization_status_enum AS ENUM (
  'active',
  'inactive',
  'suspended',
  'archived'
);

CREATE TYPE contact_status_enum AS ENUM (
  'active',
  'inactive',
  'archived'
);

CREATE TYPE visibility_flag_enum AS ENUM (
  'internal',
  'customer',
  'subcontractor',
  'supercontractor',
  'public_link'
);

CREATE TYPE share_link_status_enum AS ENUM (
  'active',
  'expired',
  'revoked',
  'exhausted'
);

CREATE TYPE audit_outcome_enum AS ENUM (
  'allow',
  'deny',
  'issued',
  'revoked',
  'success',
  'failure'
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status tenant_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_tenants_slug ON tenants (LOWER(slug));

CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status user_status_enum NOT NULL DEFAULT 'invited',
  locale TEXT,
  timezone TEXT,
  last_login_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
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

CREATE UNIQUE INDEX uq_users_tenant_email_active
  ON users (tenant_id, LOWER(email))
  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant_status ON users (tenant_id, status) WHERE deleted_at IS NULL;

CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  parent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  organization_type organization_type_enum NOT NULL,
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT,
  tax_identifier TEXT,
  status organization_status_enum NOT NULL DEFAULT 'active',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

CREATE UNIQUE INDEX uq_organizations_tenant_slug_active
  ON organizations (tenant_id, LOWER(slug))
  WHERE slug IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_organizations_tenant_type_status
  ON organizations (tenant_id, organization_type, status)
  WHERE deleted_at IS NULL;

CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  status contact_status_enum NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE INDEX idx_contacts_tenant_org ON contacts (tenant_id, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_tenant_email ON contacts (tenant_id, LOWER(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_contacts_user_active ON contacts (user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('all', 'org', 'assigned', 'self', 'partner', 'public_link')),
  allowed_visibilities visibility_flag_enum[] NOT NULL,
  sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  public_link_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_role_memberships (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  customer_id UUID,
  partner_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    NOT (customer_id IS NOT NULL AND partner_organization_id IS NOT NULL)
  )
);

CREATE INDEX idx_user_role_memberships_user_id ON user_role_memberships (user_id);
CREATE INDEX idx_user_role_memberships_org_id ON user_role_memberships (organization_id);
CREATE INDEX idx_user_role_memberships_partner_org_id ON user_role_memberships (partner_organization_id);
CREATE INDEX idx_user_role_memberships_tenant_active ON user_role_memberships (tenant_id, active);

CREATE TABLE membership_permission_overrides (
  id UUID PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES user_role_memberships(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  reason TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (membership_id, permission_id)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  membership_id UUID REFERENCES user_role_memberships(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  permission_key TEXT,
  resource_type TEXT,
  resource_id TEXT,
  visibility_flags visibility_flag_enum[],
  outcome audit_outcome_enum NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_permission_key ON audit_logs (permission_key);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at DESC);
CREATE INDEX idx_audit_logs_tenant_org ON audit_logs (tenant_id, organization_id, occurred_at DESC);

CREATE TABLE public_share_links (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  status share_link_status_enum NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  CHECK (max_uses IS NULL OR max_uses > 0),
  CHECK (use_count >= 0)
);

CREATE INDEX idx_public_share_links_resource ON public_share_links (resource_type, resource_id);
CREATE INDEX idx_public_share_links_expires_at ON public_share_links (expires_at);
CREATE INDEX idx_public_share_links_status ON public_share_links (status, expires_at);

CREATE TABLE public_share_link_scopes (
  public_share_link_id UUID NOT NULL REFERENCES public_share_links(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (public_share_link_id, permission_key)
);
