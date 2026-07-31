import type { Metadata } from "next";

import { LiveRunScreen } from "@/components/runs/LiveRunScreen";
import { isBrowserbaseConfigured } from "@/lib/browser/server/browserbase";

export const metadata: Metadata = {
  title: "Live validation run",
  description: "Live tester evidence for a funded Playground validation run.",
};

export const dynamic = "force-dynamic";

export default async function LiveRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <LiveRunScreen
      browserbaseConfigured={isBrowserbaseConfigured()}
      runId={id}
    />
  );
}
