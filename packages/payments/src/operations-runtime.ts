import type { AuditEvent, AuditSink } from "../../types/src/index.ts";
import {
  DEMO_BILL_LINE_ITEMS,
  DEMO_BILLS,
  DEMO_EXPENSES,
  DEMO_FINANCE_OPERATION_ACTIVITIES,
  DEMO_PURCHASE_ORDERS,
  DEMO_PURCHASE_ORDER_LINE_ITEMS,
  DEMO_VENDORS
} from "./operations-fixtures.ts";
import { InMemoryFinanceOperationsRepository } from "./operations-repository.ts";
import { FinanceOperationsService } from "./operations-workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface FinanceOperationsRuntime {
  repository: InMemoryFinanceOperationsRepository;
  service: FinanceOperationsService;
  auditSink: MemoryAuditSink;
}

function createRuntime(): FinanceOperationsRuntime {
  let counter = 5000;
  let timeOffsetMs = 0;
  const repository = new InMemoryFinanceOperationsRepository({
    vendors: DEMO_VENDORS,
    expenses: DEMO_EXPENSES,
    purchaseOrders: DEMO_PURCHASE_ORDERS,
    purchaseOrderLineItems: DEMO_PURCHASE_ORDER_LINE_ITEMS,
    bills: DEMO_BILLS,
    billLineItems: DEMO_BILL_LINE_ITEMS,
    activities: DEMO_FINANCE_OPERATION_ACTIVITIES
  });
  const auditSink = new MemoryAuditSink();
  const service = new FinanceOperationsService({
    repository,
    auditSink,
    now: () => {
      const timestamp = new Date(Date.parse("2026-04-28T15:00:00.000Z") + timeOffsetMs);
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
    service,
    auditSink
  };
}

let runtime: FinanceOperationsRuntime | undefined;

export function getFinanceOperationsRuntime(): FinanceOperationsRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetFinanceOperationsRuntime(): FinanceOperationsRuntime {
  runtime = createRuntime();
  return runtime;
}
