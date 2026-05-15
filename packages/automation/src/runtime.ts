import type { AuditEvent, AuditSink } from "../../types/src/index.ts";
import { getIntakeRuntime } from "../../crm/src/index.ts";
import { getDocumentsRuntime } from "../../documents/src/runtime.ts";
import { getNotificationsRuntime, resetNotificationsRuntime } from "../../notifications/src/index.ts";
import { getPaymentsRuntime } from "../../payments/src/runtime.ts";
import { getPayrollRuntime } from "../../payroll/src/runtime.ts";
import { InMemoryWorkflowAutomationRepository } from "./repository.ts";
import { WorkflowAutomationService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface AutomationRuntime {
  repository: InMemoryWorkflowAutomationRepository;
  service: WorkflowAutomationService;
  auditSink: MemoryAuditSink;
}

function createRuntime(): AutomationRuntime {
  let counter = 8000;
  const notificationsRuntime = resetNotificationsRuntime();
  const intakeRuntime = getIntakeRuntime();
  const documentsRuntime = getDocumentsRuntime();
  const paymentsRuntime = getPaymentsRuntime();
  const payrollRuntime = getPayrollRuntime();
  const repository = new InMemoryWorkflowAutomationRepository();
  const auditSink = new MemoryAuditSink();
  const service = new WorkflowAutomationService({
    repository,
    notificationsService: notificationsRuntime.service,
    intake: {
      listRequests: () => intakeRuntime.service.listRequests(),
      getLeadById: (leadId: string) => intakeRuntime.repository.getLeadById(leadId),
      updateRequest: (request) => intakeRuntime.repository.updateRequest(request),
      updateLead: (lead) => intakeRuntime.repository.updateLead(lead),
      auditSink: intakeRuntime.auditSink
    },
    documents: {
      listDocuments: () => documentsRuntime.service.listDocuments()
    },
    payments: {
      listInvoices: () => paymentsRuntime.repository.listInvoices(),
      updateInvoice: (invoice) => paymentsRuntime.repository.updateInvoice(invoice),
      createReminder: (reminder) => paymentsRuntime.repository.createReminder(reminder),
      listRemindersByInvoiceId: (invoiceId: string) => paymentsRuntime.repository.listRemindersByInvoiceId(invoiceId),
      createActivity: (activity) => paymentsRuntime.repository.createActivity(activity),
      auditSink: paymentsRuntime.auditSink,
      nextId: paymentsRuntime.nextId
    },
    payroll: {
      listTimesheets: () => payrollRuntime.repository.listTimesheets(),
      getPayPeriodById: (payPeriodId: string) => payrollRuntime.repository.getPayPeriodById(payPeriodId)
    },
    auditSink,
    now: () => new Date("2026-05-26T14:00:00.000Z"),
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  return {
    repository,
    service,
    auditSink
  };
}

let runtime: AutomationRuntime | undefined;

export function getAutomationRuntime(): AutomationRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetAutomationRuntime(): AutomationRuntime {
  runtime = createRuntime();
  return runtime;
}

