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

/**
 * What Playground keeps about the Pinch side of a campaign. Deliberately
 * narrow: identifiers and the hosted URL only. No credentials, no tokens, and
 * no payment instrument details are ever stored client-side.
 */
export interface CampaignPinchState {
  environment: "sandbox";
  payerId: string | null;
  paymentLinkId: string | null;
  hostedUrl: string | null;
  requestedAt: number | null;
}

export interface Campaign {
  id: string;
  status: CampaignStatus;
  founderName: string;
  founderEmail: string;
  companyName: string;
  productUrl: string;
  validationQuestion: string;
  audience: CampaignAudience;
  packageId: CampaignPackageId;
  pricing: CampaignPricing;
  pinch: CampaignPinchState;
  createdAt: number;
  updatedAt: number;
}

// Checkout request/response types live with the Pinch service in
// lib/pinch/types.ts, since they describe that integration's contract.
