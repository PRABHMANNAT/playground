import type { Metadata } from "next";
import Link from "next/link";

import { CampaignForm } from "@/components/founder/CampaignForm";

export const metadata: Metadata = {
  title: "Launch a validation campaign",
  description:
    "Tell Playground what you built, what decision you need to make and who should test it.",
};

export default function FounderNewCampaignPage() {
  return (
    <div className="founder">
      <header className="founder-nav">
        <div className="founder-shell founder-nav__inner">
          <Link className="founder-brand" href="/">
            <span className="founder-brand__mark" aria-hidden="true">
              P
            </span>
            <span className="founder-brand__word">Playground</span>
          </Link>
          <span className="founder-tag founder-tag--sandbox">
            Pinch sandbox
          </span>
        </div>
      </header>

      <main className="founder-shell founder-main">
        <div className="founder-heading">
          <p className="founder-eyebrow">New campaign</p>
          <h1>Launch a validation campaign</h1>
          <p>
            Tell Playground what you built, what decision you need to make and
            who should test it.
          </p>
        </div>
        <CampaignForm />
      </main>
    </div>
  );
}
