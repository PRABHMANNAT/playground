"use client";

import {
  FIRST_FIVE_PACKAGE,
  SEEDED_AUDIENCE_ESTIMATE,
} from "@/lib/campaign/package";
import type {
  Campaign,
  CampaignFormValues,
  CampaignStatus,
} from "@/lib/campaign/types";
import { playgroundDb } from "@/lib/product/db";

/**
 * Campaign IDs are sequential and human-readable so the demo journey can be
 * narrated: the first campaign created is always cmp_001, which is the ID the
 * landing page and tester routes point at.
 */
export async function nextCampaignId(): Promise<string> {
  const count = await playgroundDb.campaigns.count();
  return `cmp_${String(count + 1).padStart(3, "0")}`;
}

export async function createDraftCampaign(
  values: CampaignFormValues,
): Promise<Campaign> {
  const now = Date.now();
  const campaign: Campaign = {
    id: await nextCampaignId(),
    status: "draft",
    founderName: values.founderName,
    founderEmail: values.founderEmail,
    companyName: values.companyName,
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
    packageId: FIRST_FIVE_PACKAGE.id,
    pricing: FIRST_FIVE_PACKAGE.pricing,
    pinch: {
      environment: "sandbox",
      payerId: null,
      paymentLinkId: null,
      hostedUrl: null,
      requestedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  await playgroundDb.campaigns.put(campaign);
  return campaign;
}

export async function setCampaignStatus(
  id: string,
  status: CampaignStatus,
): Promise<void> {
  await playgroundDb.campaigns.update(id, { status, updatedAt: Date.now() });
}

export async function recordPinchCheckout(
  id: string,
  pinch: {
    payerId: string;
    paymentLinkId: string | null;
    hostedUrl: string;
  },
): Promise<void> {
  await playgroundDb.campaigns.update(id, {
    pinch: {
      environment: "sandbox",
      payerId: pinch.payerId,
      paymentLinkId: pinch.paymentLinkId,
      hostedUrl: pinch.hostedUrl,
      requestedAt: Date.now(),
    },
    updatedAt: Date.now(),
  });
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  return playgroundDb.campaigns.get(id);
}

/**
 * The only supported way to move a campaign out of payment_pending.
 *
 * A campaign is never funded because the browser came back from checkout with
 * query parameters on the URL — those are attacker-controllable and, per
 * Pinch's own documentation, the redirect is not an authoritative success
 * signal. The caller must pass the result of GET /api/pinch/verify-payment,
 * and this function refuses anything that is not server-verified.
 */
export async function activateCampaignAfterVerification(
  id: string,
  verification: { verified: boolean; status: string },
): Promise<{ activated: boolean; reason?: string }> {
  if (!verification.verified) {
    return {
      activated: false,
      reason: `Payment status "${verification.status}" is not a funded status.`,
    };
  }

  const campaign = await playgroundDb.campaigns.get(id);
  if (!campaign) {
    return { activated: false, reason: "Campaign not found." };
  }

  await playgroundDb.campaigns.update(id, {
    status: "funded",
    updatedAt: Date.now(),
  });
  return { activated: true };
}
