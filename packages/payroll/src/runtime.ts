import type { AuditEvent, AuditSink } from "../../types/src/index.ts";
import { createInMemorySecurityContext, type InMemorySecurityContext } from "../../security/src/index.ts";
import {
  DEMO_CLOCK_EVENTS,
  DEMO_EMPLOYEE_PAYROLL_PROFILES,
  DEMO_EMPLOYEE_PAYROLL_SENSITIVE_PROFILES,
  DEMO_PAY_PERIODS,
  DEMO_PAYROLL_DOCUMENTS,
  DEMO_PAYROLL_LABOR_COST_ALLOCATIONS,
  DEMO_PAYROLL_RUN_AUDITS,
  DEMO_PAYROLL_RUNS,
  DEMO_TIME_ENTRIES,
  DEMO_TIMESHEETS,
  DEMO_TIMESHEET_AUDIT_RECORDS
} from "./fixtures.ts";
import { MemoryEmbeddedPayrollProvider } from "./provider.ts";
import { InMemoryPayrollRepository } from "./repository.ts";
import { PayrollService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface PayrollRuntime {
  repository: InMemoryPayrollRepository;
  provider: MemoryEmbeddedPayrollProvider;
  service: PayrollService;
  auditSink: MemoryAuditSink;
  security: InMemorySecurityContext;
}

function createRuntime(): PayrollRuntime {
  let counter = 4000;
  let timeOffsetMs = 0;
  const repository = new InMemoryPayrollRepository({
    payPeriods: DEMO_PAY_PERIODS,
    timesheets: DEMO_TIMESHEETS,
    clockEvents: DEMO_CLOCK_EVENTS,
    timeEntries: DEMO_TIME_ENTRIES,
    timesheetAuditRecords: DEMO_TIMESHEET_AUDIT_RECORDS,
    employeePayrollProfiles: DEMO_EMPLOYEE_PAYROLL_PROFILES,
    employeePayrollSensitiveProfiles: DEMO_EMPLOYEE_PAYROLL_SENSITIVE_PROFILES,
    payrollRuns: DEMO_PAYROLL_RUNS,
    payrollRunAudits: DEMO_PAYROLL_RUN_AUDITS,
    payrollDocuments: DEMO_PAYROLL_DOCUMENTS,
    payrollLaborCostAllocations: DEMO_PAYROLL_LABOR_COST_ALLOCATIONS
  });
  const auditSink = new MemoryAuditSink();
  const runtimeNow = () => new Date(Date.parse("2026-04-28T14:30:00.000Z") + timeOffsetMs);
  const security = createInMemorySecurityContext({
    auditSink,
    now: runtimeNow
  });
  const provider = new MemoryEmbeddedPayrollProvider(() => new Date(Date.parse("2026-04-28T14:30:00.000Z") + timeOffsetMs));
  const service = new PayrollService({
    repository,
    provider,
    auditSink,
    now: () => {
      const timestamp = runtimeNow();
      timeOffsetMs += 1000;
      return timestamp;
    },
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  return {
    repository,
    provider,
    service,
    auditSink,
    security
  };
}

let runtime: PayrollRuntime | undefined;

export function getPayrollRuntime(): PayrollRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetPayrollRuntime(): PayrollRuntime {
  runtime = createRuntime();
  return runtime;
}
