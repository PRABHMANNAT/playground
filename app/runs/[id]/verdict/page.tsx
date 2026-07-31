import type { Metadata } from "next";

import { VerdictPayoutScreen } from "@/components/runs/VerdictPayoutScreen";

export const metadata: Metadata = {
  title: "Verdict and reviewer payouts",
  description: "Review the verdict and approve completed reviewer payouts.",
};

export default async function VerdictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VerdictPayoutScreen runId={id} />;
}
