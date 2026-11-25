export type UserRole = 'refugee' | 'employer' | 'mentor' | 'administrator';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  headline?: string;
  bio?: string;
  countryOfOrigin?: string;
  hostCountry?: string;
  location?: string;
  phone?: string;
  linkedinUrl?: string;
  skills?: string[];
  experienceYears?: number;
  avatarUrl?: string;
  consentForEmployerMatching?: boolean;
  isDemo?: boolean;
  createdAt?: string;
}

export interface CredentialRecord {
  id: number;
  userId: number;
  applicantName?: string;
  applicantEmail?: string;
  qualificationTitle: string;
  institutionName: string;
  countryOfQualification: string;
  graduationYear: number;
  fieldOfStudy?: string;
  certificateDocId?: number | null;
  transcriptDocId?: number | null;
  supportingDocId?: number | null;
  notes?: string;
  status:
    | 'Submitted'
    | 'Under review'
    | 'Additional documents required'
    | 'Verified by authorized reviewer'
    | 'Not verified';
  reviewerNotes?: string;
  authorizedInstitutionRef?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestionClient {
  id: string;
  prompt: string;
  options: string[];
  domain: string;
  correctIndex?: number;
  explanation?: string;
}

export interface SkillsAssessment {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  description: string;
  passingScore: number;
  questions: AssessmentQuestionClient[];
}

export interface AssessmentAttempt {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  assessmentCategory: string;
  scorePercent: number;
  passed: boolean;
  competencyBreakdown: Record<string, number>;
  practicalEvidenceSummary?: string;
  practicalEvidenceUrl?: string;
  practicalEvidenceDocId?: number | null;
  isDemo?: boolean;
  completedAt: string;
}

export interface CountryGuidance {
  id: number;
  countryCode: string;
  countryName: string;
  workAuthOverview: string;
  workAuthChecklist: { id: string; title: string; detail: string }[];
  officialResources: { label: string; url: string; description: string }[];
  employerComplianceSummary: string;
  onboardingRequirements: string[];
  legalAidReferrals: { label: string; url: string; description: string }[];
  bankingAccessInfo: string;
  paymentServicesNotes: string;
  disclaimer: string;
}

export interface MentorWeeklySlotItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  format: string;
}

export interface MentorProfileItem {
  profileId: number;
  userId: number;
  name: string;
  avatarUrl?: string;
  organization: string;
  jobTitle: string;
  industry: string;
  country: string;
  expertiseAreas: string[];
  languages: string[];
  availability: string;
  bio: string;
  isAcceptingMentees: boolean;
  verifiedMentor: boolean;
  timezone: string;
  sessionDurationMinutes: number;
  weeklyAvailability: MentorWeeklySlotItem[];
  isDemo?: boolean;
}

export interface MentorDaySlot {
  startTime: string;
  endTime: string;
  format: string;
  available: boolean;
}

export interface MentorAvailabilityResponse {
  mentor: {
    userId: number;
    name: string;
    verifiedMentor: boolean;
    isAcceptingMentees: boolean;
    timezone: string;
    sessionDurationMinutes: number;
  };
  month: string;
  today: string;
  days: Record<string, MentorDaySlot[]>;
}

export interface MentorshipSessionItem {
  id: number;
  mentorUserId: number;
  menteeUserId: number;
  mentorName: string;
  mentorTitle?: string;
  mentorOrganization?: string;
  mentorVerified?: boolean;
  menteeName: string;
  menteeHeadline?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  durationMinutes: number;
  topic: string;
  sessionFormat: string;
  notes?: string;
  meetingLink?: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  isDemo?: boolean;
  createdAt: string;
}

export interface MentorshipRequestItem {
  id: number;
  refugeeId: number;
  mentorUserId: number;
  refugeeName: string;
  refugeeHeadline?: string;
  refugeeCountry?: string;
  mentorName: string;
  topic: string;
  goals: string;
  message: string;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Completed';
  mentorResponse?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface JobItem {
  id: number;
  employerUserId: number;
  companyName: string;
  title: string;
  opportunityType: string;
  industry: string;
  location: string;
  country: string;
  isRemote: boolean;
  salaryRange: string;
  requiredSkills: string[];
  description: string;
  status: 'Open' | 'Closed';
  isDemo?: boolean;
  createdAt: string;
}

export interface JobApplicationItem {
  id: number;
  jobId: number;
  refugeeId: number;
  jobTitle: string;
  companyName: string;
  opportunityType: string;
  applicantName: string;
  applicantHeadline?: string;
  applicantLocation?: string;
  applicantSkills?: string[];
  applicantExperienceYears?: number;
  coverLetter: string;
  cvDocId?: number | null;
  status: 'Applied' | 'Shortlisted' | 'Interviewing' | 'Offered' | 'Placed' | 'Declined';
  employerNotes?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface PortfolioData {
  summary: string;
  cvDocId: number | null;
  workExperience: {
    id: string;
    role: string;
    organization: string;
    country: string;
    period: string;
    summary: string;
  }[];
  education: {
    id: string;
    degree: string;
    institution: string;
    country: string;
    year: string;
  }[];
  skills: string[];
  projects: {
    id: string;
    title: string;
    description: string;
    link: string;
    skills: string[];
  }[];
  languages: string[];
}

export interface CourseItem {
  id: number;
  title: string;
  provider: string;
  category: string;
  duration: string;
  format: string;
  description: string;
  targetSkills: string[];
  stipendAvailable: boolean;
  isDemo?: boolean;
}

export interface FundingRequestItem {
  id: number;
  userId: number;
  applicantName?: string;
  applicantEmail?: string;
  requestType: string;
  courseId?: number | null;
  title: string;
  amountRequested: number;
  currency: string;
  justification: string;
  supportingDocId?: number | null;
  status:
    | 'Submitted'
    | 'Under Review'
    | 'Additional Information Required'
    | 'Approved'
    | 'Rejected';
  adminNotes?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  linkSection?: string;
  createdAt: string;
}

export interface ImpactResponse {
  metrics: {
    registeredRefugees: number;
    liveRefugees: number;
    credentialsSubmitted: number;
    credentialsVerified: number;
    assessmentsCompleted: number;
    bridgingCourseApplicants: number;
    financialAssistanceRequests: number;
    mentorshipConnections: number;
    jobApplicationsTotal: number;
    successfulPlacements: number;
    openJobs: number;
    guidanceCountries: number;
  };
  sdgMapping: {
    sdgNumber: number;
    title: string;
    focus: string;
    indicators: { label: string; value: number }[];
  }[];
}
