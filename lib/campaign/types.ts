/** Shared campaign state machine for the Playground demo journey. */
export type CampaignStatus =
  | "draft"
  | "payment_pending"
  | "funded"
  | "live"
  | "evidence_pending"
  | "results_ready";

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  "draft",
  "payment_pending",
  "funded",
  "live",
  "evidence_pending",
  "results_ready",
] as const;

export interface CampaignAudience {
  role: string;
  location: string;
  experience: string;
  behaviour: string;
  testerCount: number;
  /**
   * Seeded demo figure. Playground has no real tester panel to size, so this
   * is a fixed number and is labelled as such everywhere it is shown.
   */
  estimatedMatches: number;
}

/** All amounts are whole Australian dollars. */
export interface CampaignPricing {
  currency: "AUD";
  campaignFunding: number;
  testerRewardPool: number;
  foundingUserPool: number;
  grossMargin: number;
}

export type CampaignPackageId = "first-five-useful-users";

export interface CampaignPackage {
  id: CampaignPackageId;
  name: string;
  includes: readonly string[];
  pricing: CampaignPricing;
}

export interface CampaignFormValues {
  founderName: string;
  founderEmail: string;
  companyName: string;
  productUrl: string;
  validationQuestion: string;
  audienceRole: string;
  audienceLocation: string;
  audienceExperience: string;
  audienceBehaviour: string;
  testerCount: number;
}

export type CampaignFormField = keyof CampaignFormValues;

export type CampaignFormErrors = Partial<Record<CampaignFormField, string>>;

export interface Campaign {
  id: string;
  companyName: string;
  founderName: string;
  founderEmail: string;
  productUrl: string;
  validationQuestion: string;
  audience: CampaignAudience;
  packageName: string;
  amount: number;
  currency: "AUD";
  status: CampaignStatus;
  pinchPayerId: string | null;
  pinchPaymentLinkId: string | null;
  pinchPaymentId: string | null;
  paymentStatus: string | null;
  createdAt: number;
  fundedAt: number | null;
  activatedAt: number | null;
}

export type CampaignEvidenceKind =
  | "confusion"
  | "blocker"
  | "recommendation"
  | "screenshot"
  | "loom";

export type CampaignVerdict =
  | "ready"
  | "modification"
  | "blocker"
  | "insufficient";

export type SubmissionSourceType = "live_demo" | "seeded_demo";

export type RewardStatus =
  | "pending"
  | "manual_review"
  | "approved"
  | "paid";

export interface TesterSubmission {
  id: string;
  campaignId: string;
  testerName: string;
  issue: string;
  severity: "Low" | "Medium" | "High";
  expectedBehaviour: string;
  recommendation: string;
  loomUrl: string;
  finalVerdict: CampaignVerdict;
  sourceType: SubmissionSourceType;
  qualityStatus: "Quality review pending" | "Quality approved";
  rewardAmount: number;
  rewardStatus: RewardStatus;
  submittedAt: number;
}

// Checkout request/response types live with the Pinch service in
// lib/pinch/types.ts, since they describe that integration's contract.
