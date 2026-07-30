import type { Metadata } from "next";

import { ScoutCampaignClient } from "@/components/campaigns/ScoutCampaignClient";
import { isBrowserbaseConfigured } from "@/lib/browser/server/browserbase";

export const metadata: Metadata = {
  title: "Scout campaign",
  description: "A funded campaign moving from Pinch approval into validation.",
};

export const dynamic = "force-dynamic";

export default async function ScoutCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ScoutCampaignClient
      browserbaseConfigured={isBrowserbaseConfigured()}
      campaignId={id}
    />
  );
}
