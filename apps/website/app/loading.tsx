import { LoadingState } from "../../../packages/ui/src/react/index.tsx";
import { WebsitePageShell } from "../lib/page-shell.tsx";

export default function Loading() {
  return (
    <WebsitePageShell>
      <LoadingState
        title="Loading public shell"
        description="Marketing layout, role entry points, and shared styles are being prepared."
      />
    </WebsitePageShell>
  );
}
