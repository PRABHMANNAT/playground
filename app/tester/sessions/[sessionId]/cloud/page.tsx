import Link from "next/link";

import { BrowserLabClient } from "@/components/browser-lab/BrowserLabClient";
import { isBrowserbaseConfigured } from "@/lib/browser/server/browserbase";

export const dynamic = "force-dynamic";

export default async function CloudSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <>
      <Link
        className="cloud-review-link"
        href={`/tester/sessions/${sessionId}/review`}
      >
        Review saved evidence →
      </Link>
      <BrowserLabClient
        browserbaseConfigured={isBrowserbaseConfigured()}
        defaultUrl="https://ingen-hrandstudent-5.vercel.app"
        productSessionId={sessionId}
      />
    </>
  );
}
