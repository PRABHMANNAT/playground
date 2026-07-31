import type { Metadata } from "next";

import { CampaignResultsHandoff } from "@/components/campaigns/CampaignResultsHandoff";

export const metadata: Metadata = {
  title: "Evidence received",
  description: "Validation run evidence saved and awaiting quality review.",
};

export default async function CampaignResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignResultsHandoff campaignId={id} />;
}
