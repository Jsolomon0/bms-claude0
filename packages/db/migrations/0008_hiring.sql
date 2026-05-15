ALTER TYPE visibility_flag_enum ADD VALUE IF NOT EXISTS 'applicant';

CREATE TYPE job_posting_status_enum AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE employment_type_enum AS ENUM (
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'internship'
);

CREATE TYPE job_application_status_enum AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'interview_requested',
  'interview_scheduled',
  'offer_pending',
  'offer_accepted',
  'rejected',
  'withdrawn',
  'converted_to_employee'
);

CREATE TYPE applicant_document_type_enum AS ENUM (
  'resume',
  'cover_letter',
  'portfolio',
  'certification',
  'other'
);

CREATE TYPE interview_type_enum AS ENUM (
  'phone',
  'virtual',
  'in_person'
);

CREATE TYPE interview_status_enum AS ENUM (
  'requested',
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE interview_feedback_recommendation_enum AS ENUM (
  'proceed',
  'reject',
  'hold'
);

CREATE TYPE job_offer_status_enum AS ENUM (
  'draft',
  'sent',
  'accepted',
  'declined',
  'withdrawn'
);

CREATE TYPE onboarding_checklist_status_enum AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);

CREATE TYPE onboarding_task_status_enum AS ENUM (
  'pending',
  'completed',
  'skipped'
);

CREATE TABLE job_postings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  employment_type employment_type_enum NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  compensation_range TEXT,
  screening_questions JSONB NOT NULL DEFAULT '[]'::JSONB,
  status job_posting_status_enum NOT NULL DEFAULT 'draft',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_job_postings_org_status
  ON job_postings (organization_id, status, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_job_postings_tenant_department
  ON job_postings (tenant_id, department, status)
  WHERE deleted_at IS NULL;

CREATE TABLE applicant_profiles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_applicant_profiles_tenant_email_active
  ON applicant_profiles (tenant_id, LOWER(email))
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_applicant_profiles_user_active
  ON applicant_profiles (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE job_applications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE RESTRICT,
  applicant_profile_id UUID NOT NULL REFERENCES applicant_profiles(id) ON DELETE RESTRICT,
  status job_application_status_enum NOT NULL DEFAULT 'draft',
  cover_letter TEXT,
  screening_answers JSONB NOT NULL DEFAULT '{}'::JSONB,
  consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  withdrawn_at TIMESTAMPTZ,
  converted_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['applicant']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_job_applications_posting_status
  ON job_applications (job_posting_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_job_applications_profile_status
  ON job_applications (applicant_profile_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_job_applications_org_status
  ON job_applications (organization_id, status, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE applicant_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  applicant_profile_id UUID NOT NULL REFERENCES applicant_profiles(id) ON DELETE RESTRICT,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  document_type applicant_document_type_enum NOT NULL,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['applicant']::visibility_flag_enum[],
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_applicant_documents_profile_uploaded_at
  ON applicant_documents (applicant_profile_id, uploaded_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_applicant_documents_application_uploaded_at
  ON applicant_documents (job_application_id, uploaded_at DESC)
  WHERE job_application_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE applicant_status_history (
  id UUID PRIMARY KEY,
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  previous_status job_application_status_enum,
  new_status job_application_status_enum NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applicant_status_history_application_created_at
  ON applicant_status_history (job_application_id, created_at DESC);

CREATE TABLE hiring_internal_notes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_hiring_internal_notes_application_created_at
  ON hiring_internal_notes (job_application_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE interviews (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  location_or_meeting_url TEXT NOT NULL,
  interview_type interview_type_enum NOT NULL,
  status interview_status_enum NOT NULL DEFAULT 'requested',
  applicant_response TEXT CHECK (applicant_response IN ('accepted', 'declined') OR applicant_response IS NULL),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['applicant']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end > scheduled_start)
);

CREATE INDEX idx_interviews_application_status
  ON interviews (job_application_id, status, scheduled_start)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_interviews_org_status
  ON interviews (organization_id, status, scheduled_start)
  WHERE deleted_at IS NULL;

CREATE TABLE interview_assignments (
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (interview_id, interviewer_user_id)
);

CREATE INDEX idx_interview_assignments_interviewer_user_id
  ON interview_assignments (interviewer_user_id, interview_id);

CREATE TABLE interview_feedback (
  id UUID PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  feedback TEXT NOT NULL,
  recommendation interview_feedback_recommendation_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_interview_feedback_interview_user
  ON interview_feedback (interview_id, interviewer_user_id);

CREATE TABLE job_offers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  status job_offer_status_enum NOT NULL DEFAULT 'draft',
  offer_details JSONB NOT NULL DEFAULT '{}'::JSONB,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['applicant']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_job_offers_application_status
  ON job_offers (job_application_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE onboarding_checklists (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  applicant_profile_id UUID REFERENCES applicant_profiles(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  source_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE RESTRICT,
  status onboarding_checklist_status_enum NOT NULL DEFAULT 'not_started',
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['applicant']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (applicant_profile_id IS NOT NULL OR employee_id IS NOT NULL)
);

CREATE UNIQUE INDEX uq_onboarding_checklists_source_application_active
  ON onboarding_checklists (source_application_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_onboarding_checklists_employee_id
  ON onboarding_checklists (employee_id)
  WHERE employee_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE onboarding_tasks (
  id UUID PRIMARY KEY,
  onboarding_checklist_id UUID NOT NULL REFERENCES onboarding_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  status onboarding_task_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onboarding_tasks_checklist_status
  ON onboarding_tasks (onboarding_checklist_id, status, due_date);
