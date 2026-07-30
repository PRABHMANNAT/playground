"use client";

import {
  FIRST_FIVE_PACKAGE,
  SEEDED_AUDIENCE_ESTIMATE,
} from "@/lib/campaign/package";
import type {
  Campaign,
  CampaignFormValues,
  CampaignStatus,
  TesterSubmission,
} from "@/lib/campaign/types";
import { isFundedStatus } from "@/lib/pinch/types";
import { playgroundDb } from "@/lib/product/db";

export const DEMO_CAMPAIGN_ID = "cmp_001";

const SEEDED_AT = Date.UTC(2026, 6, 31, 4, 30, 0);

const SEEDED_SUBMISSIONS: readonly TesterSubmission[] = [
  {
    id: "seed_cmp_001_01",
    campaignId: DEMO_CAMPAIGN_ID,
    testerName: "Seeded recruiter 01",
    issue:
      "I understood that INGEN supports hiring decisions, but I could not see the evidence recruiters receive.",
    severity: "High",
    expectedBehaviour:
      "A visual example of the evidence dossier on the first screen.",
    recommendation: "Place a sample evidence dossier beside the main claim.",
    loomUrl: "",
    finalVerdict: "modification",
    sourceType: "seeded_demo",
    qualityStatus: "Quality review pending",
    rewardAmount: 20,
    rewardStatus: "manual_review",
    submittedAt: SEEDED_AT + 1_000,
  },
  {
    id: "seed_cmp_001_02",
    campaignId: DEMO_CAMPAIGN_ID,
    testerName: "Seeded recruiter 02",
    issue:
      "The language sounds differentiated, but the decision a recruiter can make is not concrete.",
    severity: "High",
    expectedBehaviour:
      "One specific hiring decision connected to the evidence INGEN provides.",
    recommendation: "Name one recruiter decision and the evidence behind it.",
    loomUrl: "",
    finalVerdict: "modification",
    sourceType: "seeded_demo",
    qualityStatus: "Quality review pending",
    rewardAmount: 20,
    rewardStatus: "manual_review",
    submittedAt: SEEDED_AT + 2_000,
  },
  {
    id: "seed_cmp_001_03",
    campaignId: DEMO_CAMPAIGN_ID,
    testerName: "Seeded recruiter 03",
    issue:
      "I found the demo action, but did not know how long it takes or what happens next.",
    severity: "Medium",
    expectedBehaviour:
      "A short explanation of the demo duration, agenda and next step.",
    recommendation: "Add duration, agenda and the next step beside the action.",
    loomUrl: "",
    finalVerdict: "modification",
    sourceType: "seeded_demo",
    qualityStatus: "Quality review pending",
    rewardAmount: 20,
    rewardStatus: "manual_review",
    submittedAt: SEEDED_AT + 3_000,
  },
  {
    id: "seed_cmp_001_04",
    campaignId: DEMO_CAMPAIGN_ID,
    testerName: "Seeded recruiter 04",
    issue:
      "The proof-first category was understandable, but there was not enough visible proof to earn trust.",
    severity: "Medium",
    expectedBehaviour:
      "A credible product example supporting the proof-first category claim.",
    recommendation: "Support the category claim with one credible example.",
    loomUrl: "",
    finalVerdict: "modification",
    sourceType: "seeded_demo",
    qualityStatus: "Quality review pending",
    rewardAmount: 20,
    rewardStatus: "manual_review",
    submittedAt: SEEDED_AT + 4_000,
  },
];

type LegacyCampaign = {
  id: string;
  status?: CampaignStatus;
  founderName?: string;
  founderEmail?: string;
  companyName?: string;
  productUrl?: string;
  validationQuestion?: string;
  audience?: Campaign["audience"];
  pricing?: { campaignFunding?: number; currency?: "AUD" };
  pinch?: {
    payerId?: string | null;
    paymentLinkId?: string | null;
    paymentId?: string | null;
    approvedAt?: number | null;
  };
  createdAt?: number;
};

type LegacySubmission = {
  id: string;
  campaignId: string;
  issue?: string;
  severity?: TesterSubmission["severity"];
  expected?: string;
  recommendation?: string;
  loomUrl?: string;
  verdict?: TesterSubmission["finalVerdict"];
  qualityStatus?: TesterSubmission["qualityStatus"];
  submittedAt?: number;
};

function createSeedCampaign(now = Date.now()): Campaign {
  return {
    id: DEMO_CAMPAIGN_ID,
    companyName: "INGEN",
    founderName: "Prabhmannat Singh",
    founderEmail: "founder@ingenworkspace.com",
    productUrl: "https://www.ingenworkspace.com",
    validationQuestion:
      "Can a recruiter understand the product and request a demo?",
    audience: {
      role: "Recruiter",
      location: "Australia",
      experience: "2+ years",
      behaviour: "Uses hiring software",
      testerCount: 5,
      estimatedMatches: SEEDED_AUDIENCE_ESTIMATE,
    },
    packageName: FIRST_FIVE_PACKAGE.name,
    amount: FIRST_FIVE_PACKAGE.pricing.campaignFunding,
    currency: "AUD",
    status: "draft",
    pinchPayerId: null,
    pinchPaymentLinkId: null,
    pinchPaymentId: null,
    paymentStatus: null,
    createdAt: now,
    fundedAt: null,
    activatedAt: null,
  };
}

function migrateCampaign(value: LegacyCampaign): Campaign {
  const seed = createSeedCampaign(value.createdAt ?? Date.now());
  return {
    ...seed,
    id: value.id || seed.id,
    status: value.status ?? seed.status,
    founderName: value.founderName ?? seed.founderName,
    founderEmail: value.founderEmail ?? seed.founderEmail,
    companyName: value.companyName ?? seed.companyName,
    productUrl: value.productUrl ?? seed.productUrl,
    validationQuestion:
      value.validationQuestion ?? seed.validationQuestion,
    audience: value.audience ?? seed.audience,
    amount: value.pricing?.campaignFunding ?? seed.amount,
    currency: value.pricing?.currency ?? seed.currency,
    pinchPayerId: value.pinch?.payerId ?? null,
    pinchPaymentLinkId: value.pinch?.paymentLinkId ?? null,
    pinchPaymentId: value.pinch?.paymentId ?? null,
    paymentStatus:
      value.pinch?.paymentId && value.status !== "payment_pending"
        ? "approved"
        : null,
    fundedAt: value.pinch?.approvedAt ?? null,
    activatedAt:
      value.status === "live" ||
      value.status === "evidence_pending" ||
      value.status === "results_ready"
        ? value.pinch?.approvedAt ?? null
        : null,
  };
}

function migrateSubmission(value: LegacySubmission): TesterSubmission {
  return {
    id: value.id,
    campaignId: value.campaignId,
    testerName: "Alex Morgan",
    issue: value.issue ?? "",
    severity: value.severity ?? "High",
    expectedBehaviour: value.expected ?? "",
    recommendation: value.recommendation ?? "",
    loomUrl: value.loomUrl ?? "",
    finalVerdict: value.verdict ?? "modification",
    sourceType: "live_demo",
    qualityStatus: value.qualityStatus ?? "Quality review pending",
    rewardAmount: 20,
    rewardStatus: "reserved",
    submittedAt: value.submittedAt ?? Date.now(),
  };
}

async function ensureDemoState(): Promise<void> {
  await playgroundDb.transaction(
    "rw",
    [playgroundDb.campaigns, playgroundDb.campaignSubmissions],
    async () => {
      const rawCampaign = (await playgroundDb.campaigns.get(
        DEMO_CAMPAIGN_ID,
      )) as unknown as Campaign | LegacyCampaign | undefined;
      if (!rawCampaign) {
        await playgroundDb.campaigns.put(createSeedCampaign());
      } else if (!("packageName" in rawCampaign)) {
        await playgroundDb.campaigns.put(
          migrateCampaign(rawCampaign as LegacyCampaign),
        );
      }

      const existingSubmissions =
        (await playgroundDb.campaignSubmissions
          .where("campaignId")
          .equals(DEMO_CAMPAIGN_ID)
          .toArray()) as unknown as Array<
          TesterSubmission | LegacySubmission
        >;
      for (const existing of existingSubmissions) {
        if (!("sourceType" in existing)) {
          await playgroundDb.campaignSubmissions.put(
            migrateSubmission(existing as LegacySubmission),
          );
        }
      }
      await playgroundDb.campaignSubmissions.bulkPut([...SEEDED_SUBMISSIONS]);
    },
  );
}

export async function createCampaign(
  values: CampaignFormValues,
): Promise<Campaign> {
  await ensureDemoState();
  const now = Date.now();
  const campaign: Campaign = {
    id: DEMO_CAMPAIGN_ID,
    companyName: values.companyName,
    founderName: values.founderName,
    founderEmail: values.founderEmail,
    productUrl: values.productUrl,
    validationQuestion: values.validationQuestion,
    audience: {
      role: values.audienceRole,
      location: values.audienceLocation,
      experience: values.audienceExperience,
      behaviour: values.audienceBehaviour,
      testerCount: values.testerCount,
      estimatedMatches: SEEDED_AUDIENCE_ESTIMATE,
    },
    packageName: FIRST_FIVE_PACKAGE.name,
    amount: FIRST_FIVE_PACKAGE.pricing.campaignFunding,
    currency: "AUD",
    status: "draft",
    pinchPayerId: null,
    pinchPaymentLinkId: null,
    pinchPaymentId: null,
    paymentStatus: null,
    createdAt: now,
    fundedAt: null,
    activatedAt: null,
  };

  await playgroundDb.transaction(
    "rw",
    [playgroundDb.campaigns, playgroundDb.campaignSubmissions],
    async () => {
      const existing = await playgroundDb.campaignSubmissions
        .where("campaignId")
        .equals(DEMO_CAMPAIGN_ID)
        .filter((submission) => submission.sourceType === "live_demo")
        .primaryKeys();
      await playgroundDb.campaignSubmissions.bulkDelete(existing);
      await playgroundDb.campaigns.put(campaign);
    },
  );
  return campaign;
}

const ALLOWED_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  draft: ["payment_pending"],
  payment_pending: ["draft", "funded"],
  funded: ["live"],
  live: ["evidence_pending"],
  evidence_pending: ["results_ready"],
  results_ready: ["live"],
};

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
): Promise<Campaign> {
  await ensureDemoState();
  const campaign = await playgroundDb.campaigns.get(id);
  if (!campaign) {
    throw new Error(`Campaign ${id} was not found.`);
  }
  if (campaign.status === status) {
    return campaign;
  }
  if (!ALLOWED_TRANSITIONS[campaign.status].includes(status)) {
    throw new Error(
      `Campaign cannot move from ${campaign.status} to ${status}.`,
    );
  }

  const now = Date.now();
  const updated: Campaign = {
    ...campaign,
    status,
    fundedAt:
      status === "funded" ? campaign.fundedAt ?? now : campaign.fundedAt,
    activatedAt:
      status === "live" ? campaign.activatedAt ?? now : campaign.activatedAt,
  };
  await playgroundDb.campaigns.put(updated);
  return updated;
}

export async function attachPinchPayment(
  id: string,
  payment: {
    payerId?: string | null;
    paymentLinkId?: string | null;
    paymentId?: string | null;
    paymentStatus?: string | null;
  },
): Promise<Campaign> {
  await ensureDemoState();
  const campaign = await playgroundDb.campaigns.get(id);
  if (!campaign) {
    throw new Error(`Campaign ${id} was not found.`);
  }

  const updated: Campaign = {
    ...campaign,
    pinchPayerId: payment.payerId ?? campaign.pinchPayerId,
    pinchPaymentLinkId:
      payment.paymentLinkId ?? campaign.pinchPaymentLinkId,
    pinchPaymentId: payment.paymentId ?? campaign.pinchPaymentId,
    paymentStatus: payment.paymentStatus ?? campaign.paymentStatus,
  };
  await playgroundDb.campaigns.put(updated);
  return updated;
}

export async function saveTesterSubmission(
  input: Omit<TesterSubmission, "id" | "submittedAt">,
): Promise<TesterSubmission> {
  await ensureDemoState();
  if (input.sourceType === "seeded_demo" && input.rewardStatus === "paid") {
    throw new Error("Seeded demo submissions cannot have a paid reward state.");
  }

  const campaign = await playgroundDb.campaigns.get(input.campaignId);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }
  if (
    input.sourceType === "live_demo" &&
    !["live", "evidence_pending", "results_ready"].includes(campaign.status)
  ) {
    throw new Error("The campaign must be live before evidence is submitted.");
  }

  const submission: TesterSubmission = {
    ...input,
    id: `sub_${crypto.randomUUID()}`,
    submittedAt: Date.now(),
  };

  await playgroundDb.transaction(
    "rw",
    [playgroundDb.campaignSubmissions, playgroundDb.campaigns],
    async () => {
      if (input.sourceType === "live_demo") {
        const existingLiveIds = await playgroundDb.campaignSubmissions
          .where("campaignId")
          .equals(input.campaignId)
          .filter((item) => item.sourceType === "live_demo")
          .primaryKeys();
        await playgroundDb.campaignSubmissions.bulkDelete(existingLiveIds);
      }
      await playgroundDb.campaignSubmissions.add(submission);
      if (campaign.status === "live") {
        await playgroundDb.campaigns.put({
          ...campaign,
          status: "evidence_pending",
        });
      }
    },
  );

  return submission;
}

export async function getCampaign(
  id: string,
): Promise<Campaign | undefined> {
  await ensureDemoState();
  return playgroundDb.campaigns.get(id);
}

export async function getCampaignSubmissions(
  campaignId: string,
): Promise<TesterSubmission[]> {
  await ensureDemoState();
  return playgroundDb.campaignSubmissions
    .where("campaignId")
    .equals(campaignId)
    .sortBy("submittedAt");
}

export async function getLatestCampaignSubmission(
  campaignId: string,
): Promise<TesterSubmission | undefined> {
  const submissions = await getCampaignSubmissions(campaignId);
  return submissions
    .filter((submission) => submission.sourceType === "live_demo")
    .sort((a, b) => b.submittedAt - a.submittedAt)[0];
}

export async function resetDemo(): Promise<void> {
  await playgroundDb.transaction(
    "rw",
    [playgroundDb.campaigns, playgroundDb.campaignSubmissions],
    async () => {
      await playgroundDb.campaigns.delete(DEMO_CAMPAIGN_ID);
      const submissionIds = await playgroundDb.campaignSubmissions
        .where("campaignId")
        .equals(DEMO_CAMPAIGN_ID)
        .primaryKeys();
      await playgroundDb.campaignSubmissions.bulkDelete(submissionIds);
    },
  );
  localStorage.removeItem("playground.activeSessionId");
  localStorage.removeItem("playground.lastMode");
  await ensureDemoState();
}

/**
 * Only a server-verified funded status may activate the campaign. Redirect
 * parameters are identifiers, not proof of payment.
 */
export async function activateCampaignAfterVerification(
  id: string,
  verification: { verified: boolean; status: string },
): Promise<{ activated: boolean; reason?: string }> {
  if (!verification.verified || !isFundedStatus(verification.status)) {
    return {
      activated: false,
      reason: `Payment status "${verification.status}" is not a funded status.`,
    };
  }

  await ensureDemoState();
  const campaign = await playgroundDb.campaigns.get(id);
  if (!campaign) {
    return { activated: false, reason: "Campaign not found." };
  }
  if (
    campaign.status === "live" ||
    campaign.status === "evidence_pending" ||
    campaign.status === "results_ready"
  ) {
    return { activated: true };
  }
  if (campaign.status !== "payment_pending") {
    return {
      activated: false,
      reason: `Campaign is ${campaign.status}, not payment_pending.`,
    };
  }

  await updateCampaignStatus(id, "funded");
  await updateCampaignStatus(id, "live");
  return { activated: true };
}
