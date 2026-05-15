import {
  EmptyState,
  KeyValueSummary,
  PageHeader,
  PlaceholderPanel,
  SectionGrid,
  SimpleList
} from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getPortalDocumentsData } from "../../lib/document-data.ts";

export default async function PortalDocumentsPage() {
  const documents = await getPortalDocumentsData();

  return (
    <PortalPageShell activeHref="/documents" title="Documents" subtitle="Shared files and updates">
      <PageHeader
        eyebrow="Documents"
        title="Portal document access is filtered by scope, visibility, and access rules."
        description="Customers and partners only see documents that pass both the permission model and the document's explicit access rules."
        badges={["Version history", "Access rules", "Signed shares"]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Portal library"
          description="The visible document set is resolved server-side before it reaches the portal."
          items={[
            { label: "Visible documents", value: String(documents.length) },
            { label: "Internal-only docs", value: "Excluded" },
            { label: "Role-aware access", value: "Enabled" },
            { label: "Public-link handoff", value: "Separate path" }
          ]}
          span="4"
        />
        {documents.length > 0 ? (
          <SimpleList
            title="Shared documents"
            description="Only documents that pass view authorization and access rules are listed."
            items={documents.map((document) => ({
              title: `${document.title} -> /documents/${document.id}`,
              body: `${document.category} | visibility: ${document.visibilityFlags.join(", ")}`,
              meta: `Retention: ${document.retentionFlags.join(", ") || "none"}`
            }))}
            span="8"
          />
        ) : (
          <PlaceholderPanel
            title="Document feed"
            description="No files are currently visible for this portal actor."
            emptyState={{
              title: "No documents shared",
              description: "Files appear here only when their visibility and access rules allow this actor to see them."
            }}
          >
            <EmptyState
              content={{
                title: "No documents shared",
                description: "Files appear here only when their visibility and access rules allow this actor to see them."
              }}
            />
          </PlaceholderPanel>
        )}
      </SectionGrid>
    </PortalPageShell>
  );
}
