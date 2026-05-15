import type {
  DocumentAccessRuleRecord,
  DocumentArchiveState,
  DocumentCategory,
  DocumentRetentionFlag,
  DocumentShareScope,
  DocumentUploadInput,
  VisibilityFlag
} from "../../types/src/index.ts";

export const MAX_DOCUMENT_FILE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

const INTERNAL_ONLY_CATEGORIES: readonly DocumentCategory[] = ["payroll_docs", "tax_docs"] as const;

const CUSTOMER_UPLOAD_REQUIRED_FLAGS: readonly VisibilityFlag[] = ["internal", "customer"] as const;

export class DocumentValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super("Document validation failed.");
    this.name = "DocumentValidationError";
    this.issues = issues;
  }
}

export class DocumentWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentWorkflowError";
  }
}

export function validateDocumentUploadInput(file: DocumentUploadInput): readonly string[] {
  const issues: string[] = [];

  if (!file.fileName.trim()) {
    issues.push("Uploaded files require a file name.");
  }

  if (
    !ALLOWED_DOCUMENT_CONTENT_TYPES.includes(
      file.contentType as (typeof ALLOWED_DOCUMENT_CONTENT_TYPES)[number]
    )
  ) {
    issues.push("Uploaded files must use an allowed content type.");
  }

  if (!Number.isFinite(file.byteSize) || file.byteSize <= 0) {
    issues.push("Uploaded files must include a positive byte size.");
  }

  if (file.byteSize > MAX_DOCUMENT_FILE_BYTES) {
    issues.push("Uploaded files must be 25 MB or smaller.");
  }

  return issues;
}

export function validateDocumentVisibility(
  category: DocumentCategory,
  visibilityFlags: readonly VisibilityFlag[]
): readonly string[] {
  const issues: string[] = [];

  if (visibilityFlags.length === 0) {
    issues.push("At least one document visibility flag is required.");
  }

  if (!visibilityFlags.includes("internal")) {
    issues.push("Document visibility must always include internal.");
  }

  if (INTERNAL_ONLY_CATEGORIES.includes(category) && visibilityFlags.some((flag) => flag !== "internal")) {
    issues.push(`${category} documents must remain internal-only.`);
  }

  if (category === "customer_uploads") {
    for (const flag of CUSTOMER_UPLOAD_REQUIRED_FLAGS) {
      if (!visibilityFlags.includes(flag)) {
        issues.push("customer_uploads documents must remain visible to both internal and customer audiences.");
        break;
      }
    }
  }

  return issues;
}

export function validateDocumentRetentionFlags(
  category: DocumentCategory,
  retentionFlags: readonly DocumentRetentionFlag[]
): readonly string[] {
  const issues: string[] = [];

  if (category === "payroll_docs" && !retentionFlags.includes("payroll_required")) {
    issues.push("payroll_docs must include the payroll_required retention flag.");
  }

  if (category === "tax_docs" && !retentionFlags.includes("tax_required")) {
    issues.push("tax_docs must include the tax_required retention flag.");
  }

  return issues;
}

export function validateDocumentShareScope(scope: DocumentShareScope): readonly string[] {
  if (!scope) {
    return ["Document public share links require a share scope."];
  }

  return [];
}

export function validateDocumentAccessRules(
  rules: readonly Omit<DocumentAccessRuleRecord, "id" | "createdAt">[]
): readonly string[] {
  const issues: string[] = [];

  for (const rule of rules) {
    if (!rule.principalId.trim()) {
      issues.push("Access rules require a principal id.");
    }

    if (rule.actions.length === 0) {
      issues.push("Access rules require at least one action.");
    }
  }

  return issues;
}

export function ensureArchiveStateChangeAllowed(
  currentState: DocumentArchiveState,
  nextState: DocumentArchiveState
): void {
  if (currentState === nextState) {
    return;
  }

  if (currentState === "archived" && nextState === "active") {
    return;
  }

  if (currentState === "active" && nextState === "archived") {
    return;
  }

  throw new DocumentWorkflowError(`Document archive state cannot move from ${currentState} to ${nextState}.`);
}

export function ensureVisibilitySubset(
  parentVisibilityFlags: readonly VisibilityFlag[],
  nextVisibilityFlags: readonly VisibilityFlag[]
): void {
  const invalid = nextVisibilityFlags.filter((flag) => !parentVisibilityFlags.includes(flag));

  if (invalid.length > 0) {
    throw new DocumentValidationError([
      `Visibility contains flags not present on the document: ${invalid.join(", ")}.`
    ]);
  }
}
