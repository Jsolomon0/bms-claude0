import { LoadingState } from "../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../lib/page-shell.tsx";

export default function Loading() {
  return (
    <DashboardPageShell activeHref="/" title="Preparing dashboard" subtitle="Loading shell state">
      <LoadingState
        title="Mounting workspace shell"
        description="Navigation, access controls, and placeholder modules are being prepared."
      />
    </DashboardPageShell>
  );
}
