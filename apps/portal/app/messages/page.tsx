import {
  EmptyState,
  KeyValueSummary,
  PageHeader,
  PlaceholderPanel,
  SectionGrid,
  SimpleList
} from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { listPortalMessageThreads } from "../../lib/messages-data.ts";

export default async function PortalMessagesPage() {
  const threads = await listPortalMessageThreads();

  return (
    <PortalPageShell activeHref="/messages" title="Messages" subtitle="Scoped conversations">
      <PageHeader
        eyebrow="Messages"
        title="Stakeholder conversations stay inside customer and partner boundaries."
        description="Thread visibility follows the same role, scope, and visibility rules as the rest of the portal."
        badges={["Scoped threads", "Role-aware replies", "Cross-org isolation"]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Conversation scope"
          description="Message threads are filtered server-side before they are listed."
          items={[
            { label: "Visible threads", value: String(threads.length) },
            { label: "Reply path", value: "Server-authorized" },
            { label: "Cross-org access", value: "Blocked" },
            { label: "Project-linked threads", value: String(threads.filter((thread) => Boolean(thread.projectId)).length) }
          ]}
          span="4"
        />
        {threads.length > 0 ? (
          <SimpleList
            title="Visible threads"
            description="Only threads tied to the actor's own customer or partner scope are listed."
            items={threads.map((thread) => ({
              title: `${thread.subject} -> /messages/${thread.id}`,
              body: `${thread.status} | visibility: ${thread.visibilityFlags.join(", ")}`,
              meta: thread.updatedAt.slice(0, 16).replace("T", " ")
            }))}
            span="8"
          />
        ) : (
          <PlaceholderPanel
            title="Messages"
            description="No conversations are currently visible for this portal actor."
            emptyState={{
              title: "No message threads",
              description: "Threads appear here only when they belong to the current customer or partner scope."
            }}
          >
            <EmptyState
              content={{
                title: "No message threads",
                description: "Threads appear here only when they belong to the current customer or partner scope."
              }}
            />
          </PlaceholderPanel>
        )}
      </SectionGrid>
    </PortalPageShell>
  );
}
