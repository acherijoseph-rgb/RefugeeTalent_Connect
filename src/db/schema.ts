// src/db/schema.ts
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('refugee'), // refugee | employer | mentor | administrator
  passwordHash: text('password_hash'),
  headline: text('headline').default(''),
  bio: text('bio').default(''),
  countryOfOrigin: text('country_of_origin').default(''),
  hostCountry: text('host_country').default('Germany'),
  location: text('location').default(''),
  phone: text('phone').default(''),
  linkedinUrl: text('linkedin_url').default(''),
  skills: jsonb('skills').$type<string[]>().default([]),
  experienceYears: integer('experience_years').default(0),
  avatarUrl: text('avatar_url').default(''),
  consentForEmployerMatching: boolean('consent_for_employer_matching').default(false),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  ownerUserId: integer('owner_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  category: text('category').notNull(), // certificate | transcript | supporting | cv | funding_support | evidence
  contentBase64: text('content_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const credentials = pgTable('credentials', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  qualificationTitle: text('qualification_title').notNull(),
  institutionName: text('institution_name').notNull(),
  countryOfQualification: text('country_of_qualification').notNull(),
  graduationYear: integer('graduation_year').notNull(),
  fieldOfStudy: text('field_of_study').default(''),
  certificateDocId: integer('certificate_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  transcriptDocId: integer('transcript_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  supportingDocId: integer('supporting_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  notes: text('notes').default(''),
  status: text('status').notNull().default('Submitted'),
  // Submitted | Under review | Additional documents required | Verified by authorized reviewer | Not verified
  reviewerId: integer('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  reviewerNotes: text('reviewer_notes').default(''),
  authorizedInstitutionRef: text('authorized_institution_ref').default(''),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  domain: string;
  explanation: string;
}

export const skillsAssessments = pgTable('skills_assessments', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull().default('Intermediate'),
  durationMinutes: integer('duration_minutes').notNull().default(20),
  description: text('description').notNull(),
  questions: jsonb('questions').$type<AssessmentQuestion[]>().notNull(),
  passingScore: integer('passing_score').notNull().default(70),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assessmentAttempts = pgTable('assessment_attempts', {
  id: serial('id').primaryKey(),
  assessmentId: integer('assessment_id')
    .references(() => skillsAssessments.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  answers: jsonb('answers').$type<Record<string, number>>().notNull(),
  scorePercent: integer('score_percent').notNull(),
  passed: boolean('passed').notNull(),
  competencyBreakdown: jsonb('competency_breakdown').$type<Record<string, number>>().notNull(),
  practicalEvidenceSummary: text('practical_evidence_summary').default(''),
  practicalEvidenceUrl: text('practical_evidence_url').default(''),
  practicalEvidenceDocId: integer('practical_evidence_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  isDemo: boolean('is_demo').default(false),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

export interface CountryResourceLink {
  label: string;
  url: string;
  description: string;
}

export interface CountryStepItem {
  id: string;
  title: string;
  detail: string;
}

export const countryGuidance = pgTable('country_guidance', {
  id: serial('id').primaryKey(),
  countryCode: text('country_code').notNull().unique(),
  countryName: text('country_name').notNull(),
  workAuthOverview: text('work_auth_overview').notNull(),
  workAuthChecklist: jsonb('work_auth_checklist').$type<CountryStepItem[]>().notNull(),
  officialResources: jsonb('official_resources').$type<CountryResourceLink[]>().notNull(),
  employerComplianceSummary: text('employer_compliance_summary').notNull(),
  onboardingRequirements: jsonb('onboarding_requirements').$type<string[]>().notNull(),
  legalAidReferrals: jsonb('legal_aid_referrals').$type<CountryResourceLink[]>().notNull(),
  bankingAccessInfo: text('banking_access_info').notNull(),
  paymentServicesNotes: text('payment_services_notes').notNull(),
  disclaimer: text('disclaimer').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const legalReadinessProgress = pgTable('legal_readiness_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  countryCode: text('country_code').notNull(),
  completedItemIds: jsonb('completed_item_ids').$type<string[]>().default([]).notNull(),
  notes: text('notes').default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export interface MentorWeeklySlot {
  id: string;
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  format: string;    // Video Call | Portfolio Review | Mock Interview
}

export const mentorProfiles = pgTable('mentor_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  organization: text('organization').notNull(),
  jobTitle: text('job_title').notNull(),
  industry: text('industry').notNull(),
  country: text('country').notNull(),
  expertiseAreas: jsonb('expertise_areas').$type<string[]>().default([]).notNull(),
  languages: jsonb('languages').$type<string[]>().default([]).notNull(),
  availability: text('availability').default('2 hours / week').notNull(),
  bio: text('bio').notNull(),
  isAcceptingMentees: boolean('is_accepting_mentees').default(true).notNull(),
  verifiedMentor: boolean('verified_mentor').default(false).notNull(),
  timezone: text('timezone').default('Europe/Berlin').notNull(),
  sessionDurationMinutes: integer('session_duration_minutes').default(30).notNull(),
  weeklyAvailability: jsonb('weekly_availability').$type<MentorWeeklySlot[]>().default([]).notNull(),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mentorshipRequests = pgTable('mentorship_requests', {
  id: serial('id').primaryKey(),
  refugeeId: integer('refugee_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  mentorUserId: integer('mentor_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  topic: text('topic').notNull(),
  goals: text('goals').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('Pending'), // Pending | Accepted | Declined | Completed
  mentorResponse: text('mentor_response').default(''),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mentorshipSessions = pgTable('mentorship_sessions', {
  id: serial('id').primaryKey(),
  mentorUserId: integer('mentor_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  menteeUserId: integer('mentee_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionDate: text('session_date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').notNull(),     // HH:MM (mentor timezone)
  endTime: text('end_time').notNull(),         // HH:MM
  timezone: text('timezone').default('Europe/Berlin').notNull(),
  durationMinutes: integer('duration_minutes').default(30).notNull(),
  topic: text('topic').notNull(),
  sessionFormat: text('session_format').default('Video Call').notNull(),
  notes: text('notes').default(''),
  meetingLink: text('meeting_link').default(''),
  status: text('status').notNull().default('Confirmed'), // Confirmed | Completed | Cancelled
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const employerProfiles = pgTable('employer_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  companyName: text('company_name').notNull(),
  industry: text('industry').notNull(),
  country: text('country').notNull(),
  website: text('website').default(''),
  description: text('description').default(''),
  verifiedPartner: boolean('verified_partner').default(false).notNull(),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  employerUserId: integer('employer_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  companyName: text('company_name').notNull(),
  title: text('title').notNull(),
  opportunityType: text('opportunity_type').notNull(), // Full-time Job | Internship | Fellowship | Remote Opportunity
  industry: text('industry').notNull(),
  location: text('location').notNull(),
  country: text('country').notNull(),
  isRemote: boolean('is_remote').default(false).notNull(),
  salaryRange: text('salary_range').default('Competitive'),
  requiredSkills: jsonb('required_skills').$type<string[]>().default([]).notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('Open'), // Open | Closed
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobApplications = pgTable('job_applications', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id')
    .references(() => jobs.id, { onDelete: 'cascade' })
    .notNull(),
  refugeeId: integer('refugee_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  coverLetter: text('cover_letter').notNull(),
  cvDocId: integer('cv_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('Applied'), // Applied | Shortlisted | Interviewing | Offered | Placed | Declined
  employerNotes: text('employer_notes').default(''),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export interface WorkExperienceItem {
  id: string;
  role: string;
  organization: string;
  country: string;
  period: string;
  summary: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  country: string;
  year: string;
}

export interface ProjectSampleItem {
  id: string;
  title: string;
  description: string;
  link: string;
  skills: string[];
}

export const portfolios = pgTable('portfolios', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  summary: text('summary').default(''),
  cvDocId: integer('cv_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  workExperience: jsonb('work_experience').$type<WorkExperienceItem[]>().default([]).notNull(),
  education: jsonb('education').$type<EducationItem[]>().default([]).notNull(),
  skills: jsonb('skills').$type<string[]>().default([]).notNull(),
  projects: jsonb('projects').$type<ProjectSampleItem[]>().default([]).notNull(),
  languages: jsonb('languages').$type<string[]>().default([]).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  provider: text('provider').notNull(),
  category: text('category').notNull(),
  duration: text('duration').notNull(),
  format: text('format').notNull(),
  description: text('description').notNull(),
  targetSkills: jsonb('target_skills').$type<string[]>().default([]).notNull(),
  stipendAvailable: boolean('stipend_available').default(true).notNull(),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const fundingRequests = pgTable('funding_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  requestType: text('request_type').notNull(), // Bridging Course | Certification Fee Support | Training Stipend | Financial Access Support
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  amountRequested: integer('amount_requested').default(0).notNull(),
  currency: text('currency').default('EUR').notNull(),
  justification: text('justification').notNull(),
  supportingDocId: integer('supporting_doc_id').references(() => documents.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('Submitted'),
  // Submitted | Under Review | Additional Information Required | Approved | Rejected
  adminNotes: text('admin_notes').default(''),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull().default('general'),
  isRead: boolean('is_read').default(false).notNull(),
  linkSection: text('link_section').default('overview'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  credentials: many(credentials),
  assessmentAttempts: many(assessmentAttempts),
  fundingRequests: many(fundingRequests),
  notifications: many(notifications),
  mentorProfile: one(mentorProfiles),
  employerProfile: one(employerProfiles),
  portfolio: one(portfolios),
}));
