import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CampaignForm } from "@/components/founder/CampaignForm";
import { ScoutBrief } from "@/components/founder/ScoutBrief";
import { RoleNavigation } from "@/components/navigation/RoleNavigation";
import { isBrowserbaseConfigured } from "@/lib/browser/server/browserbase";

export const metadata: Metadata = {
  title: "Launch a validation run",
  description:
    "Tell Playground what you built, what decision you need to make and who should test it.",
};

type FounderNewCampaignPageProps = {
  searchParams: Promise<{
    runId?: string;
    step?: string;
  }>;
};

export default async function FounderNewCampaignPage({
  searchParams,
}: FounderNewCampaignPageProps) {
  const query = await searchParams;
  const showFundScreen = query.step === "fund" && Boolean(query.runId);

  return (
    <div
      className={`founder${showFundScreen ? "" : " founder--brief"}`}
    >
      <header className="founder-nav">
        <div className="founder-shell founder-nav__inner">
          <Link className="founder-brand" href="/">
            <span className="founder-brand__mark" aria-hidden="true">
              <Image
                src="/playground-logo.png"
                alt=""
                width={32}
                height={32}
                priority
              />
            </span>
            <span className="founder-brand__word">Playground</span>
          </Link>
          <div className="founder-nav__actions">
            <RoleNavigation variant="header" />
            <span
              className="founder-powered"
              aria-label="Powered by Pinch Payments"
            >
              <span className="founder-powered__mark" aria-hidden="true">
                <Image
                  src="/pinch-payments-logo.png"
                  alt=""
                  width={496}
                  height={200}
                />
              </span>
              <span className="founder-powered__copy">
                <small>Powered by</small>
                <strong>Pinch Payments</strong>
              </span>
            </span>
          </div>
        </div>
      </header>

      <main className="founder-shell founder-main">
        <div className="founder-heading">
          <p className="founder-eyebrow">
            {showFundScreen ? "Fund validation run" : "Scout brief"}
          </p>
          <h1>
            {showFundScreen ? "Launch a validation run" : "What are we testing?"}
          </h1>
          <p>
            {showFundScreen
              ? "Confirm the run details, then continue to Pinch's hosted checkout."
              : "Give Scout one product decision. We’ll build the test plan, bring matched testers, and help turn the right people into real users."}
          </p>
        </div>
        {showFundScreen ? (
          <CampaignForm />
        ) : (
          <ScoutBrief browserbaseConfigured={isBrowserbaseConfigured()} />
        )}
      </main>
    </div>
  );
}
