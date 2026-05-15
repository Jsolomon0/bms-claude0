import {
  KeyValueSummary,
  PageHeader,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getDashboardDocumentsHomeData } from "../../lib/document-data.ts";

export default function DashboardDocumentsPage() {
  const data = getDashboardDocumentsHomeData();

  return (
    <DashboardPageShell activeHref="/documents" title="Documents workspace" subtitle="Files, versions, and access control">
      <PageHeader
        eyebrow="Documents"
        title="Document storage is now backed by upload, version, and share workflows."
        description="The document module supports validated uploads, version history, access rules, archive and retention metadata, and signed public-share links."
        actions={[
          { label: "Open featured document", href: "/documents/document-demo-1" },
          { label: "Inspect audit trail", href: "/audit" }
        ]}
        badges={["Object storage", "Malware scan hook", "Public share links"]}
      />
      <SectionGrid>
        <StatsCard
          title="Document library"
          description="Counts come from the shared document runtime rather than placeholder shell copy."
          stats={[
            { label: "Documents", value: String(data.stats.total) },
            { label: "Archived", value: String(data.stats.archived) },
            { label: "Versions", value: String(data.stats.versionCount) },
            { label: "Public shares", value: String(data.stats.publicShares) }
          ]}
          span="4"
        />
        <SimpleList
          title="Document roster"
          description="Each document resolves to a detail route with versions, access rules, retention, and activity."
          items={data.documents.map((document) => ({
            title: `${document.title} -> /documents/${document.id}`,
            body: `${document.category} | ${document.archiveState} | visibility: ${document.visibilityFlags.join(", ")}`,
            meta: `Retention: ${document.retentionFlags.join(", ") || "none"}`
          }))}
          span="8"
        />
        <KeyValueSummary
          title="Recent audit events"
          description="Visibility, archive-state, and public-link actions share the audit sink."
          items={data.auditPreview.map((event) => ({
            label: event.eventType,
            value: `${event.resourceType ?? "resource"}:${event.resourceId ?? "unknown"}`
          }))}
          span="8"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
