import { type VisibilityFlag } from "./authz.ts";

export const JOB_POSTING_STATUSES = ["draft", "published", "archived"] as const;

export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "temporary", "internship"] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const JOB_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "interview_requested",
  "interview_scheduled",
  "offer_pending",
  "offer_accepted",
  "rejected",
  "withdrawn",
  "converted_to_employee"
] as const;

export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

export const APPLICANT_DOCUMENT_TYPES = [
  "resume",
  "cover_letter",
  "portfolio",
  "certification",
  "other"
] as const;

export type ApplicantDocumentType = (typeof APPLICANT_DOCUMENT_TYPES)[number];

export const INTERVIEW_TYPES = ["phone", "virtual", "in_person"] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = ["requested", "scheduled", "completed", "cancelled", "no_show"] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_FEEDBACK_RECOMMENDATIONS = ["proceed", "reject", "hold"] as const;

export type InterviewFeedbackRecommendation = (typeof INTERVIEW_FEEDBACK_RECOMMENDATIONS)[number];

export const JOB_OFFER_STATUSES = ["draft", "sent", "accepted", "declined", "withdrawn"] as const;

export type JobOfferStatus = (typeof JOB_OFFER_STATUSES)[number];

export const ONBOARDING_CHECKLIST_STATUSES = ["not_started", "in_progress", "completed"] as const;

export type OnboardingChecklistStatus = (typeof ONBOARDING_CHECKLIST_STATUSES)[number];

export const ONBOARDING_TASK_STATUSES = ["pending", "completed", "skipped"] as const;

export type OnboardingTaskStatus = (typeof ONBOARDING_TASK_STATUSES)[number];

export interface HiringValidationIssue {
  field: string;
  message: string;
}

export interface HiringScreeningQuestion {
  id: string;
  prompt: string;
  required: boolean;
}

export interface JobPostingRecord {
  id: string;
  organizationId: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  description: string;
  requirements: string;
  compensationRange?: string;
  status: JobPostingStatus;
  screeningQuestions: readonly HiringScreeningQuestion[];
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicantProfileRecord {
  id: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicationRecord {
  id: string;
  organizationId: string;
  jobPostingId: string;
  applicantProfileId: string;
  status: JobApplicationStatus;
  coverLetter?: string;
  screeningAnswers: Record<string, string>;
  consentGranted: boolean;
  submittedAt?: string | null;
  reviewedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  withdrawnAt?: string | null;
  convertedEmployeeId?: string | null;
  visibilityFlags: readonly VisibilityFlag[];
}

export interface ApplicantDocumentRecord {
  id: string;
  applicantProfileId: string;
  jobApplicationId?: string | null;
  documentType: ApplicantDocumentType;
  storageKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  visibilityFlags: readonly VisibilityFlag[];
  uploadedAt: string;
}

export interface ApplicantStatusHistoryRecord {
  id: string;
  jobApplicationId: string;
  previousStatus?: JobApplicationStatus | null;
  newStatus: JobApplicationStatus;
  changedByUserId: string;
  reason?: string;
  createdAt: string;
}

export interface HiringInternalNoteRecord {
  id: string;
  jobApplicationId: string;
  authorUserId: string;
  note: string;
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
}

export interface InterviewRecord {
  id: string;
  jobApplicationId: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  locationOrMeetingUrl: string;
  interviewType: InterviewType;
  status: InterviewStatus;
  interviewerUserIds: readonly string[];
  applicantResponse?: "accepted" | "declined" | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  visibilityFlags: readonly VisibilityFlag[];
}

export interface InterviewFeedbackRecord {
  id: string;
  interviewId: string;
  interviewerUserId: string;
  rating?: number;
  feedback: string;
  recommendation: InterviewFeedbackRecommendation;
  createdAt: string;
  updatedAt: string;
}

export interface JobOfferRecord {
  id: string;
  jobApplicationId: string;
  status: JobOfferStatus;
  offerDetails: Record<string, unknown>;
  sentAt?: string | null;
  respondedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  visibilityFlags: readonly VisibilityFlag[];
}

export interface OnboardingChecklistRecord {
  id: string;
  applicantProfileId?: string | null;
  employeeId?: string | null;
  sourceApplicationId: string;
  status: OnboardingChecklistStatus;
  createdAt: string;
  updatedAt: string;
  visibilityFlags: readonly VisibilityFlag[];
}

export interface OnboardingTaskRecord {
  id: string;
  onboardingChecklistId: string;
  title: string;
  description?: string;
  assignedToUserId?: string | null;
  dueDate?: string | null;
  status: OnboardingTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRecord {
  id: string;
  organizationId: string;
  userId: string;
  applicantProfileId?: string | null;
  sourceApplicationId?: string | null;
  status: "invited" | "active";
  createdAt: string;
  updatedAt: string;
}

export interface HiringModuleDetail {
  jobPosting?: JobPostingRecord;
  applications: readonly JobApplicationRecord[];
  documents: readonly ApplicantDocumentRecord[];
  statusHistory: readonly ApplicantStatusHistoryRecord[];
  internalNotes: readonly HiringInternalNoteRecord[];
  interviews: readonly InterviewRecord[];
  interviewFeedback: readonly InterviewFeedbackRecord[];
  offers: readonly JobOfferRecord[];
  onboardingChecklist?: OnboardingChecklistRecord;
  onboardingTasks: readonly OnboardingTaskRecord[];
}

export interface HiringRepository {
  createJobPosting(record: JobPostingRecord): void;
  updateJobPosting(record: JobPostingRecord): void;
  getJobPostingById(jobPostingId: string): JobPostingRecord | undefined;
  listJobPostings(): readonly JobPostingRecord[];
  createApplicantProfile(record: ApplicantProfileRecord): void;
  updateApplicantProfile(record: ApplicantProfileRecord): void;
  getApplicantProfileById(applicantProfileId: string): ApplicantProfileRecord | undefined;
  getApplicantProfileByUserId(userId: string): ApplicantProfileRecord | undefined;
  getApplicantProfileByEmail(email: string): ApplicantProfileRecord | undefined;
  listApplicantProfiles(): readonly ApplicantProfileRecord[];
  createJobApplication(record: JobApplicationRecord): void;
  updateJobApplication(record: JobApplicationRecord): void;
  getJobApplicationById(jobApplicationId: string): JobApplicationRecord | undefined;
  listJobApplications(): readonly JobApplicationRecord[];
  listJobApplicationsByJobPostingId(jobPostingId: string): readonly JobApplicationRecord[];
  listJobApplicationsByApplicantProfileId(applicantProfileId: string): readonly JobApplicationRecord[];
  createApplicantDocument(record: ApplicantDocumentRecord): void;
  getApplicantDocumentById(applicantDocumentId: string): ApplicantDocumentRecord | undefined;
  deleteApplicantDocument(applicantDocumentId: string): void;
  listApplicantDocumentsByApplicationId(jobApplicationId: string): readonly ApplicantDocumentRecord[];
  listApplicantDocumentsByApplicantProfileId(applicantProfileId: string): readonly ApplicantDocumentRecord[];
  createStatusHistory(record: ApplicantStatusHistoryRecord): void;
  listStatusHistoryByApplicationId(jobApplicationId: string): readonly ApplicantStatusHistoryRecord[];
  createInternalNote(record: HiringInternalNoteRecord): void;
  listInternalNotesByApplicationId(jobApplicationId: string): readonly HiringInternalNoteRecord[];
  createInterview(record: InterviewRecord): void;
  updateInterview(record: InterviewRecord): void;
  getInterviewById(interviewId: string): InterviewRecord | undefined;
  listInterviewsByApplicationId(jobApplicationId: string): readonly InterviewRecord[];
  createInterviewFeedback(record: InterviewFeedbackRecord): void;
  updateInterviewFeedback(record: InterviewFeedbackRecord): void;
  listInterviewFeedbackByInterviewId(interviewId: string): readonly InterviewFeedbackRecord[];
  createJobOffer(record: JobOfferRecord): void;
  updateJobOffer(record: JobOfferRecord): void;
  getJobOfferById(jobOfferId: string): JobOfferRecord | undefined;
  listJobOffersByApplicationId(jobApplicationId: string): readonly JobOfferRecord[];
  createOnboardingChecklist(record: OnboardingChecklistRecord): void;
  updateOnboardingChecklist(record: OnboardingChecklistRecord): void;
  getOnboardingChecklistBySourceApplicationId(sourceApplicationId: string): OnboardingChecklistRecord | undefined;
  createOnboardingTask(record: OnboardingTaskRecord): void;
  updateOnboardingTask(record: OnboardingTaskRecord): void;
  listOnboardingTasksByChecklistId(onboardingChecklistId: string): readonly OnboardingTaskRecord[];
  createEmployee(record: EmployeeRecord): void;
  updateEmployee(record: EmployeeRecord): void;
  getEmployeeById(employeeId: string): EmployeeRecord | undefined;
  getEmployeeBySourceApplicationId(sourceApplicationId: string): EmployeeRecord | undefined;
  listEmployees(): readonly EmployeeRecord[];
}
