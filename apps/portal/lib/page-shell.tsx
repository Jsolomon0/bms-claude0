import type { PropsWithChildren } from "react";
import { AppShellFrame } from "../../../packages/ui/src/react/index.tsx";
import { getPortalShellModel } from "./shell-data.ts";

export function PortalPageShell({
  activeHref,
  title,
  subtitle,
  children
}: PropsWithChildren<{
  activeHref: string;
  title: string;
  subtitle: string;
}>) {
  const model = getPortalShellModel();

  return (
    <AppShellFrame
      appName="BMS Portal"
      eyebrow="Stakeholder workspace"
      subtitle="Customer and partner collaboration"
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
