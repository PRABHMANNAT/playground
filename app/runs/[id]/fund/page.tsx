import type { Metadata } from "next";

import { RunFundingScreen } from "@/components/fund/RunFundingScreen";
import { DEMO_CAMPAIGN_FORM } from "@/lib/campaign/package";
import { getPinchCaptureConfig } from "@/lib/pinch/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fund the run",
  description: "Fund a Playground validation run through Pinch.",
};

export default async function RunFundingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ decision?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const decision =
    query.decision?.trim().slice(0, 140) ||
    DEMO_CAMPAIGN_FORM.validationQuestion;

  let publishableKey = "";
  try {
    const config = await getPinchCaptureConfig();
    publishableKey = config.publishableKey;
  } catch {
    // CaptureJS stays unmounted; the form still submits without it.
  }

  return (
    <RunFundingScreen
      runId={id}
      decision={decision}
      publishableKey={publishableKey}
    />
  );
}
