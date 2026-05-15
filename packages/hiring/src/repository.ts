import type {
  ApplicantDocumentRecord,
  ApplicantProfileRecord,
  ApplicantStatusHistoryRecord,
  EmployeeRecord,
  HiringInternalNoteRecord,
  HiringRepository,
  InterviewFeedbackRecord,
  InterviewRecord,
  JobApplicationRecord,
  JobOfferRecord,
  JobPostingRecord,
  OnboardingChecklistRecord,
  OnboardingTaskRecord
} from "../../types/src/index.ts";

export class InMemoryHiringRepository implements HiringRepository {
  private readonly jobPostings = new Map<string, JobPostingRecord>();
  private readonly applicantProfiles = new Map<string, ApplicantProfileRecord>();
  private readonly jobApplications = new Map<string, JobApplicationRecord>();
  private readonly applicantDocuments = new Map<string, ApplicantDocumentRecord>();
  private readonly applicantStatusHistory = new Map<string, ApplicantStatusHistoryRecord>();
  private readonly internalNotes = new Map<string, HiringInternalNoteRecord>();
  private readonly interviews = new Map<string, InterviewRecord>();
  private readonly interviewFeedback = new Map<string, InterviewFeedbackRecord>();
  private readonly jobOffers = new Map<string, JobOfferRecord>();
  private readonly onboardingChecklists = new Map<string, OnboardingChecklistRecord>();
  private readonly onboardingTasks = new Map<string, OnboardingTaskRecord>();
  private readonly employees = new Map<string, EmployeeRecord>();

  constructor(seed?: {
    jobPostings?: readonly JobPostingRecord[];
    applicantProfiles?: readonly ApplicantProfileRecord[];
    jobApplications?: readonly JobApplicationRecord[];
    applicantDocuments?: readonly ApplicantDocumentRecord[];
    applicantStatusHistory?: readonly ApplicantStatusHistoryRecord[];
    internalNotes?: readonly HiringInternalNoteRecord[];
    interviews?: readonly InterviewRecord[];
    interviewFeedback?: readonly InterviewFeedbackRecord[];
    jobOffers?: readonly JobOfferRecord[];
    onboardingChecklists?: readonly OnboardingChecklistRecord[];
    onboardingTasks?: readonly OnboardingTaskRecord[];
    employees?: readonly EmployeeRecord[];
  }) {
    seed?.jobPostings?.forEach((record) => this.jobPostings.set(record.id, record));
    seed?.applicantProfiles?.forEach((record) => this.applicantProfiles.set(record.id, record));
    seed?.jobApplications?.forEach((record) => this.jobApplications.set(record.id, record));
    seed?.applicantDocuments?.forEach((record) => this.applicantDocuments.set(record.id, record));
    seed?.applicantStatusHistory?.forEach((record) => this.applicantStatusHistory.set(record.id, record));
    seed?.internalNotes?.forEach((record) => this.internalNotes.set(record.id, record));
    seed?.interviews?.forEach((record) => this.interviews.set(record.id, record));
    seed?.interviewFeedback?.forEach((record) => this.interviewFeedback.set(record.id, record));
    seed?.jobOffers?.forEach((record) => this.jobOffers.set(record.id, record));
    seed?.onboardingChecklists?.forEach((record) => this.onboardingChecklists.set(record.id, record));
    seed?.onboardingTasks?.forEach((record) => this.onboardingTasks.set(record.id, record));
    seed?.employees?.forEach((record) => this.employees.set(record.id, record));
  }

  createJobPosting(record: JobPostingRecord): void {
    this.jobPostings.set(record.id, record);
  }

  updateJobPosting(record: JobPostingRecord): void {
    this.jobPostings.set(record.id, record);
  }

  getJobPostingById(jobPostingId: string): JobPostingRecord | undefined {
    return this.jobPostings.get(jobPostingId);
  }

  listJobPostings(): readonly JobPostingRecord[] {
    return [...this.jobPostings.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createApplicantProfile(record: ApplicantProfileRecord): void {
    this.applicantProfiles.set(record.id, record);
  }

  updateApplicantProfile(record: ApplicantProfileRecord): void {
    this.applicantProfiles.set(record.id, record);
  }

  getApplicantProfileById(applicantProfileId: string): ApplicantProfileRecord | undefined {
    return this.applicantProfiles.get(applicantProfileId);
  }

  getApplicantProfileByUserId(userId: string): ApplicantProfileRecord | undefined {
    return [...this.applicantProfiles.values()].find((record) => record.userId === userId);
  }

  getApplicantProfileByEmail(email: string): ApplicantProfileRecord | undefined {
    return [...this.applicantProfiles.values()].find((record) => record.email.toLowerCase() === email.toLowerCase());
  }

  listApplicantProfiles(): readonly ApplicantProfileRecord[] {
    return [...this.applicantProfiles.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createJobApplication(record: JobApplicationRecord): void {
    this.jobApplications.set(record.id, record);
  }

  updateJobApplication(record: JobApplicationRecord): void {
    this.jobApplications.set(record.id, record);
  }

  getJobApplicationById(jobApplicationId: string): JobApplicationRecord | undefined {
    return this.jobApplications.get(jobApplicationId);
  }

  listJobApplications(): readonly JobApplicationRecord[] {
    return [...this.jobApplications.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  listJobApplicationsByJobPostingId(jobPostingId: string): readonly JobApplicationRecord[] {
    return this.listJobApplications().filter((record) => record.jobPostingId === jobPostingId);
  }

  listJobApplicationsByApplicantProfileId(applicantProfileId: string): readonly JobApplicationRecord[] {
    return this.listJobApplications().filter((record) => record.applicantProfileId === applicantProfileId);
  }

  createApplicantDocument(record: ApplicantDocumentRecord): void {
    this.applicantDocuments.set(record.id, record);
  }

  getApplicantDocumentById(applicantDocumentId: string): ApplicantDocumentRecord | undefined {
    return this.applicantDocuments.get(applicantDocumentId);
  }

  deleteApplicantDocument(applicantDocumentId: string): void {
    this.applicantDocuments.delete(applicantDocumentId);
  }

  listApplicantDocumentsByApplicationId(jobApplicationId: string): readonly ApplicantDocumentRecord[] {
    return [...this.applicantDocuments.values()]
      .filter((record) => record.jobApplicationId === jobApplicationId)
      .sort((left, right) => left.uploadedAt.localeCompare(right.uploadedAt));
  }

  listApplicantDocumentsByApplicantProfileId(applicantProfileId: string): readonly ApplicantDocumentRecord[] {
    return [...this.applicantDocuments.values()]
      .filter((record) => record.applicantProfileId === applicantProfileId)
      .sort((left, right) => left.uploadedAt.localeCompare(right.uploadedAt));
  }

  createStatusHistory(record: ApplicantStatusHistoryRecord): void {
    this.applicantStatusHistory.set(record.id, record);
  }

  listStatusHistoryByApplicationId(jobApplicationId: string): readonly ApplicantStatusHistoryRecord[] {
    return [...this.applicantStatusHistory.values()]
      .filter((record) => record.jobApplicationId === jobApplicationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createInternalNote(record: HiringInternalNoteRecord): void {
    this.internalNotes.set(record.id, record);
  }

  listInternalNotesByApplicationId(jobApplicationId: string): readonly HiringInternalNoteRecord[] {
    return [...this.internalNotes.values()]
      .filter((record) => record.jobApplicationId === jobApplicationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createInterview(record: InterviewRecord): void {
    this.interviews.set(record.id, record);
  }

  updateInterview(record: InterviewRecord): void {
    this.interviews.set(record.id, record);
  }

  getInterviewById(interviewId: string): InterviewRecord | undefined {
    return this.interviews.get(interviewId);
  }

  listInterviewsByApplicationId(jobApplicationId: string): readonly InterviewRecord[] {
    return [...this.interviews.values()]
      .filter((record) => record.jobApplicationId === jobApplicationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createInterviewFeedback(record: InterviewFeedbackRecord): void {
    this.interviewFeedback.set(record.id, record);
  }

  updateInterviewFeedback(record: InterviewFeedbackRecord): void {
    this.interviewFeedback.set(record.id, record);
  }

  listInterviewFeedbackByInterviewId(interviewId: string): readonly InterviewFeedbackRecord[] {
    return [...this.interviewFeedback.values()]
      .filter((record) => record.interviewId === interviewId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createJobOffer(record: JobOfferRecord): void {
    this.jobOffers.set(record.id, record);
  }

  updateJobOffer(record: JobOfferRecord): void {
    this.jobOffers.set(record.id, record);
  }

  getJobOfferById(jobOfferId: string): JobOfferRecord | undefined {
    return this.jobOffers.get(jobOfferId);
  }

  listJobOffersByApplicationId(jobApplicationId: string): readonly JobOfferRecord[] {
    return [...this.jobOffers.values()]
      .filter((record) => record.jobApplicationId === jobApplicationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createOnboardingChecklist(record: OnboardingChecklistRecord): void {
    this.onboardingChecklists.set(record.id, record);
  }

  updateOnboardingChecklist(record: OnboardingChecklistRecord): void {
    this.onboardingChecklists.set(record.id, record);
  }

  getOnboardingChecklistBySourceApplicationId(sourceApplicationId: string): OnboardingChecklistRecord | undefined {
    return [...this.onboardingChecklists.values()].find((record) => record.sourceApplicationId === sourceApplicationId);
  }

  createOnboardingTask(record: OnboardingTaskRecord): void {
    this.onboardingTasks.set(record.id, record);
  }

  updateOnboardingTask(record: OnboardingTaskRecord): void {
    this.onboardingTasks.set(record.id, record);
  }

  listOnboardingTasksByChecklistId(onboardingChecklistId: string): readonly OnboardingTaskRecord[] {
    return [...this.onboardingTasks.values()]
      .filter((record) => record.onboardingChecklistId === onboardingChecklistId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createEmployee(record: EmployeeRecord): void {
    this.employees.set(record.id, record);
  }

  updateEmployee(record: EmployeeRecord): void {
    this.employees.set(record.id, record);
  }

  getEmployeeById(employeeId: string): EmployeeRecord | undefined {
    return this.employees.get(employeeId);
  }

  getEmployeeBySourceApplicationId(sourceApplicationId: string): EmployeeRecord | undefined {
    return [...this.employees.values()].find((record) => record.sourceApplicationId === sourceApplicationId);
  }

  listEmployees(): readonly EmployeeRecord[] {
    return [...this.employees.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}
