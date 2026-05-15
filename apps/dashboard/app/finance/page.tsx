import {
  EmptyState,
  KeyValueSummary,
  PageHeader,
  PlaceholderPanel,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getDashboardFinanceHomeData } from "../../lib/finance-data.ts";

export default async function DashboardFinancePage() {
  const data = await getDashboardFinanceHomeData();

  return (
    <DashboardPageShell activeHref="/finance" title="Finance workspace" subtitle="Expenses, purchasing, vendors, and payables">
      <PageHeader
        eyebrow="Finance"
        title="Internal finance operations now run as protected approval workflows instead of placeholders."
        description="Expenses, vendor bills, purchase orders, receipt links, and reimbursement flags share one audited surface with project cost linkage ready for later profitability reporting."
        actions={[
          { label: "Open payroll", href: "/payroll" },
          { label: "Open audit log", href: "/audit" }
        ]}
        badges={["Approval workflows", "Project-linked cost records", "Document-linked receipts"]}
      />
      <SectionGrid>
        <StatsCard
          title="Finance pulse"
          description="Counts reflect live approval queues and payable tracking from the finance runtime."
          stats={[
            { label: "Expense approvals", value: String(data.stats.expenseApprovals) },
            { label: "PO approvals", value: String(data.stats.purchaseOrderApprovals) },
            { label: "Open bills", value: String(data.stats.openBills) },
            { label: "Vendors", value: String(data.stats.vendors) }
          ]}
          span="4"
        />
        <KeyValueSummary
          title="Control posture"
          description="Sensitive edits and approvals write audit events, while project-linked fields preserve later reporting options."
          items={[
            { label: "Reimbursement queue", value: String(data.stats.reimbursementQueue) },
            { label: "Project-linked expenses", value: String(data.stats.projectLinkedExpenses) },
            { label: "Document-linked receipts", value: String(data.expenses.filter((expense) => expense.receiptDocumentIds.length > 0).length) },
            { label: "Bill records", value: String(data.bills.length) },
            { label: "Purchase orders", value: String(data.purchaseOrders.length) },
            { label: "Recent audit-ready actions", value: String(data.recentActivity.length) }
          ]}
          span="8"
        />
        {data.pendingExpenseApprovals.length > 0 ? (
          <SimpleList
            title="Expense approval queue"
            description="Submitted reimbursement and cost entries wait here for internal approval."
            items={data.pendingExpenseApprovals.map((expense) => ({
              title: `${expense.description} | ${data.formatCurrency(expense.amountCents, expense.currency)}`,
              body: `${expense.claimantUserId} | ${expense.category} | ${expense.projectId ?? "Unassigned project"}`,
              meta: `${expense.expenseDate} | receipts ${expense.receiptDocumentIds.length}`
            }))}
            span="6"
          />
        ) : (
          <PlaceholderPanel
            title="Expense approval queue"
            description="Submitted expense entries will appear here for owner and administrator review."
            emptyState={{
              title: "No expenses pending approval",
              description: "Submitted expenses will surface here with claimant, project, receipt, and reimbursement context."
            }}
          >
            <EmptyState
              content={{
                title: "No expenses pending approval",
                description: "Submitted expenses will surface here with claimant, project, receipt, and reimbursement context."
              }}
            />
          </PlaceholderPanel>
        )}
        {data.pendingPurchaseOrders.length > 0 ? (
          <SimpleList
            title="Purchase order approvals"
            description="Committed vendor spend is reviewed here before a PO moves into issued state."
            items={data.pendingPurchaseOrders.map((purchaseOrder) => ({
              title: `${purchaseOrder.poNumber} | ${data.formatCurrency(purchaseOrder.totalCents, purchaseOrder.currency)}`,
              body: `${purchaseOrder.title} | ${purchaseOrder.projectId ?? "Unassigned project"} | ${purchaseOrder.status}`,
              meta: `${purchaseOrder.expectedAt ?? "No ETA"} | docs ${purchaseOrder.linkedDocumentIds.length}`
            }))}
            span="6"
          />
        ) : (
          <PlaceholderPanel
            title="Purchase order approvals"
            description="Pending purchasing approvals will appear here as soon as teams submit new vendor spend."
            emptyState={{
              title: "No purchase orders pending approval",
              description: "Submitted purchase orders will show vendor, amount, expected date, and linked documents here."
            }}
          >
            <EmptyState
              content={{
                title: "No purchase orders pending approval",
                description: "Submitted purchase orders will show vendor, amount, expected date, and linked documents here."
              }}
            />
          </PlaceholderPanel>
        )}
        <SimpleList
          title="Bills and due dates"
          description="Open payable records stay sorted by due date so cash planning can layer onto the same module later."
          items={data.dueBills.map((bill) => ({
            title: `${bill.billNumber} | ${bill.status} | ${data.formatCurrency(bill.totalCents, bill.currency)}`,
            body: `${bill.title} | due ${bill.dueAt} | paid ${data.formatCurrency(bill.paidCents, bill.currency)}`,
            meta: `${bill.projectId ?? "Unassigned project"} | receipts ${bill.receiptDocumentIds.length}`
          }))}
          span="6"
        />
        <SimpleList
          title="Vendor records"
          description="Vendor master records hold payment terms and document links without mixing them into customer or partner directories."
          items={data.vendors.map((vendor) => ({
            title: `${vendor.displayName} | ${vendor.status}`,
            body: `${vendor.primaryContactName ?? "No contact"} | ${vendor.primaryEmail ?? "No email"} | terms ${vendor.paymentTermsDays} days`,
            meta: `Linked docs ${vendor.linkedDocumentIds.length}`
          }))}
          span="6"
        />
        <SimpleList
          title="Project cost map"
          description="This is a staging view for later profitability reporting across expenses, committed purchase orders, and vendor bills."
          items={data.projectCostMap.map((entry) => ({
            title: `${entry.projectId} | ${(entry.expenseCount + entry.billCount + entry.purchaseOrderCount).toString()} linked records`,
            body: `Expenses ${data.formatCurrency(entry.expenseCents)} | Bills ${data.formatCurrency(entry.billCents)} | Committed POs ${data.formatCurrency(entry.purchaseOrderCommittedCents)}`,
            meta: `${entry.expenseCount} expenses | ${entry.billCount} bills | ${entry.purchaseOrderCount} purchase orders`
          }))}
          span="8"
        />
        <SimpleList
          title="Recent finance activity"
          description="Edit and approval events are kept visible here and separately persisted to the audit sink for sensitive operations."
          items={data.recentActivity.map((activity) => ({
            title: `${activity.eventType} | ${activity.resourceType}`,
            body: `${activity.summary} | actor ${activity.actorUserId ?? "system"}`,
            meta: activity.occurredAt.slice(0, 16).replace("T", " ")
          }))}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
