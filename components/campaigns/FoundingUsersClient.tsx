"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCampaign } from "@/lib/campaign/store";

const MILESTONES = [
  {
    number: "01",
    title: "Verified qualified signup",
    rewardLabel: "Reward",
    reward: "A$2",
    condition: "Recruiter profile and work email verified",
  },
  {
    number: "02",
    title: "Completes product onboarding",
    rewardLabel: "Additional reward",
    reward: "A$5",
    condition: "Completes the core onboarding event",
  },
  {
    number: "03",
    title: "Active after seven days",
    rewardLabel: "Additional reward",
    reward: "A$10",
    condition: "Returns and completes another meaningful action",
  },
  {
    number: "04",
    title: "Becomes a paying customer",
    rewardLabel: "Additional reward",
    reward: "A$50",
    condition: "Paid conversion confirmed",
  },
] as const;

const LEDGER_ROWS = [
  {
    name: "Riya",
    referred: 3,
    qualified: 2,
    activated: 1,
    retained: 1,
    paid: 0,
    reward: "A$17",
    status: "Manual review",
  },
  {
    name: "Arjun",
    referred: 2,
    qualified: 1,
    activated: 0,
    retained: "—",
    paid: "—",
    reward: "A$2",
    status: "Waiting for activation",
  },
] as const;

const PROTECTIONS = [
  "No reward for referral-link clicks",
  "No reward for unverified signup alone",
  "One reward per verified product account",
  "Duplicate account warning",
  "Larger rewards unlock after activation and retention",
  "Paid conversion requires founder confirmation",
] as const;

export function FoundingUsersClient({
  campaignId,
}: {
  campaignId: string;
}) {
  const [paymentId, setPaymentId] = useState("pmt_XXXXXXXX");

  useEffect(() => {
    void getCampaign(campaignId).then((campaign) => {
      if (campaign?.pinchPaymentId) {
        setPaymentId(campaign.pinchPaymentId);
      }
    });
  }, [campaignId]);

  return (
    <main className="cw-shell cw-activation">
      <header className="cw-topbar">
        <Link className="cw-brand" href="/">
          <span aria-hidden="true">P</span>
          Playground
        </Link>
        <div className="cw-activation-nav">
          <span>Validation run {campaignId}</span>
          <strong>Prototype activation ledger</strong>
        </div>
      </header>

      <div className="cw-activation-page">
        <section className="cw-activation-hero">
          <div>
            <span className="cw-prototype-label">
              Prototype activation ledger
            </span>
            <h1>Turn testers into founding users</h1>
            <p>
              Reward relevant people for meaningful product adoption—not empty
              signups or random referrals.
            </p>
          </div>
          <aside className="cw-target-card">
            <span>Validation run target</span>
            <strong>10</strong>
            <p>
              recruiters who currently screen more than 30 candidates each
              month.
            </p>
          </aside>
        </section>

        <div className="cw-roadmap-notice">
          <span aria-hidden="true">i</span>
          <p>
            <strong>Automated Pinch payouts are roadmap functionality.</strong>
            Automated Pinch tester and referral payouts are roadmap
            functionality. Validation run funding is collected through Pinch; reward
            approval is currently manual.
          </p>
        </div>

        <section className="cw-activation-section">
          <header className="cw-activation-heading">
            <div>
              <span>01</span>
              <div>
                <p>Reward design</p>
                <h2>Verified adoption milestones</h2>
              </div>
            </div>
            <small>Progressive rewards · manual review</small>
          </header>

          <div className="cw-milestone-grid">
            {MILESTONES.map((milestone, index) => (
              <article className="cw-milestone-card" key={milestone.number}>
                <header>
                  <span>{milestone.number}</span>
                  <i aria-hidden="true">{index + 1}</i>
                </header>
                <h3>{milestone.title}</h3>
                <dl>
                  <div>
                    <dt>{milestone.rewardLabel}</dt>
                    <dd>{milestone.reward}</dd>
                  </div>
                  <div>
                    <dt>Condition</dt>
                    <dd>{milestone.condition}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="cw-activation-section">
          <header className="cw-activation-heading">
            <div>
              <span>02</span>
              <div>
                <p>Prototype progress</p>
                <h2>Founding-user progress table</h2>
              </div>
            </div>
            <span className="cw-seeded-label">Seeded demo data</span>
          </header>

          <div className="cw-progress-table-wrap">
            <table className="cw-progress-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Referred</th>
                  <th>Qualified</th>
                  <th>Activated</th>
                  <th>Active after 7 days</th>
                  <th>Paid conversion</th>
                  <th>Reward earned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {LEDGER_ROWS.map((row) => (
                  <tr key={row.name}>
                    <th>
                      <span>{row.name.slice(0, 1)}</span>
                      <div>
                        <strong>{row.name}</strong>
                        <small>Seeded demo data</small>
                      </div>
                    </th>
                    <td>{row.referred}</td>
                    <td>{row.qualified}</td>
                    <td>{row.activated}</td>
                    <td>{row.retained}</td>
                    <td>{row.paid}</td>
                    <td>
                      <strong>{row.reward}</strong>
                    </td>
                    <td>
                      <span
                        className={
                          row.status === "Manual review"
                            ? "cw-review-status"
                            : "cw-waiting-status"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cw-activation-lower">
          <article className="cw-activation-section cw-protection-card">
            <header className="cw-activation-heading">
              <div>
                <span>03</span>
                <div>
                  <p>Integrity controls</p>
                  <h2>Fraud protection</h2>
                </div>
              </div>
            </header>
            <ul>
              {PROTECTIONS.map((protection) => (
                <li key={protection}>
                  <span aria-hidden="true">✓</span>
                  {protection}
                </li>
              ))}
            </ul>
          </article>

          <aside className="cw-funding-card">
            <header>
              <span className="cw-live-dot" aria-hidden="true" />
              Validation run funded through Pinch
            </header>
            <dl>
              <div>
                <dt>Funding reference</dt>
                <dd>{paymentId}</dd>
              </div>
              <div>
                <dt>Founding-user pool</dt>
                <dd>A$20</dd>
              </div>
              <div>
                <dt>Reward approval</dt>
                <dd>Manual</dd>
              </div>
            </dl>
            <p>
              This ledger demonstrates milestone logic. It does not trigger a
              transfer.
            </p>
          </aside>
        </section>

        <section className="cw-activation-close">
          <span aria-hidden="true">P</span>
          <p>
            Playground matches startups with people who already have the
            problem, then rewards verified adoption instead of fake activity.
          </p>
          <Link href={`/campaigns/${campaignId}/results`}>
            Return to run results <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
