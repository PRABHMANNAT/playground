export type AssignmentStatus =
  | "available"
  | "accepted"
  | "launching"
  | "in-progress"
  | "review-required"
  | "submitted"
  | "cancelled"
  | "unavailable";

export type TestMode = "cloud" | "chrome";
export type FeedbackCategory =
  | "confusing"
  | "broken"
  | "frustrating"
  | "suggestion"
  | "works-well"
  | "overall";

export interface ReviewerProfile {
  id: string;
  displayName: string;
  headline: string;
  biography: string;
  yearsExperience: number;
  roles: string[];
  domains: string[];
  skills: string[];
  testingPreferences: string[];
  payoutCurrency: "AUD";
  privacyAcknowledged: boolean;
  modelImprovementConsent: boolean;
  completedTests: number;
  qualityScore: number;
}

export interface Project {
  id: string;
  name: string;
  tagline: string;
  url: string | null;
  reward: number;
  currency: "AUD";
  estimatedMinutes: number;
  taskCount: number;
  matchScore: number;
  testType: string;
  whyMatched: string[];
  objective: string;
  founderQuestions: string[];
  status: AssignmentStatus;
  demoBriefOnly: boolean;
}

export interface Assignment {
  id: string;
  reviewerId: string;
  projectId: string;
  status: AssignmentStatus;
  acceptedAt: number | null;
  submittedAt: number | null;
}

export interface TestSession {
  id: string;
  assignmentId: string;
  projectId: string;
  reviewerId: string;
  mode: TestMode;
  state:
    | "preparing"
    | "launching"
    | "testing"
    | "reviewing"
    | "verdict"
    | "submitted"
    | "launch-failed";
  startedAt: number;
  endedAt: number | null;
  submittedAt: number | null;
  currentTaskId: string;
  browserSessionId: string | null;
}

export interface SessionTask {
  id: string;
  sessionId: string;
  sequence: number;
  title: string;
  instructions: string;
  required: boolean;
  status: "locked" | "ready" | "in-progress" | "completed" | "blocked";
  difficulty: "easy" | "moderate" | "hard" | null;
  outcome: string;
  startedAt: number | null;
  completedAt: number | null;
}

export interface ScreenshotRecord {
  id: string;
  sessionId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface Annotation {
  id: string;
  type: "highlight" | "rectangle" | "arrow" | "pin" | "blur" | "crop";
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface VoiceNote {
  id: string;
  sessionId: string;
  taskId: string;
  audio: Blob;
  durationMs: number;
  rawTranscript: string;
  editedTranscript: string;
  transcriptionStatus: "unsupported" | "manual" | "complete" | "failed";
  createdAt: number;
}

export interface ScreenVisit {
  id: string;
  sessionId: string;
  sequence: number;
  url: string;
  route: string;
  title: string;
  enteredAt: number;
  exitedAt: number | null;
  timeSpentMs: number;
  feedbackCount: number;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: string;
  createdAt: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface FeedbackItem {
  id: string;
  sessionId: string;
  projectId: string;
  assignmentId: string;
  taskId: string;
  category: FeedbackCategory;
  scope: "element" | "region" | "screen" | "workflow" | "product" | "concept";
  originalText: string;
  summary: string;
  severity: "low" | "medium" | "high";
  screenshotIds: string[];
  voiceNoteId: string | null;
  followUpAnswers: Record<string, string>;
  status: "draft" | "saved";
  createdAt: number;
  updatedAt: number;
}

export interface EvidenceCapsule {
  id: string;
  feedbackId: string;
  sessionId: string;
  projectId: string;
  assignmentId: string;
  reviewerId: string;
  taskId: string;
  screenVisitId: string | null;
  pageUrl: string;
  viewport: "desktop" | "mobile";
  category: FeedbackCategory;
  scope: FeedbackItem["scope"];
  originalText: string;
  reviewerApprovedSummary: string;
  severity: FeedbackItem["severity"];
  screenshotIds: string[];
  voiceNoteId: string | null;
  professionalBasis: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExpertVerdict {
  id: string;
  sessionId: string;
  useDecision: "yes" | "maybe" | "no";
  confidence: "low" | "medium" | "high";
  biggestStrength: string;
  biggestWeakness: string;
  mostImportantChange: string;
  founderMisunderstanding: string;
  adoptionBlocker: string;
  trustEvidence: string;
  bestCustomer: string;
  avoidCustomer: string;
  valuableButUnnecessary: string;
  finalMessage: string;
  professionalBasis: string;
  createdAt: number;
}

export interface EarningRecord {
  id: string;
  sessionId: string;
  projectId: string;
  amount: number;
  currency: "AUD";
  status: "pending" | "approved" | "paid" | "rejected";
  description: string;
  submittedAt: number;
  approvedAt: number | null;
  paidAt: number | null;
  pinchResponse?: StoredPinchPaymentResponse;
}

export interface StoredPinchPaymentResponse {
  id: string;
  status: "approved" | "pending" | "failed";
  environment: "test";
  amount: number;
  currency: "AUD";
  applicationFee: number;
  estimatedTransferDate: string;
  description: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface PressureTest {
  id: string;
  sessionId: string;
  prompt: string;
  reason: string;
  outcome: string;
  status: "ready" | "in-progress" | "completed" | "skipped";
}

export interface FixPreview {
  id: string;
  feedbackId: string;
  proposedFix: string;
  response: "yes" | "partly" | "no" | null;
  reasoning: string;
}

export interface FounderFinding {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  priority: number;
  severity: "low" | "medium" | "high";
  affectedReviewerCount: number;
  evidenceCapsuleIds: string[];
  screen: string;
  recommendedFix: string;
  strategicRelevance: string;
  demoSeeded: boolean;
}
