import type { Metadata } from "next";

import { TesterCampaignClient } from "@/components/campaigns/TesterCampaignClient";
import { isBrowserbaseConfigured } from "@/lib/browser/server/browserbase";

export const metadata: Metadata = {
  title: "Recruiter onboarding validation",
  description:
    "A focused tester run for evidence-backed recruiter onboarding feedback.",
};

export const dynamic = "force-dynamic";

export default async function TesterCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <TesterCampaignClient
      browserbaseConfigured={isBrowserbaseConfigured()}
      campaignId={id}
    />
  );
}
