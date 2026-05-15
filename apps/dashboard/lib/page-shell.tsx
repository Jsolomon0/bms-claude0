import type { PropsWithChildren } from "react";
import { AppShellFrame } from "../../../packages/ui/src/react/index.tsx";
import { getDashboardShellModel } from "./shell-data.ts";

export function DashboardPageShell({
  activeHref,
  title,
  subtitle,
  children
}: PropsWithChildren<{
  activeHref: string;
  title: string;
  subtitle: string;
}>) {
  const model = getDashboardShellModel();

  return (
    <AppShellFrame
      appName="BMS Dashboard"
      eyebrow="Internal workspace"
      subtitle="Primary system of record"
      navigation={model.navigation}
      activeHref={activeHref}
      topNavTitle={title}
      topNavSubtitle={subtitle}
      user={model.user}
      notifications={model.notifications}
    >
      {children}
    </AppShellFrame>
  );
}
