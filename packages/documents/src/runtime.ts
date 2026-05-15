import { MemoryObjectStorageAdapter, NoopMalwareScanHook } from "../../storage/src/index.ts";
import { createInMemorySecurityContext, resolveRuntimeSecret, type InMemorySecurityContext } from "../../security/src/index.ts";
import type { AuditEvent, AuditSink } from "../../types/src/index.ts";
import {
  DEMO_DOCUMENT_ACCESS_RULES,
  DEMO_DOCUMENT_ACTIVITIES,
  DEMO_DOCUMENT_PUBLIC_SHARE_LINKS,
  DEMO_DOCUMENT_VERSIONS,
  DEMO_DOCUMENTS
} from "./fixtures.ts";
import { InMemoryDocumentRepository } from "./repository.ts";
import { DocumentManagementService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface DocumentsRuntime {
  repository: InMemoryDocumentRepository;
  service: DocumentManagementService;
  auditSink: MemoryAuditSink;
  storage: MemoryObjectStorageAdapter;
  publicLinkSecret: string;
  security: InMemorySecurityContext;
  now: () => Date;
}

function createRuntime(): DocumentsRuntime {
  let counter = 3000;
  const runtimeNow = () => new Date("2026-04-28T14:00:00.000Z");
  const storage = new MemoryObjectStorageAdapter(runtimeNow);

  for (const version of DEMO_DOCUMENT_VERSIONS) {
    storage.putObject({
      key: version.storageKey,
      contentType: version.contentType,
      byteSize: version.byteSize,
      originalFileName: version.fileName,
      checksum: version.checksum
    });
  }

  const repository = new InMemoryDocumentRepository({
    documents: DEMO_DOCUMENTS,
    versions: DEMO_DOCUMENT_VERSIONS,
    accessRules: DEMO_DOCUMENT_ACCESS_RULES,
    activities: DEMO_DOCUMENT_ACTIVITIES,
    publicShareLinks: DEMO_DOCUMENT_PUBLIC_SHARE_LINKS
  });
  const auditSink = new MemoryAuditSink();
  const security = createInMemorySecurityContext({
    auditSink,
    now: runtimeNow
  });
  const service = new DocumentManagementService({
    repository,
    storage,
    malwareScanHook: new NoopMalwareScanHook(),
    auditSink,
    now: runtimeNow,
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  return {
    repository,
    service,
    auditSink,
    storage,
    publicLinkSecret: resolveRuntimeSecret({
      envKey: "BMS_DOCUMENT_PUBLIC_LINK_SECRET",
      fallbackSecret: "documents-demo-secret-2026-hardening",
      auditSink,
      logger: security.logger,
      monitoringHook: security.monitoringHook,
      now: runtimeNow
    }),
    security,
    now: runtimeNow
  };
}

let runtime: DocumentsRuntime | undefined;

export function getDocumentsRuntime(): DocumentsRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetDocumentsRuntime(): DocumentsRuntime {
  runtime = createRuntime();
  return runtime;
}
