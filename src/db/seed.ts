import { count } from 'drizzle-orm';
import { db } from './index.ts';
import {
  assessmentAttempts,
  countryGuidance,
  courses,
  credentials,
  employerProfiles,
  fundingRequests,
  jobApplications,
  jobs,
  legalReadinessProgress,
  mentorProfiles,
  mentorshipRequests,
  notifications,
  portfolios,
  skillsAssessments,
  users,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeedData(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      console.error('Database seed warning:', err);
    });
  }
  return seedPromise;
}

async function runSeed() {
  // Check if country_guidance is already populated
  const existingGuidance = await db.select({ value: count() }).from(countryGuidance);
  if (Number(existingGuidance[0]?.value ?? 0) === 0) {
    await db.insert(countryGuidance).values([
      {
        countryCode: 'DE',
        countryName: 'Germany',
        workAuthOverview:
          'Recognized refugees and subsidiary protection holders in Germany generally receive unrestricted labor market access (Erwerbstätigkeit gestattet). Asylum seekers may obtain restricted work permits after initial waiting periods via the local Ausländerbehörde and Federal Employment Agency (BA).',
        workAuthChecklist: [
          {
            id: 'de-1',
            title: 'Residence Permit / Aufenthaltstitel Verification',
            detail: 'Confirm your residence document states "Erwerbstätigkeit gestattet" (employment permitted).',
          },
          {
            id: 'de-2',
            title: 'Anabin / ZAB Qualification Statement',
            detail: 'Check university recognition in the Anabin database or apply for a Statement of Comparability via ZAB.',
          },
          {
            id: 'de-3',
            title: 'Tax ID (Steuer-ID) & Social Security Number',
            detail: 'Register your address (Anmeldung) to receive your 11-digit Steuer-ID and pension insurance number.',
          },
          {
            id: 'de-4',
            title: 'Statutory Health Insurance Enrollment',
            detail: 'Select a German statutory health insurer (GKV) prior to signing an employment contract.',
          },
        ],
        officialResources: [
          {
            label: 'Make it in Germany — Official Skilled Portal',
            url: 'https://www.make-it-in-germany.com/en/',
            description: 'Federal government portal on work permits, visa rules, and recognition.',
          },
          {
            label: 'Anerkennung in Deutschland',
            url: 'https://www.anerkennung-in-deutschland.de/html/en/index.php',
            description: 'Official portal for foreign professional qualification recognition.',
          },
          {
            label: 'Federal Employment Agency (BA)',
            url: 'https://www.arbeitsagentur.de/en',
            description: 'Job placement, bridging course vouchers (Bildungsgutschein), and advisory.',
          },
        ],
        employerComplianceSummary:
          'Employers must verify the candidate holds a valid residence title permitting employment, retain a copy of the permit for statutory audits, and register the employee with social security and tax authorities on day one.',
        onboardingRequirements: [
          'Valid passport or recognized substitute ID & residence permit (Aufenthaltstitel)',
          'German Tax Identification Number (Steuer-ID)',
          'Social Security Card / Rentenversicherungsnummer',
          'SEPA IBAN bank account and statutory health insurance certificate',
        ],
        legalAidReferrals: [
          {
            label: 'Pro Asyl Legal Advisory Network',
            url: 'https://www.proasyl.de/en/',
            description: 'Independent legal counseling and regional refugee council referrals.',
          },
          {
            label: 'IQ Network Recognition Counseling',
            url: 'https://www.netzwerk-iq.de/en/',
            description: 'Free regional guidance on credential recognition and bridging courses.',
          },
        ],
        bankingAccessInfo:
          'Under the EU Payment Accounts Directive (Zahlungskontengesetz), every person legally residing in Germany—including asylum seekers—has a statutory right to a Basic Payment Account (Basiskonto) with SEPA IBAN functionality.',
        paymentServicesNotes:
          'Bring your registration certificate (Meldebescheinigung) or arrival attestation (Ankunftsnachweis) and residence permit to any Sparkasse, Volksbank, or major retail bank.',
        disclaimer:
          'Informational guidance only: RefugeeTalent Connect does not issue legal decisions, immigration rulings, or guarantee bank account eligibility.',
      },
      {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        workAuthOverview:
          'Individuals granted Refugee Status or Humanitarian Protection in the UK have full permission to work in any profession without employer sponsorship. Employers verify status digitally using a Home Office Share Code.',
        workAuthChecklist: [
          {
            id: 'gb-1',
            title: 'eVisa / UKVI Share Code Access',
            detail: 'Set up your UKVI account to generate a 9-character Right to Work Share Code for employers.',
          },
          {
            id: 'gb-2',
            title: 'National Insurance (NI) Number',
            detail: 'Verify your NI number on your BRP/eVisa or apply online through GOV.UK.',
          },
          {
            id: 'gb-3',
            title: 'UK ENIC Statement of Comparability',
            detail: 'Obtain an academic comparison statement from UK ENIC for regulated or graduate roles.',
          },
          {
            id: 'gb-4',
            title: 'UK Bank Account Setup',
            detail: 'Open a UK current account using your eVisa, tenancy/council letter, or Jobcentre verification.',
          },
        ],
        officialResources: [
          {
            label: 'GOV.UK — Prove Your Right to Work',
            url: 'https://www.gov.uk/prove-right-to-work',
            description: 'Official Home Office service to generate employer share codes.',
          },
          {
            label: 'UK ENIC — Qualification Recognition',
            url: 'https://www.enic.org.uk/',
            description: 'Official national agency for recognizing international qualifications.',
          },
          {
            label: 'Refugee Employment Network (REN)',
            url: 'https://www.refugeeemploymentnetwork.co.uk/',
            description: 'UK specialist employment support and employer matching partners.',
          },
        ],
        employerComplianceSummary:
          'UK employers must perform an online Right to Work check using the candidate’s Share Code and date of birth prior to employment start to establish a statutory excuse.',
        onboardingRequirements: [
          'Home Office Right to Work Share Code + Date of Birth',
          'National Insurance Number (or pending application reference)',
          'P45 or HMRC Starter Checklist',
          'UK Sort Code & Account Number for payroll',
        ],
        legalAidReferrals: [
          {
            label: 'Refugee Council UK',
            url: 'https://www.refugeecouncil.org.uk/',
            description: 'Employment integration, mental health, and specialist legal signposting.',
          },
          {
            label: 'Breaking Barriers',
            url: 'https://breakingbarriers.co.uk/',
            description: '1-to-1 employment advice and corporate partner pathways in the UK.',
          },
        ],
        bankingAccessInfo:
          'Major UK high-street banks offer fee-free Basic Bank Accounts accessible with biometric residence documentation or alternative proof-of-address letters from local authorities or support charities.',
        paymentServicesNotes:
          'Ask specifically for a "Basic Bank Account" if you do not yet have standard utility bills for address verification.',
        disclaimer:
          'Informational guidance only: RefugeeTalent Connect does not provide immigration legal advice or guarantee banking eligibility.',
      },
      {
        countryCode: 'CA',
        countryName: 'Canada',
        workAuthOverview:
          'Permanent residents (including resettled refugees) and protected persons holding an Open Work Permit can work for almost any employer across Canada. Regulated trades and professions require provincial licensing.',
        workAuthChecklist: [
          {
            id: 'ca-1',
            title: 'Social Insurance Number (SIN)',
            detail: 'Apply at Service Canada using your Confirmation of Permanent Residence or Open Work Permit.',
          },
          {
            id: 'ca-2',
            title: 'Educational Credential Assessment (ECA)',
            detail: 'Submit degrees to WES, ICAS, or IQAS for Canadian equivalency documentation.',
          },
          {
            id: 'ca-3',
            title: 'Provincial Regulatory Assessment',
            detail: 'Contact provincial bodies (e.g., PEO for Engineering, MCC for Medicine) if in a regulated field.',
          },
        ],
        officialResources: [
          {
            label: 'IRCC — Foreign Credential Recognition',
            url: 'https://www.canada.ca/en/employment-social-development/programs/foreign-credential-recognition.html',
            description: 'Federal resources and microloan programs for credential recognition.',
          },
          {
            label: 'Service Canada — Apply for a SIN',
            url: 'https://www.canada.ca/en/employment-social-development/services/sin.html',
            description: 'Mandatory identification number required to work and receive wages in Canada.',
          },
        ],
        employerComplianceSummary:
          'Canadian employers verify the employee’s Social Insurance Number (SIN) and work permit expiry date (if temporary), ensuring equal employment standards under provincial labor codes.',
        onboardingRequirements: [
          'Valid Social Insurance Number (9-digit SIN)',
          'Government-issued photo ID or PR card / Work Permit',
          'TD1 Federal and Provincial tax credit forms',
          'Direct deposit void cheque / transit & institution number',
        ],
        legalAidReferrals: [
          {
            label: 'Talent Beyond Boundaries Canada',
            url: 'https://www.talentbeyondboundaries.org/',
            description: 'Displaced talent labor mobility and employer pathway support.',
          },
          {
            label: 'Windmill Microlending',
            url: 'https://windmillmicrolending.org/',
            description: 'Low-interest loans for skilled immigrants and refugees to pay licensing/course fees.',
          },
        ],
        bankingAccessInfo:
          'Under Canada’s Access to Basic Banking Services Regulations, federally regulated banks must open a personal account with acceptable ID regardless of credit history.',
        paymentServicesNotes:
          'Newcomer banking packages from major Canadian banks frequently waive monthly account fees for the first 12–24 months.',
        disclaimer:
          'Informational guidance only: Always confirm provincial licensing and immigration rules with official Canadian authorities.',
      },
      {
        countryCode: 'NL',
        countryName: 'Netherlands',
        workAuthOverview:
          'Status holders (statushouders) with a residence permit have unrestricted access to the Dutch labor market (Arbeid vrij toegestaan). Asylum seekers in procedure for 6+ months can work without the 24-week cap.',
        workAuthChecklist: [
          {
            id: 'nl-1',
            title: 'BSN (Burgerservicenummer) Registration',
            detail: 'Obtain your BSN via municipal BRP registration; required for payroll and banking.',
          },
          {
            id: 'nl-2',
            title: 'Nuffic / IDW Credential Evaluation',
            detail: 'Request a free international credential evaluation through IDW for asylum/status holders.',
          },
          {
            id: 'nl-3',
            title: 'DigiD Digital Identity Activation',
            detail: 'Activate DigiD for tax, healthcare allowance, and official government portals.',
          },
        ],
        officialResources: [
          {
            label: 'IDW — Internationale Diplomawaardering',
            url: 'https://www.idw.nl/en/',
            description: 'Official Dutch credential evaluation service (fee waivers for refugees).',
          },
          {
            label: 'UAF — Foundation for Refugee Students',
            url: 'https://www.uaf.nl/en/',
            description: 'Guidance, bridging education, and career support for skilled refugees.',
          },
        ],
        employerComplianceSummary:
          'Dutch employers verify the candidate’s IND residence document (checking "Arbeid vrij toegestaan") and retain a copy in payroll administration under Wet arbeid vreemdelingen (WAV).',
        onboardingRequirements: [
          'Valid IND residence document with work authorization note',
          'BSN (Burgerservicenummer)',
          'Dutch Loonheffingsverklaring (wage tax credit form)',
          'IBAN bank account for salary transfer',
        ],
        legalAidReferrals: [
          {
            label: 'VluchtelingenWerk Nederland',
            url: 'https://www.vluchtelingenwerk.nl/',
            description: 'Legal support, municipal integration, and work rights counseling.',
          },
        ],
        bankingAccessInfo:
          'Individuals registered in a Dutch municipality with a BSN can apply for a basic Dutch payment account (Basisbetaalrekening) with major Dutch banks.',
        paymentServicesNotes:
          'Status holders residing in COA centers can use the Dutch Covenant on Basic Payment Accounts if municipal housing is pending.',
        disclaimer:
          'Informational guidance only: Does not constitute formal legal advice or banking approval.',
      },
      {
        countryCode: 'SE',
        countryName: 'Sweden',
        workAuthOverview:
          'Refugees granted residence permits in Sweden have full right to work. Asylum seekers holding a valid LMA card with AT-UND exemption can also work immediately while their application is processed.',
        workAuthChecklist: [
          {
            id: 'se-1',
            title: 'Personnummer or Coordination Number',
            detail: 'Register with Skatteverket (Swedish Tax Agency) to receive your personal identity number.',
          },
          {
            id: 'se-2',
            title: 'UHR Recognition Statement',
            detail: 'Apply for a free foreign qualification assessment from the Swedish Council for Higher Education.',
          },
          {
            id: 'se-3',
            title: 'Arbetsförmedlingen Establishment Program',
            detail: 'Enroll in fast-track (Snabbspår) vocational validation and Swedish language bridging.',
          },
        ],
        officialResources: [
          {
            label: 'UHR — Assessment of Foreign Qualifications',
            url: 'https://www.uhr.se/en/start/recognition-of-foreign-qualifications/',
            description: 'Official qualification recognition in Sweden.',
          },
          {
            label: 'Migrationsverket — Working in Sweden',
            url: 'https://www.migrationsverket.se/English.html',
            description: 'Official Swedish Migration Agency work rights documentation.',
          },
        ],
        employerComplianceSummary:
          'Employers verify the UT-kort (residence permit card) or LMA card with AT-UND and report employment start to Skatteverket.',
        onboardingRequirements: [
          'Swedish Personnummer or Coordination Number (Samordningsnummer)',
          'UT-kort or LMA card showing AT-UND work exemption',
          'Swedish bank account or clearing/account details',
        ],
        legalAidReferrals: [
          {
            label: 'Swedish Refugee Law Center',
            url: 'https://sweref.org/',
            description: 'Free specialist legal counseling for asylum seekers and refugees.',
          },
        ],
        bankingAccessInfo:
          'Under Swedish law, individuals legally residing in the EEA have the right to a basic payment account with debit card and salary deposit capabilities.',
        paymentServicesNotes:
          'BankID digital authentication typically requires a Swedish Personnummer and national ID card from Skatteverket.',
        disclaimer:
          'Informational guidance only: Confirm individual status directly with Migrationsverket and Skatteverket.',
      },
      {
        countryCode: 'US',
        countryName: 'United States',
        workAuthOverview:
          'Refugees and asylees admitted to the United States are authorized to work immediately incident to status. They receive Form I-94 and an Employment Authorization Document (EAD / Form I-766), and a unrestricted Social Security card.',
        workAuthChecklist: [
          {
            id: 'us-1',
            title: 'Social Security Number (SSN)',
            detail: 'Apply with the Social Security Administration using Form I-94 or EAD.',
          },
          {
            id: 'us-2',
            title: 'Form I-9 Employment Eligibility Verification',
            detail: 'Present unrestricted Social Security card + state ID or EAD during employer onboarding.',
          },
          {
            id: 'us-3',
            title: 'NACES Credential Evaluation',
            detail: 'Use a NACES-member agency (e.g., WES, ECE) for US degree equivalency.',
          },
        ],
        officialResources: [
          {
            label: 'USCIS — Refugees & Work Authorization',
            url: 'https://www.uscis.gov/humanitarian/refugees-and-asylum/refugees',
            description: 'Official federal guidance on refugee employment rights.',
          },
          {
            label: 'Upwardly Global',
            url: 'https://www.upwardlyglobal.org/',
            description: 'Career coaching, licensing navigation, and employer connections for newcomers.',
          },
        ],
        employerComplianceSummary:
          'Employers complete Form I-9 within 3 business days of hire without discriminating against valid refugee/asylee I-94 or unrestricted SSN documents.',
        onboardingRequirements: [
          'Form I-9 acceptable identity & work authorization documents',
          'Social Security Number (SSN) and IRS Form W-4',
          'US checking/savings routing & account numbers for direct deposit',
        ],
        legalAidReferrals: [
          {
            label: 'HIAS & IRC Legal Services',
            url: 'https://www.rescue.org/',
            description: 'Resettlement, legal, and economic empowerment programs across US cities.',
          },
        ],
        bankingAccessInfo:
          'Many US banks and community credit unions accept Form I-94, EAD, or consular IDs alongside a local resettlement agency address letter to open checking accounts.',
        paymentServicesNotes:
          'Ask about "Bank On" certified low-fee checking accounts with zero overdraft fees.',
        disclaimer:
          'Informational guidance only: RefugeeTalent Connect does not provide legal immigration determinations or banking guarantees.',
      },
    ]);
  }

  // Seed Skills Assessments
  const existingAssessments = await db.select({ value: count() }).from(skillsAssessments);
  if (Number(existingAssessments[0]?.value ?? 0) === 0) {
    await db.insert(skillsAssessments).values([
      {
        title: 'Full-Stack Web & Cloud Engineering',
        category: 'Software Engineering',
        difficulty: 'Intermediate',
        durationMinutes: 20,
        description:
          'Evaluates practical architecture, relational data modeling, API security, and frontend state management competencies.',
        passingScore: 70,
        questions: [
          {
            id: 'swe-1',
            domain: 'API Security',
            prompt:
              'Which approach best prevents SQL injection when filtering database records based on user search input?',
            options: [
              'Escaping single quotes with string replace',
              'Using parameterized queries or ORM query builders',
              'Base64-encoding the search term before concatenation',
              'Blocking the word SELECT in frontend validation',
            ],
            correctIndex: 1,
            explanation:
              'Parameterized queries and ORM bindings separate SQL instructions from untrusted user data at the driver level.',
          },
          {
            id: 'swe-2',
            domain: 'Data Modeling',
            prompt:
              'When designing a multi-tenant hiring platform, how should confidential refugee identity documents be stored and served?',
            options: [
              'In a public CDN bucket with unguessable filenames',
              'Embedded directly inside public candidate search JSON',
              'Access-controlled private storage verified server-side per request',
              'Stored inside browser localStorage for fast retrieval',
            ],
            correctIndex: 2,
            explanation:
              'Confidential documents require strict server-side authorization checks verifying owner or authorized reviewer role on every request.',
          },
          {
            id: 'swe-3',
            domain: 'System Architecture',
            prompt:
              'What HTTP status code should an API return when an authenticated refugee user attempts to access an administrator-only review endpoint?',
            options: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '422 Unprocessable Entity'],
            correctIndex: 1,
            explanation:
              '401 indicates missing/invalid authentication, whereas 403 indicates valid authentication but insufficient role permissions.',
          },
          {
            id: 'swe-4',
            domain: 'Frontend Engineering',
            prompt:
              'Which CSS property ensures numeric columns in financial and analytics dashboards align cleanly without layout jitter?',
            options: [
              'font-variant-numeric: tabular-nums',
              'text-align: justify',
              'letter-spacing: 0.2em',
              'white-space: pre-wrap',
            ],
            correctIndex: 0,
            explanation:
              'tabular-nums gives every digit identical horizontal width so columns of numbers align vertically.',
          },
          {
            id: 'swe-5',
            domain: 'Cloud & Databases',
            prompt:
              'Why is connection pooling essential for Node.js backends running against PostgreSQL?',
            options: [
              'It encrypts client-side JavaScript bundles',
              'It reuses bounded database connections instead of exhausting TCP/handshake limits per request',
              'It automatically translates NoSQL queries to SQL',
              'It replaces the need for database indexes',
            ],
            correctIndex: 1,
            explanation:
              'Connection pools maintain a bounded set of reusable database connections, avoiding latency spikes and connection exhaustion.',
          },
        ],
      },
      {
        title: 'Civil & Structural Engineering Fundamentals',
        category: 'Engineering',
        difficulty: 'Intermediate',
        durationMinutes: 25,
        description:
          'Assesses structural load analysis, Eurocode/ISO standards awareness, concrete durability, and site quality assurance.',
        passingScore: 70,
        questions: [
          {
            id: 'civ-1',
            domain: 'Structural Analysis',
            prompt:
              'Under Eurocode 0 / Limit State Design, what is the primary purpose of partial safety factors applied to permanent and variable actions?',
            options: [
              'To reduce material procurement costs on small sites',
              'To account for uncertainties in loads, material strengths, and modeling assumptions',
              'To eliminate the need for geotechnical soil surveys',
              'To speed up concrete curing time',
            ],
            correctIndex: 1,
            explanation:
              'Partial safety factors ensure structural reliability despite variability in applied loads and material properties.',
          },
          {
            id: 'civ-2',
            domain: 'Materials & Durability',
            prompt:
              'Which factor most directly governs steel reinforcement corrosion protection in reinforced concrete exposed to de-icing salts?',
            options: [
              'Aggregate color',
              'Adequate concrete cover depth and low water-cement ratio',
              'Formwork timber species',
              'Roof pitch angle',
            ],
            correctIndex: 1,
            explanation:
              'Low permeability (low w/c ratio) and sufficient cover thickness delay chloride ingress to the reinforcing steel.',
          },
          {
            id: 'civ-3',
            domain: 'Geotechnics',
            prompt:
              'Before finalizing shallow foundation bearing capacity on cohesive clay soils, which test provides essential shear strength parameters?',
            options: [
              'Slump cone workability test',
              'Triaxial compression or vane shear laboratory/in-situ testing',
              'Rebound hammer surface test',
              'Los Angeles abrasion test',
            ],
            correctIndex: 1,
            explanation:
              'Triaxial and vane shear tests quantify undrained and drained shear strength parameters of cohesive soils.',
          },
          {
            id: 'civ-4',
            domain: 'Standards & Compliance',
            prompt:
              'When adapting foreign structural engineering experience to a new host country, what is the primary compliance priority?',
            options: [
              'Re-verifying wind, seismic, and snow load maps against local national annexes',
              'Using imperial units exclusively',
              'Skipping peer review for residential projects',
              'Assuming identical soil frost depth globally',
            ],
            correctIndex: 0,
            explanation:
              'National building codes and annexes specify region-specific seismic, wind, snow, and frost design parameters.',
          },
        ],
      },
      {
        title: 'Clinical Healthcare & Triage Protocols',
        category: 'Healthcare',
        difficulty: 'Intermediate',
        durationMinutes: 20,
        description:
          'Covers clinical safety, patient confidentiality, emergency triage prioritization, and evidence-based documentation.',
        passingScore: 75,
        questions: [
          {
            id: 'med-1',
            domain: 'Patient Safety',
            prompt:
              'Which principle governs handling of sensitive patient health records across digital clinical systems?',
            options: [
              'Minimum necessary access with strict role-based confidentiality',
              'Open access for all administrative staff across departments',
              'Sharing patient diagnoses over unencrypted public messaging apps',
              'Storing records without audit timestamps',
            ],
            correctIndex: 0,
            explanation:
              'Data minimization and strict role-based confidentiality protect patient privacy under GDPR/HIPAA standards.',
          },
          {
            id: 'med-2',
            domain: 'Emergency Triage',
            prompt:
              'In standard emergency triage, which symptom presentation requires immediate Level 1 resuscitation priority?',
            options: [
              'Minor ankle sprain with stable vitals',
              'Acute airway compromise with severe respiratory distress',
              'Routine prescription refill request',
              'Mild seasonal rhinitis',
            ],
            correctIndex: 1,
            explanation:
              'Airway, breathing, and circulation compromise always take highest immediate clinical triage priority.',
          },
          {
            id: 'med-3',
            domain: 'Infection Control',
            prompt:
              'What is the single most effective routine measure to prevent healthcare-associated cross-transmission?',
            options: [
              'Consistent hand hygiene following WHO 5 Moments',
              'Wearing double shoe covers in administrative hallways',
              'Turning off ward ventilation',
              'Replacing alcohol rub with cold water only',
            ],
            correctIndex: 0,
            explanation:
              'WHO 5 Moments hand hygiene protocol is the cornerstone of infection prevention.',
          },
          {
            id: 'med-4',
            domain: 'Documentation',
            prompt:
              'Why is structured SBAR communication used during clinical handovers?',
            options: [
              'It shortens billing cycles',
              'It standardizes Situation, Background, Assessment, and Recommendation to prevent handoff errors',
              'It replaces informed patient consent',
              'It hides diagnostic uncertainty',
            ],
            correctIndex: 1,
            explanation:
              'SBAR creates a concise, standardized clinical briefing structure that reduces communication errors.',
          },
        ],
      },
      {
        title: 'Financial Accounting & Data Analysis',
        category: 'Business & Finance',
        difficulty: 'Beginner',
        durationMinutes: 15,
        description:
          'Tests IFRS accrual accounting fundamentals, cash flow analysis, KPI reporting, and spreadsheet data integrity.',
        passingScore: 70,
        questions: [
          {
            id: 'fin-1',
            domain: 'Financial Reporting',
            prompt:
              'Under accrual accounting (IFRS), when should service revenue be recognized?',
            options: [
              'Only when cash arrives in the bank account',
              'When the performance obligation is satisfied and earned, regardless of cash timing',
              'At the end of the fiscal year automatically',
              'When an internal sales lead is created',
            ],
            correctIndex: 1,
            explanation:
              'IFRS 15 / accrual accounting recognizes revenue when performance obligations are fulfilled.',
          },
          {
            id: 'fin-2',
            domain: 'Cash Flow',
            prompt:
              'Why can a profitable company still face a short-term liquidity crisis?',
            options: [
              'High accounts receivable delays or heavy debt/inventory outflows despite positive net income',
              'Because depreciation is a cash expense',
              'Because equity increases cash automatically',
              'Because revenue is always equal to operating cash flow',
            ],
            correctIndex: 0,
            explanation:
              'Net income includes non-cash items and timing differences; slow collections or high working capital needs can drain cash.',
          },
          {
            id: 'fin-3',
            domain: 'Data Integrity',
            prompt:
              'When reconciling multi-currency European and North American ledgers, which practice prevents rounding drift?',
            options: [
              'Storing monetary amounts in minor integer units (cents) or fixed-decimal precision with explicit exchange rate dates',
              'Using floating-point averages across months',
              'Dropping decimal places prior to aggregation',
              'Mixing USD and EUR in the same column without currency codes',
            ],
            correctIndex: 0,
            explanation:
              'Fixed precision / minor currency units paired with explicit currency codes and FX timestamps ensure exact auditability.',
          },
          {
            id: 'fin-4',
            domain: 'Compliance',
            prompt:
              'What is the purpose of segregation of duties in corporate finance workflows?',
            options: [
              'To slow down vendor payments',
              'To ensure no single individual can both initiate and approve/reconcile a financial transaction',
              'To eliminate external audits',
              'To combine payroll and treasury permissions',
            ],
            correctIndex: 1,
            explanation:
              'Segregation of duties reduces fraud and error risk by requiring independent approval and reconciliation.',
          },
        ],
      },
    ]);
  }

  // Seed Bridging Courses
  const existingCourses = await db.select({ value: count() }).from(courses);
  if (Number(existingCourses[0]?.value ?? 0) === 0) {
    await db.insert(courses).values([
      {
        title: 'European Structural Engineering Codes (Eurocode 2 & 8) Bridge',
        provider: 'TU Berlin Open Continuing Education',
        category: 'Engineering Accreditation',
        duration: '8 Weeks · Part-time Online',
        format: 'Live Labs + Case Studies',
        description:
          'Equips displaced civil and structural engineers with practical command of Eurocode load combinations, seismic detailing, and BIM documentation standards.',
        targetSkills: ['Eurocode', 'Structural Design', 'BIM', 'Revit'],
        stipendAvailable: true,
        isDemo: true,
      },
      {
        title: 'Cloud-Native TypeScript & PostgreSQL Accelerator',
        provider: 'ReDI School of Digital Integration',
        category: 'Software & Cloud',
        duration: '12 Weeks · Hybrid',
        format: 'Cohort + Capstone Project',
        description:
          'Hands-on software engineering bridge covering TypeScript, REST APIs, PostgreSQL schema design, testing, and European agile team workflows.',
        targetSkills: ['TypeScript', 'React', 'PostgreSQL', 'Node.js'],
        stipendAvailable: true,
        isDemo: true,
      },
      {
        title: 'Clinical Terminology & Host-Country Medical Licensing Prep',
        provider: 'Charité International Integration Track',
        category: 'Healthcare Licensing',
        duration: '10 Weeks · Guided Cohort',
        format: 'Clinical Simulations + Language Labs',
        description:
          'Prepares internationally trained physicians, nurses, and pharmacists for medical language exams (FSP) and clinical equivalency assessments.',
        targetSkills: ['Clinical Communication', 'Patient Safety', 'Medical Licensing'],
        stipendAvailable: true,
        isDemo: true,
      },
      {
        title: 'IFRS Financial Reporting & Workplace Compliance',
        provider: 'Frankfurt School Bridging Initiative',
        category: 'Finance & Operations',
        duration: '6 Weeks · Self-Paced + Mentoring',
        format: 'Interactive Modules',
        description:
          'Bridges international accounting experience to IFRS, EU VAT compliance, SAP/ERP workflows, and executive financial analysis.',
        targetSkills: ['IFRS', 'Financial Modeling', 'Excel', 'Audit Compliance'],
        stipendAvailable: true,
        isDemo: true,
      },
      {
        title: 'Technical Workplace Communication (B2/C1 Professional Track)',
        provider: 'Goethe-Institut & Partner Employers',
        category: 'Language & Readiness',
        duration: '8 Weeks · Evening Sessions',
        format: 'Virtual Classroom',
        description:
          'Focused technical vocabulary, interview simulation, and workplace culture preparation tailored for engineering, healthcare, and tech professionals.',
        targetSkills: ['Technical Writing', 'Interview Readiness', 'Cross-Cultural Teams'],
        stipendAvailable: true,
        isDemo: true,
      },
    ]);
  }

  // Seed Sample Demonstration Accounts & Activity (clearly marked isDemo: true)
  const existingUsers = await db.select({ value: count() }).from(users);
  if (Number(existingUsers[0]?.value ?? 0) === 0) {
    const insertedUsers = await db
      .insert(users)
      .values([
        {
          uid: 'demo-refugee-layla',
          email: 'layla.almansoor@demo.refugeetalent.org',
          name: 'Layla Al-Mansoor',
          role: 'refugee',
          headline: 'Civil & Structural Engineer · 7 Years Infrastructure Experience',
          bio: 'Former senior municipal bridge and structural rehabilitation engineer seeking credential recognition and infrastructure roles in Germany.',
          countryOfOrigin: 'Syria',
          hostCountry: 'Germany',
          location: 'Berlin, Germany',
          skills: ['Structural Analysis', 'AutoCAD', 'Eurocode', 'Project Management', 'Concrete Design'],
          experienceYears: 7,
          avatarUrl: '/src/assets/images/avatar_sample_refugee_1795593656678.jpg',
          consentForEmployerMatching: true,
          isDemo: true,
        },
        {
          uid: 'demo-refugee-tariq',
          email: 'tariq.zayed@demo.refugeetalent.org',
          name: 'Tariq Zayed',
          role: 'refugee',
          headline: 'Full-Stack Software Engineer · TypeScript, PostgreSQL & Cloud',
          bio: 'Software architect with 6 years building resilient banking and logistics platforms. Ready for remote or European hybrid engineering teams.',
          countryOfOrigin: 'Ukraine',
          hostCountry: 'United Kingdom',
          location: 'Manchester, United Kingdom',
          skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
          experienceYears: 6,
          consentForEmployerMatching: true,
          isDemo: true,
        },
        {
          uid: 'demo-employer-nordic',
          email: 'talent@nordicgrid.demo.org',
          name: 'Elena Lindqvist (NordicGrid CleanTech)',
          role: 'employer',
          headline: 'Head of Inclusive Hiring · NordicGrid CleanTech GmbH',
          bio: 'Building clean energy grid and digital infrastructure teams across Berlin, London, and Stockholm.',
          countryOfOrigin: 'Sweden',
          hostCountry: 'Germany',
          location: 'Berlin, Germany',
          skills: ['Engineering Hiring', 'CleanTech', 'Global Mobility'],
          experienceYears: 11,
          consentForEmployerMatching: false,
          isDemo: true,
        },
        {
          uid: 'demo-mentor-henrik',
          email: 'henrik.weber@demo.refugeetalent.org',
          name: 'Dr. Henrik Weber',
          role: 'mentor',
          headline: 'Principal Infrastructure Architect · Volunteer Career Mentor',
          bio: '20 years leading civil infrastructure and software engineering teams across Europe. Helping displaced engineers navigate licensing and local interviews.',
          countryOfOrigin: 'Germany',
          hostCountry: 'Germany',
          location: 'Munich, Germany',
          skills: ['Structural Engineering', 'Career Coaching', 'CV Review', 'Technical Interviews'],
          experienceYears: 20,
          avatarUrl: '/src/assets/images/avatar_sample_mentor_1795593657105.jpg',
          consentForEmployerMatching: false,
          isDemo: true,
        },
        {
          uid: 'demo-admin-amara',
          email: 'admin@demo.refugeetalent.org',
          name: 'Dr. Amara Okafor (Platform Admin)',
          role: 'administrator',
          headline: 'Credential Verification & Compliance Director',
          bio: 'Oversees authorized qualification verification workflows, stipend approvals, and SDG impact reporting.',
          countryOfOrigin: 'Nigeria',
          hostCountry: 'United Kingdom',
          location: 'London, United Kingdom',
          skills: ['Credential Verification', 'Compliance', 'Impact Analytics'],
          experienceYears: 12,
          consentForEmployerMatching: false,
          isDemo: true,
        },
      ])
      .returning();

    const layla = insertedUsers.find((u) => u.uid === 'demo-refugee-layla')!;
    const tariq = insertedUsers.find((u) => u.uid === 'demo-refugee-tariq')!;
    const employer = insertedUsers.find((u) => u.uid === 'demo-employer-nordic')!;
    const mentor = insertedUsers.find((u) => u.uid === 'demo-mentor-henrik')!;
    const admin = insertedUsers.find((u) => u.uid === 'demo-admin-amara')!;

    // Mentor profiles
    await db.insert(mentorProfiles).values([
      {
        userId: mentor.id,
        organization: 'AlpineGrid Engineering Partners',
        jobTitle: 'Principal Infrastructure Architect',
        industry: 'Engineering & CleanTech',
        country: 'Germany',
        expertiseAreas: ['Qualification Recognition', 'Eurocode Transition', 'Technical Interviews', 'CV Localization'],
        languages: ['English', 'German', 'Arabic (Basic)'],
        availability: '3 hours / week',
        bio: 'Mentoring displaced civil, mechanical, and software engineers through European credential recognition, technical portfolio reviews, and hiring introductions.',
        isAcceptingMentees: true,
        isDemo: true,
      },
    ]);

    // Employer profile
    await db.insert(employerProfiles).values([
      {
        userId: employer.id,
        companyName: 'NordicGrid CleanTech GmbH',
        industry: 'Renewable Energy & Software',
        country: 'Germany',
        website: 'https://nordicgrid.example.org',
        description: 'Inclusive clean-energy engineering firm actively hiring internationally trained engineers and developers with Work Authorization support.',
        verifiedPartner: true,
        isDemo: true,
      },
    ]);

    // Portfolios
    await db.insert(portfolios).values([
      {
        userId: layla.id,
        summary:
          'Senior Structural & Municipal Infrastructure Engineer with 7 years leading reinforced concrete bridge assessments, drainage networks, and seismic retrofitting.',
        workExperience: [
          {
            id: 'exp-1',
            role: 'Senior Structural Project Engineer',
            organization: 'Levant Civic Infrastructure Group',
            country: 'Syria',
            period: '2018 – 2023',
            summary: 'Led structural design reviews and load-testing for 14 public municipal bridges and transit corridors.',
          },
          {
            id: 'exp-2',
            role: 'Junior Civil Engineer',
            organization: 'Damascus Urban Works',
            country: 'Syria',
            period: '2016 – 2018',
            summary: 'Prepared reinforced concrete structural drawings and site concrete quality inspections.',
          },
        ],
        education: [
          {
            id: 'edu-1',
            degree: 'M.Sc. Structural Engineering',
            institution: 'Damascus University',
            country: 'Syria',
            year: '2016',
          },
        ],
        skills: ['Structural Analysis', 'AutoCAD', 'Eurocode', 'Project Management', 'Concrete Design'],
        projects: [
          {
            id: 'proj-1',
            title: 'Seismic Retrofit Assessment for Multi-Span Viaduct',
            description: 'Nonlinear pushover modeling and CFRP column jacketing specifications reducing lateral drift by 38%.',
            link: '',
            skills: ['Structural Analysis', 'Seismic Design'],
          },
        ],
        languages: ['Arabic (Native)', 'English (C1)', 'German (B1)'],
      },
      {
        userId: tariq.id,
        summary:
          'Full-Stack TypeScript & PostgreSQL Engineer experienced in high-availability financial APIs, React dashboards, and automated testing.',
        workExperience: [
          {
            id: 'exp-t1',
            role: 'Senior Full-Stack Developer',
            organization: 'Dnipro FinTech Systems',
            country: 'Ukraine',
            period: '2020 – 2024',
            summary: 'Architected payment reconciliation services handling 1.2M daily transactions using Node.js and PostgreSQL.',
          },
        ],
        education: [
          {
            id: 'edu-t1',
            degree: 'B.Sc. Computer Science',
            institution: 'National Technical University of Ukraine',
            country: 'Ukraine',
            year: '2018',
          },
        ],
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        projects: [
          {
            id: 'proj-t1',
            title: 'Open Ledger Reconciliation Microservice',
            description: 'Idempotent PostgreSQL transaction ledger with strict audit trail and automated anomaly alerts.',
            link: '',
            skills: ['TypeScript', 'PostgreSQL'],
          },
        ],
        languages: ['Ukrainian (Native)', 'English (C1)'],
      },
    ]);

    // Credentials
    await db.insert(credentials).values([
      {
        userId: layla.id,
        qualificationTitle: 'Master of Science in Structural Engineering',
        institutionName: 'Damascus University',
        countryOfQualification: 'Syria',
        graduationYear: 2016,
        fieldOfStudy: 'Civil & Structural Engineering',
        notes: 'Original bilingual transcript uploaded; awaiting German ZAB equivalency confirmation.',
        status: 'Under review',
        reviewerNotes: 'Initial document clarity verified; scheduled for ZAB comparison review.',
        isDemo: true,
      },
      {
        userId: tariq.id,
        qualificationTitle: 'Bachelor of Science in Computer Science',
        institutionName: 'Igor Sikorsky Kyiv Polytechnic Institute',
        countryOfQualification: 'Ukraine',
        graduationYear: 2018,
        fieldOfStudy: 'Software Engineering',
        notes: 'Apostilled diploma and transcript verified.',
        status: 'Verified by authorized reviewer',
        reviewerId: admin.id,
        reviewerNotes: 'Verified against UK ENIC / European higher education registry.',
        authorizedInstitutionRef: 'ENIC-UK-2026-4418',
        isDemo: true,
      },
    ]);

    // Assessment attempts
    const allAssessments = await db.select().from(skillsAssessments);
    const sweAssessment = allAssessments.find((a) => a.category === 'Software Engineering');
    const civAssessment = allAssessments.find((a) => a.category === 'Engineering');

    if (civAssessment) {
      await db.insert(assessmentAttempts).values({
        assessmentId: civAssessment.id,
        userId: layla.id,
        answers: { 'civ-1': 1, 'civ-2': 1, 'civ-3': 1, 'civ-4': 0 },
        scorePercent: 100,
        passed: true,
        competencyBreakdown: {
          'Structural Analysis': 100,
          'Materials & Durability': 100,
          Geotechnics: 100,
          'Standards & Compliance': 100,
        },
        practicalEvidenceSummary: 'Uploaded 18-page structural calculation portfolio for urban overpass rehabilitation.',
        isDemo: true,
      });
    }
    if (sweAssessment) {
      await db.insert(assessmentAttempts).values({
        assessmentId: sweAssessment.id,
        userId: tariq.id,
        answers: { 'swe-1': 1, 'swe-2': 2, 'swe-3': 1, 'swe-4': 0, 'swe-5': 1 },
        scorePercent: 100,
        passed: true,
        competencyBreakdown: {
          'API Security': 100,
          'Data Modeling': 100,
          'System Architecture': 100,
          'Frontend Engineering': 100,
          'Cloud & Databases': 100,
        },
        practicalEvidenceSummary: 'Submitted production PostgreSQL schema migration & TypeScript API repository summary.',
        isDemo: true,
      });
    }

    // Legal readiness progress
    await db.insert(legalReadinessProgress).values({
      userId: layla.id,
      countryCode: 'DE',
      completedItemIds: ['de-1', 'de-3'],
      notes: 'Residence permit confirmed with full work rights; ZAB application submitted.',
    });

    // Courses & Funding Requests
    const allCourses = await db.select().from(courses);
    const eurocodeCourse = allCourses[0];
    await db.insert(fundingRequests).values([
      {
        userId: layla.id,
        requestType: 'Bridging Course',
        courseId: eurocodeCourse?.id ?? null,
        title: 'Eurocode 2 & 8 Accreditation Tuition + Exam Fee Support',
        amountRequested: 850,
        currency: 'EUR',
        justification: 'Required to complete German Chamber of Engineers equivalency registration.',
        status: 'Approved',
        adminNotes: 'Approved under SDG 4 & SDG 8 Skilled Engineering Bridge Grant (Demo Record).',
        isDemo: true,
      },
      {
        userId: tariq.id,
        requestType: 'Certification Fee Support',
        title: 'AWS Solutions Architect Associate Exam Voucher',
        amountRequested: 150,
        currency: 'GBP',
        justification: 'Supporting UK cloud engineering employer placement interviews.',
        status: 'Under Review',
        adminNotes: 'Pending final assessment verification.',
        isDemo: true,
      },
    ]);

    // Mentorship requests
    await db.insert(mentorshipRequests).values([
      {
        refugeeId: layla.id,
        mentorUserId: mentor.id,
        topic: 'German Civil Engineering Chamber Registration & Portfolio Localization',
        goals: 'Translate 3 structural case studies into Eurocode terminology and prepare for technical interviews.',
        message: 'Hello Dr. Weber, I have 7 years of bridge engineering experience and would value guidance on Berlin engineering employers.',
        status: 'Accepted',
        mentorResponse: 'Welcome Layla! Let us review your structural portfolio and align it with DIN EN 1992 standards this Thursday.',
        isDemo: true,
      },
    ]);

    // Jobs
    const insertedJobs = await db
      .insert(jobs)
      .values([
        {
          employerUserId: employer.id,
          companyName: 'NordicGrid CleanTech GmbH',
          title: 'Structural & Substation Infrastructure Engineer',
          opportunityType: 'Full-time Job',
          industry: 'Engineering & CleanTech',
          location: 'Berlin, Germany',
          country: 'Germany',
          isRemote: false,
          salaryRange: '€58,000 – €72,000',
          requiredSkills: ['Structural Analysis', 'AutoCAD', 'Eurocode', 'Project Management'],
          description:
            'Design concrete foundations and structural steel frames for clean-energy grid substations. Paid Eurocode onboarding mentorship included.',
          status: 'Open',
          isDemo: true,
        },
        {
          employerUserId: employer.id,
          companyName: 'NordicGrid CleanTech GmbH',
          title: 'Full-Stack TypeScript & Telemetry Engineer',
          opportunityType: 'Remote Opportunity',
          industry: 'Software & Cloud',
          location: 'Remote (Europe / UK)',
          country: 'United Kingdom',
          isRemote: true,
          salaryRange: '£55,000 – £70,000',
          requiredSkills: ['TypeScript', 'React', 'PostgreSQL', 'Node.js'],
          description:
            'Build real-time renewable energy monitoring dashboards and resilient PostgreSQL APIs. Open to qualified displaced technologists across Europe and UK.',
          status: 'Open',
          isDemo: true,
        },
        {
          employerUserId: employer.id,
          companyName: 'NordicGrid CleanTech GmbH',
          title: 'Grid Analytics & Integration Fellowship',
          opportunityType: 'Fellowship',
          industry: 'Software & Cloud',
          location: 'Berlin / Hybrid',
          country: 'Germany',
          isRemote: true,
          salaryRange: '€3,200 / month Stipend',
          requiredSkills: ['PostgreSQL', 'Data Analysis', 'Python', 'Technical Writing'],
          description:
            '6-month paid fellowship designed specifically to bridge internationally trained engineers into local European clean-tech engineering teams.',
          status: 'Open',
          isDemo: true,
        },
        {
          employerUserId: employer.id,
          companyName: 'NordicGrid CleanTech GmbH',
          title: 'Junior Civil CAD & Compliance Intern',
          opportunityType: 'Internship',
          industry: 'Engineering & CleanTech',
          location: 'Munich, Germany',
          country: 'Germany',
          isRemote: false,
          salaryRange: '€2,100 / month',
          requiredSkills: ['AutoCAD', 'Concrete Design', 'Technical Writing'],
          description:
            'Structured 4-month paid internship offering supervised German site documentation experience and work-permit onboarding support.',
          status: 'Open',
          isDemo: true,
        },
      ])
      .returning();

    // Job applications
    if (insertedJobs[0] && insertedJobs[1]) {
      await db.insert(jobApplications).values([
        {
          jobId: insertedJobs[0].id,
          refugeeId: layla.id,
          coverLetter:
            'With 7 years leading reinforced concrete bridge and infrastructure design, I am excited to contribute to NordicGrid CleanTech substation projects while completing my Eurocode bridge.',
          status: 'Interviewing',
          employerNotes: 'Strong structural background; technical panel scheduled.',
          isDemo: true,
        },
        {
          jobId: insertedJobs[1].id,
          refugeeId: tariq.id,
          coverLetter:
            'Bringing 6 years of production TypeScript and PostgreSQL architecture experience to your grid telemetry platform.',
          status: 'Placed',
          employerNotes: 'Offer accepted and onboarded via RefugeeTalent Connect.',
          isDemo: true,
        },
      ]);
    }

    // Notifications
    await db.insert(notifications).values([
      {
        userId: layla.id,
        title: 'Mentorship Request Accepted',
        message: 'Dr. Henrik Weber accepted your mentorship request on German Civil Engineering Chamber Registration.',
        category: 'mentorship',
        linkSection: 'track3',
      },
      {
        userId: layla.id,
        title: 'Bridging Course Grant Approved',
        message: 'Your EUR 850 funding request for Eurocode 2 & 8 Accreditation was approved (Demo Record).',
        category: 'funding',
        linkSection: 'funding',
      },
      {
        userId: layla.id,
        title: 'Credential Under Review',
        message: 'Your M.Sc. Structural Engineering credential is currently under authorized reviewer assessment.',
        category: 'credential',
        linkSection: 'track1',
      },
    ]);
  }
}
