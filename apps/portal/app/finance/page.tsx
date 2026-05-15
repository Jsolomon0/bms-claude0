import {
  EmptyState,
  KeyValueSummary,
  PageHeader,
  PlaceholderPanel,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getPortalFinanceData } from "../../lib/finance-data.ts";

export default async function PortalFinancePage() {
  const data = await getPortalFinanceData();

  if (!data.canViewFinance) {
    return (
      <PortalPageShell activeHref="/finance" title="Finance" subtitle="Not applicable">
        <PageHeader
          eyebrow="Finance"
          title="Billing is only published to customer-scoped portal roles."
          description="Partner roles do not inherit customer receivables or internal finance workflows."
          badges={["Customer only", "Read-safe", "Server-authorized payments"]}
        />
        <SectionGrid>
          <PlaceholderPanel
            title="Finance not published"
            description="No billing surface applies to the current portal role."
            emptyState={{
              title: "No finance access",
              description: "This actor can still use project, document, message, and notification routes inside its own scope."
            }}
          >
            <EmptyState
              content={{
                title: "No finance access",
                description: "This actor can still use project, document, message, and notification routes inside its own scope."
              }}
            />
          </PlaceholderPanel>
        </SectionGrid>
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell activeHref="/finance" title="Finance" subtitle="Invoices and payment history">
      <PageHeader
        eyebrow="Finance"
        title="Customer billing stays narrow, readable, and server-authorized."
        description="Portal finance only exposes customer-scoped invoices, payments, and public-link-safe payment flows. Internal accounting tools remain outside this surface."
        badges={["Customer scope", "Portal payments", "Public-link capable"]}
      />
      <SectionGrid>
        <StatsCard
          title="Billing overview"
          description="Invoice state and payment history are derived server-side before they reach the portal."
          stats={[
            { label: "Open invoices", value: String(data.stats.openInvoices) },
            { label: "Overdue", value: String(data.stats.overdueInvoices) },
            { label: "Outstanding", value: data.formatCurrency(data.stats.outstandingCents) },
            { label: "Recorded payments", value: String(data.stats.recordedPayments) }
          ]}
          span="4"
        />
        <KeyValueSummary
          title="Next customer action"
          description="The next finance prompt stays obvious without exposing internal collections controls."
          items={[
            { label: "Next due invoice", value: data.nextDueInvoice?.invoiceNumber ?? "None" },
            { label: "Next due amount", value: data.nextDueInvoice ? data.formatCurrency(data.nextDueInvoice.balanceDueCents) : "None" },
            { label: "Next due date", value: data.nextDueInvoice?.dueAt ?? "None" },
            { label: "Public pay links", value: "Supported for selected invoices" }
          ]}
          span="4"
        />
        {data.invoices.length > 0 ? (
          <SimpleList
            title="Visible invoices"
            description="Only invoices tied to the current customer account are listed."
            items={data.invoices.map((invoice) => ({
              title: `${invoice.invoiceNumber} | ${data.formatCurrency(invoice.balanceDueCents)}`,
              body: `${invoice.title} | ${invoice.status} | due ${invoice.dueAt}`,
              meta: `Paid ${data.formatCurrency(invoice.paidCents)} of ${data.formatCurrency(invoice.totalCents)}`
            }))}
            span="4"
          />
        ) : (
          <PlaceholderPanel
            title="Invoices"
            description="No customer invoices are currently published."
            emptyState={{
              title: "No invoices visible",
              description: "Invoices appear here only when they belong to the current customer account and remain portal-visible."
            }}
          >
            <EmptyState
              content={{
                title: "No invoices visible",
                description: "Invoices appear here only when they belong to the current customer account and remain portal-visible."
              }}
            />
          </PlaceholderPanel>
        )}
        <SimpleList
          title="Recent finance activity"
          description="These customer-safe events come from the invoice activity stream, not from client-side payment state."
          items={data.recentActivity.map((activity) => ({
            title: activity.eventType,
            body: activity.summary,
            meta: activity.occurredAt.slice(0, 16).replace("T", " ")
          }))}
          span="8"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
