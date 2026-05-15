export interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PermissionRow {
  id: string;
  key: string;
  description: string;
  scope: string;
  allowed_visibilities: string[];
  sensitive: boolean;
  public_link_allowed: boolean;
  created_at: string;
}

export interface RolePermissionRow {
  role_id: string;
  permission_id: string;
  effect: "allow" | "deny";
  created_at: string;
}

export interface UserRoleMembershipRow {
  id: string;
  user_id: string;
  role_id: string;
  tenant_id: string;
  organization_id: string | null;
  customer_id: string | null;
  partner_organization_id: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipPermissionOverrideRow {
  id: string;
  membership_id: string;
  permission_id: string;
  effect: "allow" | "deny";
  reason: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  actor_user_id: string | null;
  membership_id: string | null;
  event_type: string;
  permission_key: string | null;
  resource_type: string | null;
  resource_id: string | null;
  visibility_flags: string[] | null;
  outcome: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface PublicShareLinkRow {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  resource_type: string;
  resource_id: string;
  token_hash: string;
  token_prefix: string;
  status: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  max_uses: number | null;
  use_count: number;
  created_by_user_id: string | null;
  created_at: string;
  last_accessed_at: string | null;
}

export interface PublicShareLinkScopeRow {
  public_share_link_id: string;
  permission_key: string;
  created_at: string;
}

export const AUTHORIZATION_TABLES = [
  "roles",
  "permissions",
  "role_permissions",
  "user_role_memberships",
  "membership_permission_overrides",
  "audit_logs",
  "public_share_links",
  "public_share_link_scopes"
] as const;
