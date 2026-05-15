import type {
  DocumentAccessRuleRecord,
  DocumentActivitySummary,
  DocumentPublicShareLinkRecord,
  DocumentRecord,
  DocumentRepository,
  DocumentVersionRecord
} from "../../types/src/index.ts";

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();
  private readonly versions = new Map<string, DocumentVersionRecord>();
  private readonly accessRules = new Map<string, DocumentAccessRuleRecord[]>();
  private readonly activities = new Map<string, DocumentActivitySummary[]>();
  private readonly publicShareLinks = new Map<string, DocumentPublicShareLinkRecord>();

  constructor(seed?: {
    documents?: readonly DocumentRecord[];
    versions?: readonly DocumentVersionRecord[];
    accessRules?: readonly DocumentAccessRuleRecord[];
    activities?: readonly DocumentActivitySummary[];
    publicShareLinks?: readonly DocumentPublicShareLinkRecord[];
  }) {
    seed?.documents?.forEach((document) => {
      this.documents.set(document.id, document);
    });
    seed?.versions?.forEach((version) => {
      this.versions.set(version.id, version);
    });
    seed?.accessRules?.forEach((rule) => {
      const current = this.accessRules.get(rule.documentId) ?? [];
      current.push(rule);
      this.accessRules.set(rule.documentId, current);
    });
    seed?.activities?.forEach((activity) => {
      const current = this.activities.get(activity.documentId) ?? [];
      current.push(activity);
      this.activities.set(activity.documentId, current);
    });
    seed?.publicShareLinks?.forEach((link) => {
      this.publicShareLinks.set(link.id, link);
    });
  }

  createDocument(document: DocumentRecord): void {
    this.documents.set(document.id, document);
  }

  updateDocument(document: DocumentRecord): void {
    this.documents.set(document.id, document);
  }

  getDocumentById(documentId: string): DocumentRecord | undefined {
    return this.documents.get(documentId);
  }

  listDocuments(): readonly DocumentRecord[] {
    return [...this.documents.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createVersion(version: DocumentVersionRecord): void {
    this.versions.set(version.id, version);
  }

  getVersionById(versionId: string): DocumentVersionRecord | undefined {
    return this.versions.get(versionId);
  }

  listVersionsByDocumentId(documentId: string): readonly DocumentVersionRecord[] {
    return [...this.versions.values()]
      .filter((version) => version.documentId === documentId)
      .sort((left, right) => right.versionNumber - left.versionNumber);
  }

  createAccessRule(rule: DocumentAccessRuleRecord): void {
    const current = this.accessRules.get(rule.documentId) ?? [];
    this.accessRules.set(rule.documentId, [...current, rule]);
  }

  replaceAccessRules(documentId: string, rules: readonly DocumentAccessRuleRecord[]): void {
    this.accessRules.set(documentId, [...rules]);
  }

  listAccessRulesByDocumentId(documentId: string): readonly DocumentAccessRuleRecord[] {
    return [...(this.accessRules.get(documentId) ?? [])].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }

  createActivity(activity: DocumentActivitySummary): void {
    const current = this.activities.get(activity.documentId) ?? [];
    this.activities.set(activity.documentId, [...current, activity]);
  }

  listActivitiesByDocumentId(documentId: string): readonly DocumentActivitySummary[] {
    return [...(this.activities.get(documentId) ?? [])].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt)
    );
  }

  createPublicShareLink(link: DocumentPublicShareLinkRecord): void {
    this.publicShareLinks.set(link.id, link);
  }

  updatePublicShareLink(link: DocumentPublicShareLinkRecord): void {
    this.publicShareLinks.set(link.id, link);
  }

  getPublicShareLinkById(linkId: string): DocumentPublicShareLinkRecord | undefined {
    return this.publicShareLinks.get(linkId);
  }

  listPublicShareLinksByDocumentId(documentId: string): readonly DocumentPublicShareLinkRecord[] {
    return [...this.publicShareLinks.values()]
      .filter((link) => link.documentId === documentId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
