import type { PropsWithChildren } from "react";
import { MarketingShell } from "../../../packages/ui/src/react/index.tsx";
import { getWebsiteShellModel } from "./shell-data.ts";

export function WebsitePageShell({ children }: PropsWithChildren) {
  const model = getWebsiteShellModel();

  return <MarketingShell brand="Builder Management System" navigation={model.navigation}>{children}</MarketingShell>;
}
