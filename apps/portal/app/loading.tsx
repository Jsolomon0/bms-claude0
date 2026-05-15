import { LoadingState } from "../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../lib/page-shell.tsx";

export default function Loading() {
  return (
    <PortalPageShell activeHref="/" title="Preparing portal" subtitle="Loading stakeholder workspace">
      <LoadingState
        title="Loading shared workspace"
        description="Portal navigation, protected routes, and placeholder modules are being prepared."
      />
    </PortalPageShell>
  );
}
