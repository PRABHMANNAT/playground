import type { Metadata } from "next";

import { BrowserLabClient } from "@/components/browser-lab/BrowserLabClient";
import { isBrowserbaseConfigured } from "@/lib/browser/server/browserbase";

export const metadata: Metadata = {
  title: "Tester Workspace",
  description:
    "Test a product inside a guided, isolated cloud browser workspace.",
};

export const dynamic = "force-dynamic";

export default function BrowserLabPage() {
  return (
    <BrowserLabClient browserbaseConfigured={isBrowserbaseConfigured()} />
  );
}
