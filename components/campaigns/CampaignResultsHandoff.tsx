"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getCampaign,
  getCampaignSubmissions,
  updateCampaignStatus,
} from "@/lib/campaign/store";
import type {
  Campaign,
  TesterSubmission,
} from "@/lib/campaign/types";

const FINDINGS = [
  {
    id: 1,
    title: "Show an evidence dossier above the fold",
    affected: "4/5 testers",
    severity: "Critical",
    evidence: "One live submission and three seeded examples",
    action: "Add a visual example of the evidence recruiters receive.",
  },
  {
    id: 2,
    title: "Replace abstract wording with one concrete outcome",
    affected: "3/5 testers",
    severity: "High",
    action:
      "Explain exactly what decision a recruiter can make after using INGEN.",
  },
  {
    id: 3,
    title: "Explain what happens after “Book a demo”",
    affected: "3/5 testers",
    severity: "Medium",
    action: "Add the expected duration, agenda and next step.",
  },
] as const;

const EVIDENCE_TIMELINE = [
  ["00:18", "Tester reads “proof-first hiring”"],
  ["00:42", "Tester searches for an example"],
  ["01:10", "Tester opens Features"],
  ["01:48", "Tester returns to hero section"],
  ["02:15", "Tester says proof is not visible"],
  ["02:40", "Tester recommends an evidence example"],
] as const;

const SEEDED_TITLES = [
  "Category clear, proof missing",
  "Outcome remains abstract",
  "Demo path lacks expectations",
  "Basic idea understood",
] as const;

const FINDING_EVIDENCE: Record<
  number,
  Array<{ source: string; seeded: boolean; quote: string }>
> = {
  1: [
    {
      source: "Live demo submission",
      seeded: false,
      quote:
        "I could not understand what evidence the recruiter receives.",
    },
    {
      source: "Seeded submission 01",
      seeded: true,
      quote: "I wanted to see one evidence dossier before booking.",
    },
    {
      source: "Seeded submission 02",
      seeded: true,
      quote: "The proof is described, but never shown.",
    },
    {
      source: "Seeded submission 04",
      seeded: true,
      quote: "A visual example would make this credible.",
    },
  ],
  2: [
    {
      source: "Live demo submission",
      seeded: false,
      quote: "The evidence a recruiter receives was not concrete.",
    },
    {
      source: "Seeded submission 02",
      seeded: true,
      quote: "Tell me which hiring decision becomes easier.",
    },
    {
      source: "Seeded submission 04",
      seeded: true,
      quote: "The category is clear, the outcome is not.",
    },
  ],
  3: [
    {
      source: "Live demo submission",
      seeded: false,
      quote: "I found the demo route but did not know what came next.",
    },
    {
      source: "Seeded submission 01",
      seeded: true,
      quote: "A short agenda would reduce the commitment risk.",
    },
    {
      source: "Seeded submission 03",
      seeded: true,
      quote: "Show the time required and the next step.",
    },
  ],
};

function ResultsLoading() {
  return (
    <div className="cw-results-loading" aria-live="polite">
      <span className="cw-spinner" aria-hidden="true" />
      <strong>Organising campaign evidence…</strong>
      <p>Combining the live demo submission with clearly labelled demo data.</p>
    </div>
  );
}

export function CampaignResultsHandoff({
  campaignId,
}: {
  campaignId: string;
}) {
  const [submissions, setSubmissions] = useState<
    TesterSubmission[] | undefined
  >(undefined);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getCampaignSubmissions(campaignId),
      getCampaign(campaignId),
    ]).then(async ([campaignSubmissions, currentCampaign]) => {
      if (!active) return;
      setSubmissions(campaignSubmissions);
      setCampaign(currentCampaign ?? null);
      const hasLiveSubmission = campaignSubmissions.some(
        (item) => item.sourceType === "live_demo",
      );
      if (
        hasLiveSubmission &&
        currentCampaign?.status === "evidence_pending"
      ) {
        await updateCampaignStatus(campaignId, "results_ready");
      }
    });
    return () => {
      active = false;
    };
  }, [campaignId]);

  const submission =
    submissions?.find((item) => item.sourceType === "live_demo") ?? null;
  const seededSubmissions =
    submissions?.filter((item) => item.sourceType === "seeded_demo") ?? [];
  const liveCount = submission ? 1 : 0;
  const representedCount = liveCount + seededSubmissions.length;
  const paymentId = campaign?.pinchPaymentId || "pmt_XXXXXXXX";
  const resultsReady =
    campaign?.status === "results_ready" || submission !== null;

  if (submissions === undefined) {
    return (
      <main className="cw-shell cw-results-dashboard">
        <header className="cw-topbar">
          <Link className="cw-brand" href="/">
            <span aria-hidden="true">P</span>
            Playground
          </Link>
          <span className="cw-results__campaign">Campaign {campaignId}</span>
        </header>
        <ResultsLoading />
      </main>
    );
  }

  if (!submission) {
    return (
      <main className="cw-shell cw-results-dashboard">
        <header className="cw-topbar">
          <Link className="cw-brand" href="/">
            <span aria-hidden="true">P</span>
            Playground
          </Link>
          <div className="cw-results-nav">
            <span>Campaign {campaignId}</span>
            <strong>Awaiting live evidence</strong>
          </div>
        </header>
        <div className="cw-results-page">
          <section className="cw-results-empty">
            <span aria-hidden="true">01</span>
            <p className="cw-kicker">Founder result</p>
            <h1>One live submission is still required.</h1>
            <p>
              Seeded examples are ready, but Playground will not present a
              founder verdict until the tester evidence form is submitted.
            </p>
            <Link
              className="cw-primary-action"
              href={`/tester/campaigns/${campaignId}`}
            >
              Open tester mission <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="cw-shell cw-results-dashboard">
      <header className="cw-topbar">
        <Link className="cw-brand" href="/">
          <span aria-hidden="true">P</span>
          Playground
        </Link>
        <div className="cw-results-nav">
          <span>Campaign {campaignId}</span>
          <strong>
            {resultsReady ? "Results ready" : "Awaiting live evidence"}
          </strong>
        </div>
      </header>

      <div className="cw-results-page">
        <section className="cw-verdict-hero">
          <div className="cw-verdict-hero__copy">
            <p className="cw-verdict-label">
              <span aria-hidden="true">!</span>
              Founder decision
            </p>
            <h1>MODIFY BEFORE LAUNCH</h1>
            <p>
              Users understand the category, but the first screen does not show
              enough proof to earn recruiter trust.
            </p>
          </div>
          <div className="cw-verdict-hero__signal">
            <span>Launch confidence</span>
            <strong>42</strong>
            <small>out of 100</small>
            <i aria-hidden="true">
              <b />
            </i>
          </div>
          <dl className="cw-result-stats">
            <div>
              <dd>{representedCount}</dd>
              <dt>testers represented</dt>
              <small>
                {liveCount} live demo + {seededSubmissions.length} seeded demo
              </small>
            </div>
            <div>
              <dd>{liveCount}</dd>
              <dt>Live demo submission</dt>
              <small>{submission ? "Saved in this browser" : "Not yet submitted"}</small>
            </div>
            <div>
              <dd>{seededSubmissions.length}</dd>
              <dt>Seeded demo submissions</dt>
              <span className="cw-seeded-label">Seeded demo data</span>
            </div>
            <div>
              <dd>3</dd>
              <dt>critical fixes</dt>
              <small>Prioritised for launch</small>
            </div>
            <div>
              <dd>A$199</dd>
              <dt>campaign funding</dt>
              <small>Funded through Pinch</small>
            </div>
          </dl>
        </section>

        {!submission ? (
          <div className="cw-missing-live" role="status">
            <strong>No live demo submission is saved in this browser.</strong>
            <span>
              The four seeded records remain visibly labelled and are not
              presented as real testers.
            </span>
            <Link href={`/tester/campaigns/${campaignId}`}>
              Complete tester mission
            </Link>
          </div>
        ) : null}

        <section className="cw-results-section">
          <header className="cw-results-heading">
            <div>
              <span>01</span>
              <div>
                <p>Prediction gap</p>
                <h2>AI predicted vs humans observed</h2>
              </div>
            </div>
            <small>What changed after human evidence</small>
          </header>

          <div className="cw-compare-grid">
            <article className="cw-compare-card cw-compare-card--ai">
              <span className="cw-compare-card__tag">AI predicted</span>
              <div aria-hidden="true" className="cw-compare-card__mark">
                AI
              </div>
              <p>Users may not understand “proof-first hiring.”</p>
            </article>
            <article className="cw-compare-card cw-compare-card--human">
              <span className="cw-compare-card__tag">Humans observed</span>
              <div aria-hidden="true" className="cw-compare-card__mark">
                4/5
              </div>
              <p>4 of 5 understood the basic idea.</p>
              <span className="cw-seeded-label">Includes seeded demo data</span>
            </article>
            <article className="cw-compare-card cw-compare-card--unexpected">
              <span className="cw-compare-card__tag">
                Unexpected human finding
              </span>
              <div aria-hidden="true" className="cw-compare-card__mark">
                3/5
              </div>
              <p>
                3 of 5 wanted to see a real evidence dossier before booking.
              </p>
              <span className="cw-seeded-label">Includes seeded demo data</span>
            </article>
          </div>
          <p className="cw-truth-line">
            AI creates the test and organises evidence.{" "}
            <strong>Humans reveal the truth.</strong>
          </p>
        </section>

        <section className="cw-results-section">
          <header className="cw-results-heading">
            <div>
              <span>02</span>
              <div>
                <p>Decision-ready priorities</p>
                <h2>Fix these three things</h2>
              </div>
            </div>
            <small>Ordered by impact on recruiter trust</small>
          </header>

          <div className="cw-findings-grid">
            {FINDINGS.map((finding) => (
              <article className="cw-finding-card" key={finding.id}>
                <header>
                  <span className="cw-finding-number">0{finding.id}</span>
                  <span
                    className={`cw-severity cw-severity--${finding.severity.toLowerCase()}`}
                  >
                    {finding.severity}
                  </span>
                </header>
                <h3>{finding.title}</h3>
                <dl>
                  <div>
                    <dt>Affected</dt>
                    <dd>{finding.affected}</dd>
                  </div>
                  {"evidence" in finding ? (
                    <div>
                      <dt>Evidence</dt>
                      <dd>{finding.evidence}</dd>
                    </div>
                  ) : null}
                </dl>
                <p>
                  <span>Recommended action</span>
                  {finding.action}
                </p>
                <button
                  aria-expanded={selectedFinding === finding.id}
                  onClick={() =>
                    setSelectedFinding((current) =>
                      current === finding.id ? null : finding.id,
                    )
                  }
                  type="button"
                >
                  {selectedFinding === finding.id
                    ? "Hide evidence"
                    : "View evidence"}
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>

          {selectedFinding ? (
            <div className="cw-evidence-tray" aria-live="polite">
              <header>
                <div>
                  <span>Finding 0{selectedFinding}</span>
                  <strong>Evidence behind this recommendation</strong>
                </div>
                <button
                  aria-label="Close finding evidence"
                  onClick={() => setSelectedFinding(null)}
                  type="button"
                >
                  ×
                </button>
              </header>
              <div>
                {FINDING_EVIDENCE[selectedFinding]?.map((item) => (
                  <blockquote key={`${selectedFinding}-${item.source}`}>
                    <p>“{item.quote}”</p>
                    <footer>
                      {item.source}
                      {item.seeded ? (
                        <span className="cw-seeded-label">
                          Seeded demo data
                        </span>
                      ) : !submission ? (
                        <span className="cw-unavailable-label">
                          Live submission unavailable
                        </span>
                      ) : null}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="cw-results-split">
          <div className="cw-results-section">
            <header className="cw-results-heading">
              <div>
                <span>03</span>
                <div>
                  <p>Session sequence</p>
                  <h2>Evidence timeline</h2>
                </div>
              </div>
              <span className="cw-live-label">Live demo submission</span>
            </header>
            <ol className="cw-evidence-timeline">
              {EVIDENCE_TIMELINE.map(([time, event], index) => (
                <li key={time}>
                  <time>{time}</time>
                  <span className="cw-evidence-timeline__rail" aria-hidden="true">
                    <i>{index + 1}</i>
                  </span>
                  <p>{event}</p>
                </li>
              ))}
            </ol>
            {!submission ? (
              <p className="cw-timeline-note">
                Timeline template only — live demo submission unavailable.
              </p>
            ) : null}
          </div>

          <div className="cw-results-section">
            <header className="cw-results-heading">
              <div>
                <span>04</span>
                <div>
                  <p>Original feedback</p>
                  <h2>Tester evidence</h2>
                </div>
              </div>
            </header>

            <article className="cw-live-submission">
              <header>
                <div>
                  <span className="cw-live-label">Live demo submission</span>
                  <strong>{submission?.id ?? "Awaiting submission"}</strong>
                </div>
                <span
                  className={`cw-severity cw-severity--${(submission?.severity ?? "High").toLowerCase()}`}
                >
                  {submission?.severity ?? "—"}
                </span>
              </header>
              <dl>
                <div>
                  <dt>Issue</dt>
                  <dd>
                    {submission?.issue ??
                      "No live issue has been submitted in this browser."}
                  </dd>
                </div>
                <div>
                  <dt>Expectation</dt>
                  <dd>{submission?.expectedBehaviour ?? "—"}</dd>
                </div>
                <div>
                  <dt>Recommendation</dt>
                  <dd>{submission?.recommendation ?? "—"}</dd>
                </div>
                <div>
                  <dt>Loom URL</dt>
                  <dd>
                    {submission?.loomUrl ? (
                      <a
                        href={submission.loomUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open Loom evidence ↗
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </dd>
                </div>
              </dl>
              <footer>
                <span>{submission?.qualityStatus ?? "Quality review pending"}</span>
                <span>
                  {submission
                    ? `A$${submission.rewardAmount} ${submission.rewardStatus.replace("_", " ")}`
                    : "A$20 reserved"}
                </span>
              </footer>
            </article>

            <div className="cw-seeded-stack">
              {seededSubmissions.map((seeded, index) => (
                <details key={seeded.id}>
                  <summary>
                    <div>
                      <strong>
                        {SEEDED_TITLES[index] ?? `Seeded submission ${index + 1}`}
                      </strong>
                      <span>{seeded.severity} severity</span>
                    </div>
                    <span className="cw-seeded-label">Seeded demo data</span>
                  </summary>
                  <dl>
                    <div>
                      <dt>Issue</dt>
                      <dd>{seeded.issue}</dd>
                    </div>
                    <div>
                      <dt>Recommendation</dt>
                      <dd>{seeded.recommendation}</dd>
                    </div>
                  </dl>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cw-results-section cw-ledger-section">
          <header className="cw-results-heading">
            <div>
              <span>05</span>
              <div>
                <p>Funding accountability</p>
                <h2>Transaction ledger</h2>
              </div>
            </div>
            <small>Test environment</small>
          </header>

          <div className="cw-ledger-layout">
            <dl className="cw-ledger-money">
              <div>
                <dt>Campaign funding</dt>
                <dd>A$199</dd>
              </div>
              <div>
                <dt>Tester reward pool</dt>
                <dd>A$120</dd>
              </div>
              <div>
                <dt>Founding-user pool</dt>
                <dd>A$20</dd>
              </div>
              <div>
                <dt>Playground gross margin</dt>
                <dd>A$59 <small>before Pinch fees</small></dd>
              </div>
            </dl>
            <dl className="cw-ledger-meta">
              <div>
                <dt>Payment processor</dt>
                <dd>Pinch</dd>
              </div>
              <div>
                <dt>Environment</dt>
                <dd>Test</dd>
              </div>
              <div>
                <dt>Payment ID</dt>
                <dd>{paymentId}</dd>
              </div>
              <div>
                <dt>Campaign status</dt>
                <dd className="cw-results-ready">
                  {resultsReady ? "Results ready" : "Awaiting live evidence"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <footer className="cw-results-actions">
          <div>
            <p className="cw-kicker">Next best action</p>
            <h2>Turn validated demand into meaningful adoption.</h2>
          </div>
          <div>
            <Link
              className="cw-link-action"
              href={`/campaigns/${campaignId}/scout`}
            >
              Retest after changes
            </Link>
            <Link
              className="cw-primary-action"
              href={`/campaigns/${campaignId}/founding-users`}
            >
              Launch founding-user campaign <span aria-hidden="true">→</span>
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
