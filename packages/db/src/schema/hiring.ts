export interface JobPostingRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string;
  compensation_range: string | null;
  screening_questions: unknown[];
  status: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface ApplicantProfileRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface JobApplicationRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  job_posting_id: string;
  applicant_profile_id: string;
  status: string;
  cover_letter: string | null;
  screening_answers: Record<string, unknown>;
  consent_granted: boolean;
  submitted_at: string | null;
  reviewed_by_user_id: string | null;
  withdrawn_at: string | null;
  converted_employee_id: string | null;
  visibility_flags: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface ApplicantDocumentRow {
  id: string;
  tenant_id: string;
  applicant_profile_id: string;
  job_application_id: string | null;
  document_type: string;
  storage_key: string;
  file_name: string;
  content_type: string;
  byte_size: string;
  visibility_flags: string[];
  uploaded_at: string;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface ApplicantStatusHistoryRow {
  id: string;
  job_application_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_user_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface HiringInternalNoteRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  job_application_id: string;
  author_user_id: string | null;
  note: string;
  visibility_flags: string[];
  created_at: string;
  archived_at: string | null;
  archived_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface InterviewRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  job_application_id: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  location_or_meeting_url: string;
  interview_type: string;
  status: string;
  applicant_response: string | null;
  created_by_user_id: string | null;
  visibility_flags: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface InterviewAssignmentRow {
  interview_id: string;
  interviewer_user_id: string;
  created_at: string;
}

export interface InterviewFeedbackRow {
  id: string;
  interview_id: string;
  interviewer_user_id: string;
  rating: number | null;
  feedback: string;
  recommendation: string;
  created_at: string;
  updated_at: string;
}

export interface JobOfferRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  job_application_id: string;
  status: string;
  offer_details: Record<string, unknown>;
  sent_at: string | null;
  responded_at: string | null;
  created_by_user_id: string | null;
  visibility_flags: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface OnboardingChecklistRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  applicant_profile_id: string | null;
  employee_id: string | null;
  source_application_id: string;
  status: string;
  visibility_flags: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  retention_locked: boolean;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface OnboardingTaskRow {
  id: string;
  onboarding_checklist_id: string;
  title: string;
  description: string | null;
  assigned_to_user_id: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const HIRING_TABLES = [
  "job_postings",
  "applicant_profiles",
  "job_applications",
  "applicant_documents",
  "applicant_status_history",
  "hiring_internal_notes",
  "interviews",
  "interview_assignments",
  "interview_feedback",
  "job_offers",
  "onboarding_checklists",
  "onboarding_tasks"
] as const;
