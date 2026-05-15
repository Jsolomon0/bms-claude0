import { validateDocumentUploadInput } from "../../documents/src/validation.ts";
import { WorkflowNotificationService } from "../../notifications/src/index.ts";
import { NoopMalwareScanHook, type MalwareScanHook, type ObjectStorageAdapter } from "../../storage/src/index.ts";
import type {
  ApplicantDocumentRecord,
  ApplicantProfileRecord,
  ApplicantStatusHistoryRecord,
  AuditEvent,
  AuditSink,
  DocumentUploadInput,
  EmployeeRecord,
  HiringInternalNoteRecord,
  HiringRepository,
  InterviewFeedbackRecord,
  InterviewRecord,
  InterviewType,
  JobApplicationRecord,
  JobApplicationStatus,
  JobOfferRecord,
  JobOfferStatus,
  JobPostingRecord,
  NotificationPreview,
  OnboardingChecklistRecord,
  OnboardingTaskRecord,
  WorkflowNotificationRecord
} from "../../types/src/index.ts";
import {
  ensureApplicantSubmitAllowed,
  ensureDraftUpdateAllowed,
  ensureInternalApplicationTransition,
  ensureInterviewSchedulingInput,
  ensureInterviewStatusTransition,
  ensureOfferStatusTransition,
  ensureWithdrawAllowed,
  HiringTransitionError,
  HiringValidationError,
  validateJobPostingFields,
  validatePublicApplicationInput
} from "./validation.ts";

function defaultIdGenerator() {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function createAuditEvent(
  occurredAt: string,
  eventType: AuditEvent["eventType"],
  resourceType: string,
  resourceId: string,
  actorUserId: string | null,
  metadata?: Record<string, unknown>
): AuditEvent {
  return {
    eventType,
    outcome: "success",
    actorUserId,
    resourceType,
    resourceId,
    viaPublicLink: false,
    sensitive: true,
    occurredAt,
    metadata
  };
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeAnswers(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
  );
}

function buildApplicantDocumentStorageKey(
  applicantProfileId: string,
  jobApplicationId: string | undefined,
  fileName: string
): string {
  const normalized = fileName.trim().replace(/\s+/g, "-").toLowerCase();
  const applicationSegment = jobApplicationId ? `applications/${jobApplicationId}` : "profile";
  return `hiring/${applicantProfileId}/${applicationSegment}/${normalized}`;
}

async function writeAudits(auditSink: AuditSink | undefined, audits: readonly AuditEvent[]): Promise<void> {
  for (const audit of audits) {
    const result = auditSink?.write(audit);
    await Promise.resolve(result);
  }
}

async function notify(
  notifications: WorkflowNotificationService | undefined,
  input: {
    organizationId: string;
    type: string;
    title: string;
    body: string;
    tone: NotificationPreview["tone"];
    audience: WorkflowNotificationRecord["audience"];
    channel?: WorkflowNotificationRecord["channel"];
    resourceType: string;
    resourceId: string;
    dedupeKey?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  if (!notifications) {
    return;
  }

  await notifications.dispatchNotification({
    organizationId: input.organizationId,
    type: input.type,
    title: input.title,
    body: input.body,
    tone: input.tone,
    audience: input.audience,
    channel: input.channel ?? "in_app",
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    dedupeKey: input.dedupeKey,
    metadata: input.metadata
  });
}

export interface CreateJobPostingInput {
  organizationId: string;
  actorUserId: string;
  title: string;
  department: string;
  location: string;
  employmentType: JobPostingRecord["employmentType"];
  description: string;
  requirements: string;
  compensationRange?: string;
  status?: JobPostingRecord["status"];
  screeningQuestions?: JobPostingRecord["screeningQuestions"];
}

export interface UpdateJobPostingInput extends Partial<Omit<CreateJobPostingInput, "organizationId" | "actorUserId">> {
  jobPostingId: string;
  actorUserId: string;
}

export interface UpsertApplicantDraftApplicationInput {
  actorUserId: string;
  jobPostingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  coverLetter?: string;
  screeningAnswers: Record<string, string>;
  consentGranted: boolean;
  applicationId?: string;
}

export interface SubmitPublicJobApplicationInput extends Omit<UpsertApplicantDraftApplicationInput, "applicationId" | "actorUserId"> {
  actorUserId?: string;
  resumeFile: DocumentUploadInput;
}

export interface SubmitApplicantDraftApplicationInput {
  applicationId: string;
  actorUserId: string;
  resumeFile?: DocumentUploadInput;
}

export interface UploadApplicantDocumentInput {
  actorUserId: string;
  applicantProfileId: string;
  jobApplicationId?: string;
  documentType: ApplicantDocumentRecord["documentType"];
  file: DocumentUploadInput;
}

export interface DeleteApplicantDocumentInput {
  applicantDocumentId: string;
  actorUserId: string;
}

export interface AddHiringInternalNoteInput {
  jobApplicationId: string;
  actorUserId: string;
  note: string;
}

export interface UpdateJobApplicationStatusInput {
  jobApplicationId: string;
  actorUserId: string;
  nextStatus: JobApplicationStatus;
  reason?: string;
}

export interface WithdrawJobApplicationInput {
  jobApplicationId: string;
  actorUserId: string;
  reason?: string;
}

export interface ScheduleInterviewInput {
  jobApplicationId: string;
  actorUserId: string;
  scheduledStart: string;
  scheduledEnd: string;
  locationOrMeetingUrl: string;
  interviewType: InterviewType;
  interviewerUserIds: readonly string[];
}

export interface UpdateInterviewResponseInput {
  interviewId: string;
  actorUserId: string;
  response: "accepted" | "declined";
}

export interface SubmitInterviewFeedbackInput {
  interviewId: string;
  interviewerUserId: string;
  rating?: number;
  feedback: string;
  recommendation: InterviewFeedbackRecord["recommendation"];
}

export interface CreateJobOfferInput {
  jobApplicationId: string;
  actorUserId: string;
  status?: JobOfferStatus;
  offerDetails: Record<string, unknown>;
}

export interface UpdateJobOfferStatusInput {
  jobOfferId: string;
  actorUserId: string;
  nextStatus: JobOfferStatus;
  offerDetails?: Record<string, unknown>;
}

export interface ConvertApplicantToEmployeeInput {
  jobApplicationId: string;
  actorUserId: string;
  employeeUserId?: string;
}

export interface HiringApplicationDetail {
  jobPosting?: JobPostingRecord;
  applicantProfile?: ApplicantProfileRecord;
  application?: JobApplicationRecord;
  documents: readonly ApplicantDocumentRecord[];
  statusHistory: readonly ApplicantStatusHistoryRecord[];
  internalNotes: readonly HiringInternalNoteRecord[];
  interviews: readonly InterviewRecord[];
  interviewFeedback: readonly InterviewFeedbackRecord[];
  offers: readonly JobOfferRecord[];
  onboardingChecklist?: OnboardingChecklistRecord;
  onboardingTasks: readonly OnboardingTaskRecord[];
  employee?: EmployeeRecord;
}

export interface HiringWorkflowDependencies {
  repository: HiringRepository;
  storage: ObjectStorageAdapter;
  auditSink?: AuditSink;
  notifications?: WorkflowNotificationService;
  malwareScanHook?: MalwareScanHook;
  idGenerator?: (prefix: string) => string;
  now?: () => Date;
}

export class HiringWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HiringWorkflowError";
  }
}

export class HiringRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HiringRateLimitError";
  }
}

export class HiringManagementService {
  private readonly repository: HiringRepository;
  private readonly storage: ObjectStorageAdapter;
  private readonly auditSink?: AuditSink;
  private readonly notifications?: WorkflowNotificationService;
  private readonly malwareScanHook: MalwareScanHook;
  private readonly idGenerator: (prefix: string) => string;
  private readonly now: () => Date;

  constructor(dependencies: HiringWorkflowDependencies) {
    this.repository = dependencies.repository;
    this.storage = dependencies.storage;
    this.auditSink = dependencies.auditSink;
    this.notifications = dependencies.notifications;
    this.malwareScanHook = dependencies.malwareScanHook ?? new NoopMalwareScanHook();
    this.idGenerator = dependencies.idGenerator ?? defaultIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  listJobPostings(): readonly JobPostingRecord[] {
    return this.repository.listJobPostings();
  }

  listPublishedJobPostings(): readonly JobPostingRecord[] {
    return this.repository.listJobPostings().filter((jobPosting) => jobPosting.status === "published");
  }

  listApplications(): readonly JobApplicationRecord[] {
    return this.repository.listJobApplications();
  }

  listApplicantProfiles(): readonly ApplicantProfileRecord[] {
    return this.repository.listApplicantProfiles();
  }

  listEmployees(): readonly EmployeeRecord[] {
    return this.repository.listEmployees();
  }

  getApplicationDetail(jobApplicationId: string): HiringApplicationDetail {
    const application = this.repository.getJobApplicationById(jobApplicationId);
    const applicantProfile = application
      ? this.repository.getApplicantProfileById(application.applicantProfileId)
      : undefined;
    const jobPosting = application ? this.repository.getJobPostingById(application.jobPostingId) : undefined;
    const interviews = application ? this.repository.listInterviewsByApplicationId(application.id) : [];
    const interviewFeedback = interviews.flatMap((interview) => this.repository.listInterviewFeedbackByInterviewId(interview.id));
    const offers = application ? this.repository.listJobOffersByApplicationId(application.id) : [];
    const onboardingChecklist = application
      ? this.repository.getOnboardingChecklistBySourceApplicationId(application.id)
      : undefined;
    const employee = application ? this.repository.getEmployeeBySourceApplicationId(application.id) : undefined;

    return {
      jobPosting,
      applicantProfile,
      application,
      documents: application
        ? this.repository.listApplicantDocumentsByApplicationId(application.id)
        : applicantProfile
          ? this.repository.listApplicantDocumentsByApplicantProfileId(applicantProfile.id)
          : [],
      statusHistory: application ? this.repository.listStatusHistoryByApplicationId(application.id) : [],
      internalNotes: application ? this.repository.listInternalNotesByApplicationId(application.id) : [],
      interviews,
      interviewFeedback,
      offers,
      onboardingChecklist,
      onboardingTasks: onboardingChecklist ? this.repository.listOnboardingTasksByChecklistId(onboardingChecklist.id) : [],
      employee
    };
  }

  private requireJobPosting(jobPostingId: string): JobPostingRecord {
    const jobPosting = this.repository.getJobPostingById(jobPostingId);

    if (!jobPosting) {
      throw new HiringWorkflowError(`Job posting ${jobPostingId} was not found.`);
    }

    return jobPosting;
  }

  private requireApplicantProfile(applicantProfileId: string): ApplicantProfileRecord {
    const profile = this.repository.getApplicantProfileById(applicantProfileId);

    if (!profile) {
      throw new HiringWorkflowError(`Applicant profile ${applicantProfileId} was not found.`);
    }

    return profile;
  }

  private requireApplication(jobApplicationId: string): JobApplicationRecord {
    const application = this.repository.getJobApplicationById(jobApplicationId);

    if (!application) {
      throw new HiringWorkflowError(`Job application ${jobApplicationId} was not found.`);
    }

    return application;
  }

  private requireInterview(interviewId: string): InterviewRecord {
    const interview = this.repository.getInterviewById(interviewId);

    if (!interview) {
      throw new HiringWorkflowError(`Interview ${interviewId} was not found.`);
    }

    return interview;
  }

  private requireOffer(jobOfferId: string): JobOfferRecord {
    const offer = this.repository.getJobOfferById(jobOfferId);

    if (!offer) {
      throw new HiringWorkflowError(`Job offer ${jobOfferId} was not found.`);
    }

    return offer;
  }

  private upsertApplicantProfile(input: {
    actorUserId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    portfolioUrl?: string;
    linkedinUrl?: string;
  }): ApplicantProfileRecord {
    const nowIso = this.now().toISOString();
    const existing =
      (input.actorUserId ? this.repository.getApplicantProfileByUserId(input.actorUserId) : undefined) ??
      this.repository.getApplicantProfileByEmail(input.email);

    if (existing) {
      const updated: ApplicantProfileRecord = {
        ...existing,
        userId: input.actorUserId ?? existing.userId ?? null,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: normalizeOptionalString(input.phone) ?? existing.phone,
        portfolioUrl: normalizeOptionalString(input.portfolioUrl) ?? existing.portfolioUrl,
        linkedinUrl: normalizeOptionalString(input.linkedinUrl) ?? existing.linkedinUrl,
        updatedAt: nowIso
      };
      this.repository.updateApplicantProfile(updated);
      return updated;
    }

    const created: ApplicantProfileRecord = {
      id: this.idGenerator("applicant-profile"),
      userId: input.actorUserId ?? null,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: normalizeOptionalString(input.phone),
      portfolioUrl: normalizeOptionalString(input.portfolioUrl),
      linkedinUrl: normalizeOptionalString(input.linkedinUrl),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.repository.createApplicantProfile(created);
    return created;
  }

  private async createApplicantDocument(input: UploadApplicantDocumentInput): Promise<ApplicantDocumentRecord> {
    const profile = this.requireApplicantProfile(input.applicantProfileId);
    const issues = validateDocumentUploadInput(input.file);

    if (issues.length > 0) {
      throw new HiringValidationError(issues.map((message) => ({ field: "resumeUpload", message })));
    }

    const storageKey = buildApplicantDocumentStorageKey(profile.id, input.jobApplicationId, input.file.fileName);
    const storedObject = await this.storage.putObject({
      key: storageKey,
      contentType: input.file.contentType,
      byteSize: input.file.byteSize,
      originalFileName: input.file.fileName,
      checksum: input.file.checksum
    });
    const scan = await this.malwareScanHook.scanObject(storedObject);

    if (scan.status === "infected") {
      throw new HiringValidationError([
        {
          field: "resumeUpload",
          message: `Malware scan rejected the upload${scan.reason ? `: ${scan.reason}` : "."}`
        }
      ]);
    }

    const uploadedAt = this.now().toISOString();
    const document: ApplicantDocumentRecord = {
      id: this.idGenerator("applicant-document"),
      applicantProfileId: profile.id,
      jobApplicationId: input.jobApplicationId ?? null,
      documentType: input.documentType,
      storageKey,
      fileName: input.file.fileName.trim(),
      contentType: input.file.contentType,
      byteSize: input.file.byteSize,
      visibilityFlags: ["applicant"],
      uploadedAt
    };

    this.repository.createApplicantDocument(document);
    await writeAudits(this.auditSink, [
      createAuditEvent(uploadedAt, "hiring.document.uploaded", "applicant_document", document.id, input.actorUserId, {
        applicantProfileId: document.applicantProfileId,
        jobApplicationId: document.jobApplicationId,
        documentType: document.documentType
      })
    ]);
    return document;
  }

  private async recordApplicationStatusChange(input: {
    application: JobApplicationRecord;
    previousStatus: JobApplicationStatus | null;
    nextStatus: JobApplicationStatus;
    actorUserId: string;
    reason?: string;
  }): Promise<void> {
    const nowIso = this.now().toISOString();
    this.repository.createStatusHistory({
      id: this.idGenerator("application-status-history"),
      jobApplicationId: input.application.id,
      previousStatus: input.previousStatus,
      newStatus: input.nextStatus,
      changedByUserId: input.actorUserId,
      reason: normalizeOptionalString(input.reason),
      createdAt: nowIso
    });

    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.application.status_changed", "job_application", input.application.id, input.actorUserId, {
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        reason: normalizeOptionalString(input.reason)
      })
    ]);
  }

  private async ensureOnboardingChecklistForApplication(
    application: JobApplicationRecord,
    profile: ApplicantProfileRecord,
    actorUserId: string
  ): Promise<OnboardingChecklistRecord> {
    const existing = this.repository.getOnboardingChecklistBySourceApplicationId(application.id);

    if (existing) {
      return existing;
    }

    const nowIso = this.now().toISOString();
    const checklist: OnboardingChecklistRecord = {
      id: this.idGenerator("onboarding-checklist"),
      applicantProfileId: profile.id,
      employeeId: application.convertedEmployeeId ?? null,
      sourceApplicationId: application.id,
      status: "not_started",
      createdAt: nowIso,
      updatedAt: nowIso,
      visibilityFlags: ["applicant"]
    };
    this.repository.createOnboardingChecklist(checklist);
    this.repository.createOnboardingTask({
      id: this.idGenerator("onboarding-task"),
      onboardingChecklistId: checklist.id,
      title: "Complete employment paperwork",
      description: "Review onboarding packet and confirm start-date requirements.",
      assignedToUserId: profile.userId ?? null,
      dueDate: null,
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso
    });
    this.repository.createOnboardingTask({
      id: this.idGenerator("onboarding-task"),
      onboardingChecklistId: checklist.id,
      title: "Internal onboarding review",
      description: "Finalize employee setup and access handoff.",
      assignedToUserId: actorUserId,
      dueDate: null,
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso
    });
    return checklist;
  }

  private async dispatchSubmissionNotifications(
    application: JobApplicationRecord,
    profile: ApplicantProfileRecord,
    jobPosting: JobPostingRecord
  ): Promise<void> {
    await notify(this.notifications, {
      organizationId: application.organizationId,
      type: "hiring.application.submitted.internal",
      title: "New job application submitted",
      body: `${profile.firstName} ${profile.lastName} applied for ${jobPosting.title}.`,
      tone: "info",
      audience: {
        type: "role",
        role: "administrator"
      },
      resourceType: "job_application",
      resourceId: application.id,
      dedupeKey: `hiring-submission-admin:${application.id}`
    });

    await notify(this.notifications, {
      organizationId: application.organizationId,
      type: "hiring.application.submitted.owner",
      title: "New applicant ready for review",
      body: `${profile.firstName} ${profile.lastName} applied for ${jobPosting.title}.`,
      tone: "info",
      audience: {
        type: "role",
        role: "owner"
      },
      resourceType: "job_application",
      resourceId: application.id,
      dedupeKey: `hiring-submission-owner:${application.id}`
    });

    await notify(this.notifications, {
      organizationId: application.organizationId,
      type: "hiring.application.submitted.applicant",
      title: "Application received",
      body: `Your application for ${jobPosting.title} has been submitted.`,
      tone: "success",
      audience: profile.userId
        ? {
            type: "user",
            userId: profile.userId
          }
        : {
            type: "email",
            email: profile.email
          },
      resourceType: "job_application",
      resourceId: application.id,
      dedupeKey: `hiring-submission-applicant:${application.id}`
    });
  }

  async createJobPosting(input: CreateJobPostingInput): Promise<JobPostingRecord> {
    const issues = validateJobPostingFields(input);

    if (issues.length > 0) {
      throw new HiringValidationError(issues);
    }

    const nowIso = this.now().toISOString();
    const jobPosting: JobPostingRecord = {
      id: this.idGenerator("job-posting"),
      organizationId: input.organizationId,
      title: input.title.trim(),
      department: input.department.trim(),
      location: input.location.trim(),
      employmentType: input.employmentType,
      description: input.description.trim(),
      requirements: input.requirements.trim(),
      compensationRange: normalizeOptionalString(input.compensationRange),
      status: input.status ?? "draft",
      screeningQuestions: input.screeningQuestions ?? [],
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.repository.createJobPosting(jobPosting);
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.job_posting.created", "job_posting", jobPosting.id, input.actorUserId, {
        status: jobPosting.status
      })
    ]);
    return jobPosting;
  }

  async updateJobPosting(input: UpdateJobPostingInput): Promise<JobPostingRecord> {
    const jobPosting = this.requireJobPosting(input.jobPostingId);
    const nextCandidate = {
      title: input.title ?? jobPosting.title,
      department: input.department ?? jobPosting.department,
      location: input.location ?? jobPosting.location,
      employmentType: input.employmentType ?? jobPosting.employmentType,
      description: input.description ?? jobPosting.description,
      requirements: input.requirements ?? jobPosting.requirements
    };
    const issues = validateJobPostingFields(nextCandidate);

    if (issues.length > 0) {
      throw new HiringValidationError(issues);
    }

    const nowIso = this.now().toISOString();
    const updated: JobPostingRecord = {
      ...jobPosting,
      title: nextCandidate.title.trim(),
      department: nextCandidate.department.trim(),
      location: nextCandidate.location.trim(),
      employmentType: nextCandidate.employmentType,
      description: nextCandidate.description.trim(),
      requirements: nextCandidate.requirements.trim(),
      compensationRange:
        input.compensationRange === undefined ? jobPosting.compensationRange : normalizeOptionalString(input.compensationRange),
      status: input.status ?? jobPosting.status,
      screeningQuestions: input.screeningQuestions ?? jobPosting.screeningQuestions,
      updatedByUserId: input.actorUserId,
      updatedAt: nowIso
    };

    this.repository.updateJobPosting(updated);
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.job_posting.updated", "job_posting", updated.id, input.actorUserId, {
        status: updated.status
      })
    ]);
    return updated;
  }

  async archiveJobPosting(input: { jobPostingId: string; actorUserId: string }): Promise<JobPostingRecord> {
    const jobPosting = this.requireJobPosting(input.jobPostingId);
    const updated = await this.updateJobPosting({
      jobPostingId: jobPosting.id,
      actorUserId: input.actorUserId,
      status: "archived"
    });
    await writeAudits(this.auditSink, [
      createAuditEvent(updated.updatedAt, "hiring.job_posting.archived", "job_posting", updated.id, input.actorUserId)
    ]);
    return updated;
  }

  async upsertDraftApplication(input: UpsertApplicantDraftApplicationInput): Promise<JobApplicationRecord> {
    const jobPosting = this.requireJobPosting(input.jobPostingId);

    if (jobPosting.status === "archived") {
      throw new HiringWorkflowError(`Job posting ${jobPosting.id} is archived.`);
    }

    const profile = this.upsertApplicantProfile({
      actorUserId: input.actorUserId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      portfolioUrl: input.portfolioUrl,
      linkedinUrl: input.linkedinUrl
    });
    const nowIso = this.now().toISOString();

    if (input.applicationId) {
      const existing = this.requireApplication(input.applicationId);
      ensureDraftUpdateAllowed(existing.status);

      const updated: JobApplicationRecord = {
        ...existing,
        applicantProfileId: profile.id,
        coverLetter: normalizeOptionalString(input.coverLetter),
        screeningAnswers: normalizeAnswers(input.screeningAnswers),
        consentGranted: input.consentGranted,
        updatedAt: nowIso
      };
      this.repository.updateJobApplication(updated);
      return updated;
    }

    const application: JobApplicationRecord = {
      id: this.idGenerator("job-application"),
      organizationId: jobPosting.organizationId,
      jobPostingId: jobPosting.id,
      applicantProfileId: profile.id,
      status: "draft",
      coverLetter: normalizeOptionalString(input.coverLetter),
      screeningAnswers: normalizeAnswers(input.screeningAnswers),
      consentGranted: input.consentGranted,
      submittedAt: null,
      reviewedByUserId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      withdrawnAt: null,
      convertedEmployeeId: null,
      visibilityFlags: ["applicant"]
    };
    this.repository.createJobApplication(application);
    return application;
  }

  async submitDraftApplication(input: SubmitApplicantDraftApplicationInput): Promise<JobApplicationRecord> {
    const application = this.requireApplication(input.applicationId);
    ensureApplicantSubmitAllowed(application.status);
    const profile = this.requireApplicantProfile(application.applicantProfileId);
    const jobPosting = this.requireJobPosting(application.jobPostingId);
    const issues = validatePublicApplicationInput({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      consentGranted: application.consentGranted,
      resumeFile:
        input.resumeFile ??
        this.repository
          .listApplicantDocumentsByApplicationId(application.id)
          .find((document) => document.documentType === "resume"),
      screeningAnswers: application.screeningAnswers,
      jobPosting
    });

    if (issues.length > 0) {
      throw new HiringValidationError(issues);
    }

    if (input.resumeFile) {
      await this.createApplicantDocument({
        actorUserId: input.actorUserId,
        applicantProfileId: profile.id,
        jobApplicationId: application.id,
        documentType: "resume",
        file: input.resumeFile
      });
    }

    const nowIso = this.now().toISOString();
    const submitted: JobApplicationRecord = {
      ...application,
      status: "submitted",
      submittedAt: nowIso,
      updatedAt: nowIso
    };
    this.repository.updateJobApplication(submitted);
    await this.recordApplicationStatusChange({
      application: submitted,
      previousStatus: application.status,
      nextStatus: submitted.status,
      actorUserId: input.actorUserId
    });
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.application.submitted", "job_application", submitted.id, input.actorUserId, {
        jobPostingId: submitted.jobPostingId
      })
    ]);
    await this.dispatchSubmissionNotifications(submitted, profile, jobPosting);
    return submitted;
  }

  async submitPublicJobApplication(input: SubmitPublicJobApplicationInput): Promise<{
    profile: ApplicantProfileRecord;
    application: JobApplicationRecord;
    documents: readonly ApplicantDocumentRecord[];
  }> {
    const jobPosting = this.requireJobPosting(input.jobPostingId);

    if (jobPosting.status !== "published") {
      throw new HiringWorkflowError(`Job posting ${jobPosting.id} is not published.`);
    }

    const issues = validatePublicApplicationInput({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      consentGranted: input.consentGranted,
      resumeFile: input.resumeFile,
      screeningAnswers: normalizeAnswers(input.screeningAnswers),
      jobPosting
    });

    if (issues.length > 0) {
      throw new HiringValidationError(issues);
    }

    const profile = this.upsertApplicantProfile({
      actorUserId: input.actorUserId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      portfolioUrl: input.portfolioUrl,
      linkedinUrl: input.linkedinUrl
    });
    const nowIso = this.now().toISOString();
    const application: JobApplicationRecord = {
      id: this.idGenerator("job-application"),
      organizationId: jobPosting.organizationId,
      jobPostingId: jobPosting.id,
      applicantProfileId: profile.id,
      status: "submitted",
      coverLetter: normalizeOptionalString(input.coverLetter),
      screeningAnswers: normalizeAnswers(input.screeningAnswers),
      consentGranted: input.consentGranted,
      submittedAt: nowIso,
      reviewedByUserId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      withdrawnAt: null,
      convertedEmployeeId: null,
      visibilityFlags: ["applicant"]
    };
    this.repository.createJobApplication(application);
    await this.recordApplicationStatusChange({
      application,
      previousStatus: null,
      nextStatus: "submitted",
      actorUserId: input.actorUserId ?? profile.userId ?? profile.email
    });
    const resume = await this.createApplicantDocument({
      actorUserId: input.actorUserId ?? profile.userId ?? profile.email,
      applicantProfileId: profile.id,
      jobApplicationId: application.id,
      documentType: "resume",
      file: input.resumeFile
    });
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.application.submitted", "job_application", application.id, input.actorUserId ?? null, {
        jobPostingId: application.jobPostingId
      })
    ]);
    await this.dispatchSubmissionNotifications(application, profile, jobPosting);

    return {
      profile,
      application,
      documents: [resume]
    };
  }

  async uploadApplicantDocument(input: UploadApplicantDocumentInput): Promise<ApplicantDocumentRecord> {
    return this.createApplicantDocument(input);
  }

  async deleteApplicantDocument(input: DeleteApplicantDocumentInput): Promise<void> {
    const document = this.repository.getApplicantDocumentById(input.applicantDocumentId);

    if (!document) {
      throw new HiringWorkflowError(`Applicant document ${input.applicantDocumentId} was not found.`);
    }

    this.repository.deleteApplicantDocument(document.id);
    const occurredAt = this.now().toISOString();
    await writeAudits(this.auditSink, [
      createAuditEvent(occurredAt, "hiring.document.deleted", "applicant_document", document.id, input.actorUserId, {
        applicantProfileId: document.applicantProfileId,
        jobApplicationId: document.jobApplicationId
      })
    ]);
  }

  async addInternalNote(input: AddHiringInternalNoteInput): Promise<HiringInternalNoteRecord> {
    const application = this.requireApplication(input.jobApplicationId);
    const noteBody = input.note.trim();

    if (!noteBody) {
      throw new HiringValidationError([{ field: "note", message: "Internal note text is required." }]);
    }

    const createdAt = this.now().toISOString();
    const note: HiringInternalNoteRecord = {
      id: this.idGenerator("hiring-note"),
      jobApplicationId: application.id,
      authorUserId: input.actorUserId,
      note: noteBody,
      visibilityFlags: ["internal"],
      createdAt
    };
    this.repository.createInternalNote(note);
    return note;
  }

  async updateApplicationStatus(input: UpdateJobApplicationStatusInput): Promise<JobApplicationRecord> {
    const application = this.requireApplication(input.jobApplicationId);
    const profile = this.requireApplicantProfile(application.applicantProfileId);
    ensureInternalApplicationTransition(application.status, input.nextStatus);
    const nowIso = this.now().toISOString();
    const updated: JobApplicationRecord = {
      ...application,
      status: input.nextStatus,
      reviewedByUserId: input.actorUserId,
      updatedAt: nowIso,
      withdrawnAt: input.nextStatus === "withdrawn" ? nowIso : application.withdrawnAt
    };
    this.repository.updateJobApplication(updated);
    await this.recordApplicationStatusChange({
      application: updated,
      previousStatus: application.status,
      nextStatus: updated.status,
      actorUserId: input.actorUserId,
      reason: input.reason
    });

    if (updated.status === "offer_accepted") {
      await this.ensureOnboardingChecklistForApplication(updated, profile, input.actorUserId);
    }

    await notify(this.notifications, {
      organizationId: application.organizationId,
      type: "hiring.application.status_changed",
      title: "Application status updated",
      body: `Your application is now ${updated.status.replaceAll("_", " ")}.`,
      tone: updated.status === "rejected" ? "warning" : "info",
      audience: profile.userId
        ? {
            type: "user",
            userId: profile.userId
          }
        : {
            type: "email",
            email: profile.email
          },
      resourceType: "job_application",
      resourceId: updated.id,
      dedupeKey: `hiring-status:${updated.id}:${updated.status}`
    });

    return updated;
  }

  async withdrawApplication(input: WithdrawJobApplicationInput): Promise<JobApplicationRecord> {
    const application = this.requireApplication(input.jobApplicationId);
    ensureWithdrawAllowed(application.status);
    const nowIso = this.now().toISOString();
    const updated: JobApplicationRecord = {
      ...application,
      status: "withdrawn",
      updatedAt: nowIso,
      withdrawnAt: nowIso
    };
    this.repository.updateJobApplication(updated);
    await this.recordApplicationStatusChange({
      application: updated,
      previousStatus: application.status,
      nextStatus: "withdrawn",
      actorUserId: input.actorUserId,
      reason: input.reason
    });
    return updated;
  }

  async scheduleInterview(input: ScheduleInterviewInput): Promise<InterviewRecord> {
    const application = this.requireApplication(input.jobApplicationId);
    const issues = ensureInterviewSchedulingInput(input);

    if (issues.length > 0) {
      throw new HiringValidationError(issues);
    }

    const nowIso = this.now().toISOString();
    const interview: InterviewRecord = {
      id: this.idGenerator("interview"),
      jobApplicationId: application.id,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      locationOrMeetingUrl: input.locationOrMeetingUrl.trim(),
      interviewType: input.interviewType,
      status: "scheduled",
      interviewerUserIds: [...new Set(input.interviewerUserIds)],
      applicantResponse: null,
      createdByUserId: input.actorUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
      visibilityFlags: ["applicant"]
    };
    this.repository.createInterview(interview);
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.interview.scheduled", "interview", interview.id, input.actorUserId, {
        jobApplicationId: application.id,
        interviewerUserIds: interview.interviewerUserIds
      })
    ]);

    if (application.status !== "interview_scheduled") {
      const profile = this.requireApplicantProfile(application.applicantProfileId);
      const updatedApplication: JobApplicationRecord = {
        ...application,
        status: "interview_scheduled",
        reviewedByUserId: input.actorUserId,
        updatedAt: nowIso
      };
      this.repository.updateJobApplication(updatedApplication);
      await this.recordApplicationStatusChange({
        application: updatedApplication,
        previousStatus: application.status,
        nextStatus: "interview_scheduled",
        actorUserId: input.actorUserId
      });

      await notify(this.notifications, {
        organizationId: application.organizationId,
        type: "hiring.interview.scheduled.applicant",
        title: "Interview scheduled",
        body: `Your interview is scheduled for ${input.scheduledStart}.`,
        tone: "info",
        audience: profile.userId
          ? {
              type: "user",
              userId: profile.userId
            }
          : {
              type: "email",
              email: profile.email
            },
        resourceType: "interview",
        resourceId: interview.id,
        dedupeKey: `hiring-interview-applicant:${interview.id}`
      });
    }

    for (const interviewerUserId of interview.interviewerUserIds) {
      await notify(this.notifications, {
        organizationId: application.organizationId,
        type: "hiring.interview.scheduled.interviewer",
        title: "Interview assignment",
        body: `You have been assigned to interview application ${application.id}.`,
        tone: "info",
        audience: {
          type: "user",
          userId: interviewerUserId
        },
        resourceType: "interview",
        resourceId: interview.id,
        dedupeKey: `hiring-interview-assigned:${interview.id}:${interviewerUserId}`
      });
    }

    return interview;
  }

  async respondToInterview(input: UpdateInterviewResponseInput): Promise<InterviewRecord> {
    const interview = this.requireInterview(input.interviewId);
    const updatedStatus = input.response === "declined" ? "cancelled" : interview.status;

    if (updatedStatus !== interview.status) {
      ensureInterviewStatusTransition(interview.status, updatedStatus);
    }

    const updated: InterviewRecord = {
      ...interview,
      applicantResponse: input.response,
      status: updatedStatus,
      updatedAt: this.now().toISOString()
    };
    this.repository.updateInterview(updated);

    if (updatedStatus !== interview.status) {
      await writeAudits(this.auditSink, [
        createAuditEvent(updated.updatedAt, "hiring.interview.status_changed", "interview", updated.id, input.actorUserId, {
          previousStatus: interview.status,
          nextStatus: updated.status
        })
      ]);
    }

    return updated;
  }

  async submitInterviewFeedback(input: SubmitInterviewFeedbackInput): Promise<InterviewFeedbackRecord> {
    const interview = this.requireInterview(input.interviewId);

    if (interview.status !== "scheduled" && interview.status !== "completed") {
      throw new HiringTransitionError(
        `Interview feedback requires a scheduled or completed interview. Current status: ${interview.status}.`
      );
    }

    const nowIso = this.now().toISOString();
    const feedback: InterviewFeedbackRecord = {
      id: this.idGenerator("interview-feedback"),
      interviewId: interview.id,
      interviewerUserId: input.interviewerUserId,
      rating: input.rating,
      feedback: input.feedback.trim(),
      recommendation: input.recommendation,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (!feedback.feedback) {
      throw new HiringValidationError([{ field: "feedback", message: "Interview feedback is required." }]);
    }

    this.repository.createInterviewFeedback(feedback);

    if (interview.status !== "completed") {
      const completed: InterviewRecord = {
        ...interview,
        status: "completed",
        updatedAt: nowIso
      };
      this.repository.updateInterview(completed);
      await writeAudits(this.auditSink, [
        createAuditEvent(nowIso, "hiring.interview.status_changed", "interview", completed.id, input.interviewerUserId, {
          previousStatus: interview.status,
          nextStatus: completed.status
        })
      ]);
    }

    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.interview_feedback.submitted", "interview_feedback", feedback.id, input.interviewerUserId, {
        interviewId: feedback.interviewId,
        recommendation: feedback.recommendation,
        rating: feedback.rating ?? null
      })
    ]);

    return feedback;
  }

  async createJobOffer(input: CreateJobOfferInput): Promise<JobOfferRecord> {
    const application = this.requireApplication(input.jobApplicationId);
    const nowIso = this.now().toISOString();
    const status = input.status ?? "draft";
    const offer: JobOfferRecord = {
      id: this.idGenerator("job-offer"),
      jobApplicationId: application.id,
      status,
      offerDetails: input.offerDetails,
      sentAt: status === "sent" ? nowIso : null,
      respondedAt: null,
      createdByUserId: input.actorUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
      visibilityFlags: ["applicant"]
    };
    this.repository.createJobOffer(offer);
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.offer.created", "job_offer", offer.id, input.actorUserId, {
        status: offer.status
      })
    ]);

    if (offer.status === "sent" && application.status !== "offer_pending") {
      await this.updateApplicationStatus({
        jobApplicationId: application.id,
        actorUserId: input.actorUserId,
        nextStatus: "offer_pending"
      });
    }

    return offer;
  }

  async updateJobOfferStatus(input: UpdateJobOfferStatusInput): Promise<JobOfferRecord> {
    const offer = this.requireOffer(input.jobOfferId);
    ensureOfferStatusTransition(offer.status, input.nextStatus);
    const application = this.requireApplication(offer.jobApplicationId);
    const profile = this.requireApplicantProfile(application.applicantProfileId);
    const nowIso = this.now().toISOString();
    const updated: JobOfferRecord = {
      ...offer,
      status: input.nextStatus,
      offerDetails: input.offerDetails ?? offer.offerDetails,
      sentAt: input.nextStatus === "sent" ? offer.sentAt ?? nowIso : offer.sentAt,
      respondedAt:
        input.nextStatus === "accepted" || input.nextStatus === "declined" ? nowIso : offer.respondedAt,
      updatedAt: nowIso
    };
    this.repository.updateJobOffer(updated);
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.offer.status_changed", "job_offer", updated.id, input.actorUserId, {
        previousStatus: offer.status,
        nextStatus: updated.status
      })
    ]);

    if (updated.status === "sent" && application.status !== "offer_pending") {
      await this.updateApplicationStatus({
        jobApplicationId: application.id,
        actorUserId: input.actorUserId,
        nextStatus: "offer_pending"
      });
      await notify(this.notifications, {
        organizationId: application.organizationId,
        type: "hiring.offer.sent",
        title: "Offer available",
        body: "A hiring offer has been sent to your applicant portal.",
        tone: "success",
        audience: profile.userId
          ? {
              type: "user",
              userId: profile.userId
            }
          : {
              type: "email",
              email: profile.email
            },
        resourceType: "job_offer",
        resourceId: updated.id,
        dedupeKey: `hiring-offer-sent:${updated.id}`
      });
    }

    if (updated.status === "accepted" && application.status !== "offer_accepted") {
      await this.updateApplicationStatus({
        jobApplicationId: application.id,
        actorUserId: input.actorUserId,
        nextStatus: "offer_accepted"
      });
      await this.ensureOnboardingChecklistForApplication(application, profile, input.actorUserId);
    }

    return updated;
  }

  async convertApplicantToEmployee(input: ConvertApplicantToEmployeeInput): Promise<{
    application: JobApplicationRecord;
    employee: EmployeeRecord;
    onboardingChecklist: OnboardingChecklistRecord;
  }> {
    const application = this.requireApplication(input.jobApplicationId);

    if (application.status !== "offer_accepted") {
      throw new HiringTransitionError(
        `Only offer_accepted applications can be converted. Current status: ${application.status}.`
      );
    }

    const profile = this.requireApplicantProfile(application.applicantProfileId);
    const existingEmployee = this.repository.getEmployeeBySourceApplicationId(application.id);
    const nowIso = this.now().toISOString();
    const employee: EmployeeRecord = existingEmployee
      ? {
          ...existingEmployee,
          userId: input.employeeUserId ?? existingEmployee.userId,
          updatedAt: nowIso
        }
      : {
      id: this.idGenerator("employee"),
      organizationId: application.organizationId,
      userId: input.employeeUserId ?? profile.userId ?? `${profile.email}:employee`,
      applicantProfileId: profile.id,
      sourceApplicationId: application.id,
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (existingEmployee) {
      this.repository.updateEmployee(employee);
    } else {
      this.repository.createEmployee(employee);
    }

    const convertedApplication: JobApplicationRecord = {
      ...application,
      status: "converted_to_employee",
      convertedEmployeeId: employee.id,
      reviewedByUserId: input.actorUserId,
      updatedAt: nowIso
    };
    this.repository.updateJobApplication(convertedApplication);
    await this.recordApplicationStatusChange({
      application: convertedApplication,
      previousStatus: application.status,
      nextStatus: "converted_to_employee",
      actorUserId: input.actorUserId
    });
    const checklist = await this.ensureOnboardingChecklistForApplication(convertedApplication, profile, input.actorUserId);
    this.repository.updateOnboardingChecklist({
      ...checklist,
      employeeId: employee.id,
      status: checklist.status === "not_started" ? "in_progress" : checklist.status,
      updatedAt: nowIso
    });
    await writeAudits(this.auditSink, [
      createAuditEvent(nowIso, "hiring.applicant.converted", "job_application", convertedApplication.id, input.actorUserId, {
        employeeId: employee.id,
        applicantProfileId: profile.id,
        assignedRole: "employee"
      })
    ]);

    return {
      application: convertedApplication,
      employee,
      onboardingChecklist: {
        ...checklist,
        employeeId: employee.id,
        status: checklist.status === "not_started" ? "in_progress" : checklist.status,
        updatedAt: nowIso
      }
    };
  }
}
