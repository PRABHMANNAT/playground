import type {
  CampaignFormValues,
  CampaignPackage,
  CampaignPricing,
} from "@/lib/campaign/types";

export const CAMPAIGN_PRICING: CampaignPricing = {
  currency: "AUD",
  campaignFunding: 199,
  testerRewardPool: 120,
  foundingUserPool: 20,
  grossMargin: 59,
};

export const FIRST_FIVE_PACKAGE: CampaignPackage = {
  id: "first-five-useful-users",
  name: "First Five Useful Users",
  includes: [
    "AI Scout product analysis",
    "Five matched users",
    "Structured tester missions",
    "Written or Loom evidence",
    "Three recommended fixes",
    "Ship, Modify or Kill verdict",
  ],
  pricing: CAMPAIGN_PRICING,
};

/** Fixed by the package, not chosen by the founder. */
export const PACKAGE_TESTER_COUNT = 5;

/**
 * Seeded figure shown beside the audience definition. Playground has no live
 * panel to query, so this never changes and is always labelled a demo estimate.
 */
export const SEEDED_AUDIENCE_ESTIMATE = 24;

export const DEMO_CAMPAIGN_FORM: CampaignFormValues = {
  founderName: "Prabhmannat Singh",
  founderEmail: "founder@ingenworkspace.com",
  companyName: "INGEN",
  productUrl: "https://www.ingenworkspace.com",
  validationQuestion:
    "Can a recruiter understand the product and request a demo?",
  audienceRole: "Recruiter",
  audienceLocation: "Australia",
  audienceExperience: "2+ years",
  audienceBehaviour: "Uses hiring software",
  testerCount: PACKAGE_TESTER_COUNT,
};

export function formatAud(amount: number): string {
  return `A$${amount}`;
}

/** Pinch expects amounts in cents. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
