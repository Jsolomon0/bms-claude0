import type { LeadRecord, ProjectRequestRecord, ProjectRequestRepository } from "../../types/src/index.ts";

export class InMemoryProjectRequestRepository implements ProjectRequestRepository {
  private readonly requests = new Map<string, ProjectRequestRecord>();
  private readonly leads = new Map<string, LeadRecord>();

  constructor(seed?: {
    requests?: readonly ProjectRequestRecord[];
    leads?: readonly LeadRecord[];
  }) {
    seed?.requests?.forEach((request) => {
      this.requests.set(request.id, request);
    });
    seed?.leads?.forEach((lead) => {
      this.leads.set(lead.id, lead);
    });
  }

  createRequest(request: ProjectRequestRecord): void {
    this.requests.set(request.id, request);
  }

  updateRequest(request: ProjectRequestRecord): void {
    this.requests.set(request.id, request);
  }

  getRequestById(requestId: string): ProjectRequestRecord | undefined {
    return this.requests.get(requestId);
  }

  listRequests(): readonly ProjectRequestRecord[] {
    return [...this.requests.values()].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  }

  createLead(lead: LeadRecord): void {
    this.leads.set(lead.id, lead);
  }

  updateLead(lead: LeadRecord): void {
    this.leads.set(lead.id, lead);
  }

  getLeadById(leadId: string): LeadRecord | undefined {
    return this.leads.get(leadId);
  }

  listLeads(): readonly LeadRecord[] {
    return [...this.leads.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
