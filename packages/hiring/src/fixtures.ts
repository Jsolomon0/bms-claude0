import type {
  ApplicantDocumentRecord,
  ApplicantProfileRecord,
  ApplicantStatusHistoryRecord,
  EmployeeRecord,
  HiringInternalNoteRecord,
  InterviewFeedbackRecord,
  InterviewRecord,
  JobApplicationRecord,
  JobOfferRecord,
  JobPostingRecord,
  OnboardingChecklistRecord,
  OnboardingTaskRecord
} from "../../types/src/index.ts";

export const DEMO_JOB_POSTINGS: readonly JobPostingRecord[] = [
  {
    id: "job-posting-demo-1",
    organizationId: "org-hq",
    title: "Field Project Coordinator",
    department: "Operations",
    location: "Boston, MA",
    employmentType: "full_time",
    description: "Coordinate field schedules, subcontractor sequencing, and daily reporting for active projects.",
    requirements: "2+ years of field coordination, scheduling literacy, and strong communication.",
    compensationRange: "$58k - $72k",
    status: "published",
    screeningQuestions: [
      {
        id: "screening-question-1",
        prompt: "Describe your experience coordinating field teams or subcontractors.",
        required: true
      },
      {
        id: "screening-question-2",
        prompt: "What scheduling or reporting tools have you used?",
        required: true
      }
    ],
    createdByUserId: "alex.owner",
    updatedByUserId: "alex.owner",
    createdAt: "2026-04-10T09:00:00.000Z",
    updatedAt: "2026-04-18T11:30:00.000Z"
  },
  {
    id: "job-posting-demo-2",
    organizationId: "org-hq",
    title: "Assistant Estimator",
    department: "Preconstruction",
    location: "Providence, RI",
    employmentType: "full_time",
    description: "Support takeoffs, bid assembly, and vendor quote comparison across remodel and tenant-fit-out projects.",
    requirements: "Construction admin or estimating support experience preferred.",
    status: "draft",
    screeningQuestions: [],
    createdByUserId: "alex.owner",
    updatedByUserId: "alex.owner",
    createdAt: "2026-04-22T13:00:00.000Z",
    updatedAt: "2026-04-22T13:00:00.000Z"
  },
  {
    id: "job-posting-demo-3",
    organizationId: "org-hq",
    title: "Office Manager",
    department: "Administration",
    location: "Hybrid",
    employmentType: "part_time",
    description: "Back-office coordination and vendor paperwork support.",
    requirements: "Office operations and bookkeeping support experience.",
    status: "archived",
    screeningQuestions: [],
    createdByUserId: "alex.owner",
    updatedByUserId: "alex.owner",
    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-25T08:00:00.000Z"
  }
] as const;

export const DEMO_APPLICANT_PROFILES: readonly ApplicantProfileRecord[] = [
  {
    id: "applicant-profile-demo-1",
    userId: "applicant.jules",
    firstName: "Jules",
    lastName: "Harper",
    email: "jules.harper@example.com",
    phone: "617-555-0100",
    portfolioUrl: "https://portfolio.example.com/jules",
    linkedinUrl: "https://linkedin.example.com/in/julesharper",
    createdAt: "2026-04-15T09:00:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z"
  },
  {
    id: "applicant-profile-demo-2",
    userId: "applicant.other",
    firstName: "Morgan",
    lastName: "Lee",
    email: "morgan.lee@example.com",
    createdAt: "2026-04-25T09:00:00.000Z",
    updatedAt: "2026-04-27T09:30:00.000Z"
  },
  {
    id: "applicant-profile-demo-3",
    userId: "applicant.offer",
    firstName: "Taylor",
    lastName: "Nguyen",
    email: "taylor.nguyen@example.com",
    phone: "617-555-0199",
    linkedinUrl: "https://linkedin.example.com/in/taylornguyen",
    createdAt: "2026-04-05T08:30:00.000Z",
    updatedAt: "2026-04-21T16:00:00.000Z"
  }
] as const;

export const DEMO_JOB_APPLICATIONS: readonly JobApplicationRecord[] = [
  {
    id: "job-application-demo-1",
    organizationId: "org-hq",
    jobPostingId: "job-posting-demo-1",
    applicantProfileId: "applicant-profile-demo-1",
    status: "interview_scheduled",
    coverLetter: "I have coordinated renovation crews and schedule handoffs across active job sites.",
    screeningAnswers: {
      "screening-question-1": "I coordinated punch-list and subcontractor schedules for a regional GC.",
      "screening-question-2": "I have used Procore, Buildertrend, and Excel reporting."
    },
    consentGranted: true,
    submittedAt: "2026-04-20T12:00:00.000Z",
    reviewedByUserId: "alex.owner",
    createdAt: "2026-04-20T11:45:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z",
    visibilityFlags: ["applicant"]
  },
  {
    id: "job-application-demo-2",
    organizationId: "org-hq",
    jobPostingId: "job-posting-demo-1",
    applicantProfileId: "applicant-profile-demo-2",
    status: "submitted",
    screeningAnswers: {
      "screening-question-1": "I have coordinated service calls but not large-scale field teams.",
      "screening-question-2": "Mostly spreadsheets and email checklists."
    },
    consentGranted: true,
    submittedAt: "2026-04-27T09:30:00.000Z",
    createdAt: "2026-04-27T09:10:00.000Z",
    updatedAt: "2026-04-27T09:30:00.000Z",
    visibilityFlags: ["applicant"]
  },
  {
    id: "job-application-demo-3",
    organizationId: "org-hq",
    jobPostingId: "job-posting-demo-1",
    applicantProfileId: "applicant-profile-demo-3",
    status: "offer_accepted",
    coverLetter: "I have run small commercial renovation teams and enjoy process-heavy coordination work.",
    screeningAnswers: {
      "screening-question-1": "I coordinated field teams on tenant-fit-out projects for two years.",
      "screening-question-2": "I used Procore and shared scheduling boards."
    },
    consentGranted: true,
    submittedAt: "2026-04-08T09:30:00.000Z",
    reviewedByUserId: "alex.owner",
    createdAt: "2026-04-08T09:00:00.000Z",
    updatedAt: "2026-04-22T15:30:00.000Z",
    visibilityFlags: ["applicant"]
  }
] as const;

export const DEMO_APPLICANT_DOCUMENTS: readonly ApplicantDocumentRecord[] = [
  {
    id: "applicant-document-demo-1",
    applicantProfileId: "applicant-profile-demo-1",
    jobApplicationId: "job-application-demo-1",
    documentType: "resume",
    storageKey: "hiring/applicant-profile-demo-1/resume.pdf",
    fileName: "jules-harper-resume.pdf",
    contentType: "application/pdf",
    byteSize: 220_000,
    visibilityFlags: ["applicant"],
    uploadedAt: "2026-04-20T11:46:00.000Z"
  },
  {
    id: "applicant-document-demo-2",
    applicantProfileId: "applicant-profile-demo-2",
    jobApplicationId: "job-application-demo-2",
    documentType: "resume",
    storageKey: "hiring/applicant-profile-demo-2/resume.pdf",
    fileName: "morgan-lee-resume.pdf",
    contentType: "application/pdf",
    byteSize: 180_000,
    visibilityFlags: ["applicant"],
    uploadedAt: "2026-04-27T09:11:00.000Z"
  },
  {
    id: "applicant-document-demo-3",
    applicantProfileId: "applicant-profile-demo-3",
    jobApplicationId: "job-application-demo-3",
    documentType: "resume",
    storageKey: "hiring/applicant-profile-demo-3/resume.pdf",
    fileName: "taylor-nguyen-resume.pdf",
    contentType: "application/pdf",
    byteSize: 245_000,
    visibilityFlags: ["applicant"],
    uploadedAt: "2026-04-08T09:01:00.000Z"
  }
] as const;

export const DEMO_APPLICANT_STATUS_HISTORY: readonly ApplicantStatusHistoryRecord[] = [
  {
    id: "application-history-demo-1",
    jobApplicationId: "job-application-demo-1",
    previousStatus: null,
    newStatus: "submitted",
    changedByUserId: "applicant.jules",
    createdAt: "2026-04-20T12:00:00.000Z"
  },
  {
    id: "application-history-demo-2",
    jobApplicationId: "job-application-demo-1",
    previousStatus: "submitted",
    newStatus: "under_review",
    changedByUserId: "alex.owner",
    createdAt: "2026-04-22T09:00:00.000Z"
  },
  {
    id: "application-history-demo-3",
    jobApplicationId: "job-application-demo-1",
    previousStatus: "under_review",
    newStatus: "interview_requested",
    changedByUserId: "alex.owner",
    createdAt: "2026-04-24T14:00:00.000Z"
  },
  {
    id: "application-history-demo-4",
    jobApplicationId: "job-application-demo-1",
    previousStatus: "interview_requested",
    newStatus: "interview_scheduled",
    changedByUserId: "alex.owner",
    createdAt: "2026-04-26T10:00:00.000Z"
  },
  {
    id: "application-history-demo-5",
    jobApplicationId: "job-application-demo-3",
    previousStatus: null,
    newStatus: "submitted",
    changedByUserId: "applicant.offer",
    createdAt: "2026-04-08T09:30:00.000Z"
  },
  {
    id: "application-history-demo-6",
    jobApplicationId: "job-application-demo-3",
    previousStatus: "submitted",
    newStatus: "under_review",
    changedByUserId: "alex.owner",
    createdAt: "2026-04-10T10:00:00.000Z"
  },
  {
    id: "application-history-demo-7",
    jobApplicationId: "job-application-demo-3",
    previousStatus: "under_review",
    newStatus: "interview_scheduled",
    changedByUserId: "alex.owner",
    createdAt: "2026-04-12T10:00:00.000Z"
  },
  {
    id: "application-history-demo-8",
    jobApplicationId: "job-application-demo-3",
    previousStatus: "interview_scheduled",
    newStatus: "offer_pending",
    changedByUserId: "alex.owner",
    createdAt: "2026-04-18T11:00:00.000Z"
  },
  {
    id: "application-history-demo-9",
    jobApplicationId: "job-application-demo-3",
    previousStatus: "offer_pending",
    newStatus: "offer_accepted",
    changedByUserId: "applicant.offer",
    createdAt: "2026-04-22T15:30:00.000Z"
  }
] as const;

export const DEMO_HIRING_INTERNAL_NOTES: readonly HiringInternalNoteRecord[] = [
  {
    id: "hiring-note-demo-1",
    jobApplicationId: "job-application-demo-1",
    authorUserId: "alex.owner",
    note: "Strong scheduling background. Verify field-reporting examples during the first interview.",
    visibilityFlags: ["internal"],
    createdAt: "2026-04-22T09:15:00.000Z"
  },
  {
    id: "hiring-note-demo-2",
    jobApplicationId: "job-application-demo-3",
    authorUserId: "alex.owner",
    note: "Candidate accepted verbal range. Move onboarding checklist into progress.",
    visibilityFlags: ["internal"],
    createdAt: "2026-04-22T16:00:00.000Z"
  }
] as const;

export const DEMO_INTERVIEWS: readonly InterviewRecord[] = [
  {
    id: "interview-demo-1",
    jobApplicationId: "job-application-demo-1",
    scheduledStart: "2026-05-01T14:00:00.000Z",
    scheduledEnd: "2026-05-01T14:45:00.000Z",
    locationOrMeetingUrl: "https://meet.example.com/jules-screen",
    interviewType: "virtual",
    status: "scheduled",
    interviewerUserIds: ["employee-1"],
    applicantResponse: "accepted",
    createdByUserId: "alex.owner",
    createdAt: "2026-04-26T10:00:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z",
    visibilityFlags: ["applicant"]
  },
  {
    id: "interview-demo-2",
    jobApplicationId: "job-application-demo-3",
    scheduledStart: "2026-04-15T15:00:00.000Z",
    scheduledEnd: "2026-04-15T15:45:00.000Z",
    locationOrMeetingUrl: "Conference Room A",
    interviewType: "in_person",
    status: "completed",
    interviewerUserIds: ["employee-2"],
    applicantResponse: "accepted",
    createdByUserId: "alex.owner",
    createdAt: "2026-04-12T10:00:00.000Z",
    updatedAt: "2026-04-15T16:00:00.000Z",
    visibilityFlags: ["applicant"]
  }
] as const;

export const DEMO_INTERVIEW_FEEDBACK: readonly InterviewFeedbackRecord[] = [
  {
    id: "interview-feedback-demo-1",
    interviewId: "interview-demo-2",
    interviewerUserId: "employee-2",
    rating: 5,
    feedback: "Clear communicator, strong site coordination examples, and solid follow-through.",
    recommendation: "proceed",
    createdAt: "2026-04-15T16:15:00.000Z",
    updatedAt: "2026-04-15T16:15:00.000Z"
  }
] as const;

export const DEMO_JOB_OFFERS: readonly JobOfferRecord[] = [
  {
    id: "job-offer-demo-1",
    jobApplicationId: "job-application-demo-3",
    status: "accepted",
    offerDetails: {
      annualSalary: 71000,
      startDate: "2026-05-12",
      supervisor: "alex.owner"
    },
    sentAt: "2026-04-20T09:00:00.000Z",
    respondedAt: "2026-04-22T15:30:00.000Z",
    createdByUserId: "alex.owner",
    createdAt: "2026-04-19T15:00:00.000Z",
    updatedAt: "2026-04-22T15:30:00.000Z",
    visibilityFlags: ["applicant"]
  }
] as const;

export const DEMO_ONBOARDING_CHECKLISTS: readonly OnboardingChecklistRecord[] = [
  {
    id: "onboarding-checklist-demo-1",
    applicantProfileId: "applicant-profile-demo-3",
    employeeId: null,
    sourceApplicationId: "job-application-demo-3",
    status: "in_progress",
    createdAt: "2026-04-22T16:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z",
    visibilityFlags: ["applicant"]
  }
] as const;

export const DEMO_ONBOARDING_TASKS: readonly OnboardingTaskRecord[] = [
  {
    id: "onboarding-task-demo-1",
    onboardingChecklistId: "onboarding-checklist-demo-1",
    title: "Upload ID verification",
    description: "Government-issued ID required before first day paperwork.",
    assignedToUserId: "applicant.offer",
    dueDate: "2026-05-05",
    status: "pending",
    createdAt: "2026-04-22T16:05:00.000Z",
    updatedAt: "2026-04-22T16:05:00.000Z"
  },
  {
    id: "onboarding-task-demo-2",
    onboardingChecklistId: "onboarding-checklist-demo-1",
    title: "Schedule orientation",
    description: "HR scheduling placeholder for first-week orientation.",
    assignedToUserId: "alex.owner",
    dueDate: "2026-05-08",
    status: "pending",
    createdAt: "2026-04-22T16:06:00.000Z",
    updatedAt: "2026-04-22T16:06:00.000Z"
  }
] as const;

export const DEMO_HIRING_EMPLOYEES: readonly EmployeeRecord[] = [] as const;
