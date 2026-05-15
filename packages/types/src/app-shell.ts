import { type AuthorizationActor, type PermissionKey, type RoleKey } from "./authz.ts";

export type AppSurface = "dashboard" | "portal" | "website";

export type NavigationGroup = "work" | "finance" | "system" | "engage";

export interface AppNavigationItem {
  id: string;
  app: AppSurface;
  label: string;
  href: string;
  description: string;
  group: NavigationGroup;
  matchPrefixes?: readonly string[];
  allowRoles?: readonly RoleKey[];
  allowAnyPermissionKeys?: readonly PermissionKey[];
}

export interface ShellUserSummary {
  displayName: string;
  email?: string;
  primaryRole: RoleKey;
  roles: readonly RoleKey[];
}

export interface ModuleSummaryItem {
  label: string;
  value: string;
}

export interface ModuleAction {
  label: string;
  href: string;
}

export interface EmptyStateContent {
  title: string;
  description: string;
  action?: ModuleAction;
}

export interface NotificationPreview {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
  timestampLabel: string;
}

export interface AppShellModel {
  app: AppSurface;
  actor?: AuthorizationActor;
  user: ShellUserSummary;
  navigation: readonly AppNavigationItem[];
  notifications: readonly NotificationPreview[];
}
