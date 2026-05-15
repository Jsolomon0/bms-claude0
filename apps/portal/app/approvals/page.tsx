import {
  EmptyState,
  KeyValueSummary,
  PageHeader,
  PlaceholderPanel,
  SectionGrid,
  SimpleList
} from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getPortalApprovalsData } from "../../lib/approvals-data.ts";

export default async function PortalApprovalsPage() {
  const data = await getPortalApprovalsData();

  if (!data.canViewApprovals) {
    return (
      <PortalPageShell activeHref="/approvals" title="Approvals" subtitle="Not applicable">
        <PageHeader
          eyebrow="Approvals"
          title="Change-order approvals are only published to customer-scoped actors."
          description="Partner roles can collaborate through projects, documents, and messages without inheriting customer approval authority."
          badges={["Customer only", "Strict self scope", "Audited changes"]}
        />
        <SectionGrid>
          <PlaceholderPanel
            title="Approvals not published"
            description="No approval workflow applies to the current portal role."
            emptyState={{
              title: "No approvals available",
              description: "Submitted customer-visible change orders appear here only for the matching customer account."
            }}
          >
            <EmptyState
              content={{
                title: "No approvals available",
                description: "Submitted customer-visible change orders appear here only for the matching customer account."
              }}
            />
          </PlaceholderPanel>
        </SectionGrid>
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell activeHref="/approvals" title="Approvals" subtitle="Change-order decisions">
      <PageHeader
        eyebrow="Approvals"
        title="Customer approvals stay constrained to the matching account."
        description="Only customer-visible change orders for the current account reach this route, and approval actions remain server-authorized."
        badges={["Customer scope", "Change orders", "Full audit trail"]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Approval queue"
          description="The customer sees pending items and decision history without dashboard review controls."
          items={[
            { label: "Pending approvals", value: String(data.pending.length) },
            { label: "Historical decisions", value: String(data.history.length) },
            { label: "Approval path", value: "Server-side only" },
            { label: "Cross-account access", value: "Blocked" }
          ]}
          span="4"
        />
        {data.pending.length > 0 ? (
          <SimpleList
            title="Pending decisions"
            description="Submitted customer-visible change orders can be approved or rejected through the server helper."
            items={data.pending.map((item) => ({
              title: `${item.projectName} | ${item.changeOrder.title}`,
              body: `${item.changeOrder.status} | amount delta ${item.changeOrder.estimatedAmountDelta ?? 0}`,
              meta: `Schedule delta ${item.changeOrder.estimatedScheduleDeltaDays ?? 0} days`
            }))}
            span="8"
          />
        ) : (
          <PlaceholderPanel
            title="Pending approvals"
            description="No submitted change orders are waiting for a decision."
            emptyState={{
              title: "No pending decisions",
              description: "Customer-visible change orders appear here only when they are submitted and scoped to the current account."
            }}
          >
            <EmptyState
              content={{
                title: "No pending decisions",
                description: "Customer-visible change orders appear here only when they are submitted and scoped to the current account."
              }}
            />
          </PlaceholderPanel>
        )}
        <SimpleList
          title="Approval history"
          description="Resolved customer decisions remain visible without exposing internal review state."
          items={data.history.map((item) => ({
            title: `${item.projectName} | ${item.changeOrder.title}`,
            body: `${item.changeOrder.status} | updated ${item.changeOrder.updatedAt.slice(0, 16).replace("T", " ")}`,
            meta: `Amount delta ${item.changeOrder.estimatedAmountDelta ?? 0}`
          }))}
          span="12"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
