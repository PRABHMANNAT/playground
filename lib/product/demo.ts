import type {
  EarningRecord,
  FounderFinding,
  Project,
  ReviewerProfile,
  SessionTask,
} from "@/lib/product/types";

export const DEMO_EARNING: EarningRecord = {
  id: "earning-cmp-001-sarah",
  sessionId: "session-cmp-001-sarah",
  projectId: "ingen",
  amount: 30,
  currency: "AUD",
  status: "paid",
  description: "Can a recruiter understand the product?",
  submittedAt: Date.UTC(2026, 6, 31, 4, 40, 0),
  approvedAt: Date.UTC(2026, 6, 31, 4, 42, 0),
  paidAt: Date.UTC(2026, 6, 31, 4, 42, 2),
  pinchResponse: {
    id: "pmt_XXXXXXXX",
    status: "approved",
    environment: "test",
    amount: 4_000,
    currency: "AUD",
    applicationFee: 1_000,
    estimatedTransferDate: "2026-08-03",
    description: "Playground review cmp_001 · Sarah Chen",
    metadata: {
      runId: "cmp_001",
      testerId: "sarah-chen",
      findings: 4,
      verdict: "modify",
    },
  },
};

export const DEMO_REVIEWER: ReviewerProfile = {
  id: "alex-morgan",
  displayName: "Alex Morgan",
  headline: "Hiring Manager and Full-stack Engineer",
  biography:
    "Alex has worked in technical hiring, engineering, and early-stage product development.",
  yearsExperience: 6,
  roles: ["Hiring Manager", "Full-stack Engineer"],
  domains: ["Recruitment", "HR Technology", "Developer Tools"],
  skills: [
    "Technical hiring",
    "Frontend engineering",
    "Backend engineering",
    "Product testing",
    "SaaS usability",
    "Workflow analysis",
  ],
  testingPreferences: [
    "Prototype testing",
    "Expert teardown",
    "Usability testing",
    "Bug hunting",
    "Pressure testing",
  ],
  payoutCurrency: "AUD",
  privacyAcknowledged: true,
  modelImprovementConsent: false,
  completedTests: 12,
  qualityScore: 4.8,
};

export const DEMO_PROJECTS: Project[] = [
  {
    id: "ingen",
    name: "Ingen",
    tagline: "AI hiring and candidate assessment",
    url: "https://ingen-hrandstudent-5.vercel.app",
    reward: 8,
    currency: "AUD",
    estimatedMinutes: 25,
    taskCount: 5,
    matchScore: 96,
    testType: "Prototype teardown",
    whyMatched: [
      "Recruitment experience",
      "Technical hiring experience",
      "Full-stack engineering background",
      "Familiarity with SaaS workflows",
    ],
    objective:
      "Determine whether someone involved in technical hiring can understand, trust, and complete Ingen’s candidate-discovery workflow.",
    founderQuestions: [
      "Is Ingen’s purpose immediately clear?",
      "Can hiring teams distinguish the available job-description creation options?",
      "Are candidate scores and recommendations believable?",
      "Would a hiring manager use this during a real recruitment process?",
      "What appears useful but unnecessary?",
      "What should change before launch?",
    ],
    status: "available",
    demoBriefOnly: false,
  },
  {
    id: "orchestra",
    name: "Orchestra",
    tagline: "AI workspace for coordinating company knowledge and work",
    url: null,
    reward: 6,
    currency: "AUD",
    estimatedMinutes: 20,
    taskCount: 4,
    matchScore: 82,
    testType: "Core workflow test",
    whyMatched: [
      "Team-management experience",
      "Developer-tool experience",
      "Cross-functional workflow experience",
    ],
    objective:
      "Understand whether cross-functional teams can coordinate knowledge and work in one clear workflow.",
    founderQuestions: [
      "Is the workspace model understandable?",
      "Can teams find the right source of truth?",
      "Which coordination steps feel unnecessary?",
    ],
    status: "available",
    demoBriefOnly: true,
  },
];

export const INGEN_TASKS: Array<
  Pick<SessionTask, "sequence" | "title" | "instructions" | "required">
> = [
  {
    sequence: 1,
    title: "Explore Ingen naturally",
    instructions:
      "Explore without a prescribed workflow. Explain what Ingen does, who it is for, and what you would try first.",
    required: true,
  },
  {
    sequence: 2,
    title: "Create a Senior Backend Engineer role",
    instructions:
      "Create an appropriate job description for a Senior Backend Engineer and note any points of friction.",
    required: true,
  },
  {
    sequence: 3,
    title: "Review a candidate recommendation",
    instructions:
      "Inspect a candidate you might interview. Explain whether you trust the recommendation and what evidence is missing.",
    required: true,
  },
  {
    sequence: 4,
    title: "Pressure-test Ingen",
    instructions:
      "Try the tailored challenge Scout reveals after the natural workflow.",
    required: true,
  },
  {
    sequence: 5,
    title: "Final expert teardown",
    instructions: "Complete the structured Expert Verdict after reviewing evidence.",
    required: true,
  },
];

export const SEEDED_FINDINGS: FounderFinding[] = [
  {
    id: "finding-job-description-options",
    projectId: "ingen",
    title: "Job-description creation options are difficult to distinguish",
    summary:
      "Reviewers could not predict the difference between Build JD and Paste JD before choosing.",
    priority: 1,
    severity: "high",
    affectedReviewerCount: 4,
    evidenceCapsuleIds: [],
    screen: "Sherlock",
    recommendedFix:
      "Rename the actions and add one sentence explaining the expected input and result.",
    strategicRelevance:
      "Ambiguity at the workflow entry point reduces confidence before the core product value is experienced.",
    demoSeeded: true,
  },
  {
    id: "finding-ranking-trust",
    projectId: "ingen",
    title: "Candidate ranking needs an evidence trail",
    summary:
      "Hiring reviewers want to understand which experience and requirements drive each score.",
    priority: 2,
    severity: "high",
    affectedReviewerCount: 3,
    evidenceCapsuleIds: [],
    screen: "Candidate recommendation",
    recommendedFix:
      "Show requirement-level evidence and make confidence or uncertainty explicit.",
    strategicRelevance:
      "Trust is a prerequisite for organisational adoption in hiring workflows.",
    demoSeeded: true,
  },
];
