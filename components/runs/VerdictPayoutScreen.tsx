"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

type ReviewerStatus = "pending" | "paying" | "paid" | "failed";

type Reviewer = {
  id: string;
  name: string;
  findings: number;
  tasks: string;
  status: ReviewerStatus;
  reference?: string;
  paidAt?: string;
  failureCode?: string;
};

type VerdictModal = "video" | "report" | "referral" | null;

const FINDINGS = [
  {
    id: 1,
    title: "Put proof of candidate signal above the fold",
    affected: "4 of 5 testers",
    severity: "Critical",
    analysis: "HR buyers need confidence before they share a hiring workflow. Put one evidence-backed result beside the first decision point.",
  },
  {
    id: 2,
    title: "Replace the broad promise with a measurable hiring outcome",
    affected: "3 of 5 testers",
    severity: "High",
    analysis: "A concrete outcome such as qualified interviews or time saved gives the product a reason to move from interest to pilot.",
  },
  {
    id: 3,
    title: "Explain the post-demo handoff and first response time",
    affected: "3 of 5 testers",
    severity: "Medium",
    analysis: "Tell a prospective HR team who responds, what they receive, and when the first useful result arrives after booking.",
  },
] as const;

const REVIEWERS: Reviewer[] = [
  { id: "sarah", name: "Sarah Mitchell", findings: 4, tasks: "4/4", status: "pending" },
  { id: "prabhmannat", name: "Prabhmannat Singh", findings: 3, tasks: "4/4", status: "paid", reference: "test_txn_prabhmannat_01", paidAt: "10:42:18" },
  { id: "jack", name: "Jack Thompson", findings: 2, tasks: "4/4", status: "paid", reference: "test_txn_jack_02", paidAt: "10:43:02" },
  { id: "emily", name: "Emily Nguyen", findings: 4, tasks: "4/4", status: "paid", reference: "test_txn_emily_03", paidAt: "10:43:27" },
  { id: "liam", name: "Liam Wilson", findings: 3, tasks: "4/4", status: "paid", reference: "test_txn_liam_04", paidAt: "10:43:49" },
];

const REVIEW_SLIDES = [
  {
    id: "sarah",
    name: "Sarah Mitchell",
    role: "Talent acquisition lead · 04 findings",
    severity: "Critical",
    summary: "The promise is clear, but the hiring proof appears too late.",
    detail: "As an HR buyer, I understood the category. I could not see a credible candidate signal before the booking action.",
    evidence: "4 of 5 testers",
  },
  {
    id: "prabhmannat",
    name: "Prabhmannat Singh",
    role: "People operations manager · 03 findings",
    severity: "High",
    summary: "The product story needs one concrete outcome.",
    detail: "The language feels abstract until the final section. A single before-and-after example would make the value obvious.",
    evidence: "3 of 5 testers",
  },
  {
    id: "jack",
    name: "Jack Thompson",
    role: "HR technology consultant · 02 findings",
    severity: "Medium",
    summary: "The handoff after the demo request is unclear.",
    detail: "I wanted to know what happens immediately after I submit the form and who follows up with me.",
    evidence: "3 of 5 testers",
  },
  {
    id: "emily",
    name: "Emily Nguyen",
    role: "Internal recruiter · 04 findings",
    severity: "Critical",
    summary: "Trust signals should sit beside the decision point.",
    detail: "The strongest evidence is several scrolls away from the moment I decide whether to book a demo.",
    evidence: "4 of 5 testers",
  },
  {
    id: "liam",
    name: "Liam Wilson",
    role: "Hiring manager · 03 findings",
    severity: "High",
    summary: "Show me what success looks like in one glance.",
    detail: "The headline got my attention, but I needed one concrete result to understand why this is different.",
    evidence: "3 of 5 testers",
  },
] as const;

const REVIEW_VIDEOS = [
  {
    id: "I2YGFFi3gXk",
    reviewerId: "sarah",
    title: "Sarah Mitchell · product review",
    description: "A full review capture focused on clarity, trust, and the moment an HR buyer decides whether to continue.",
    start: 0,
  },
  {
    id: "dNw-BeWv13g",
    reviewerId: "prabhmannat",
    title: "Prabhmannat Singh · follow-up review",
    description: "A second review segment for comparing the product story and the handoff after the first action.",
    start: 96,
  },
] as const;

function money(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

function currentTime(): string {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function avatarUrl(name: string): string {
  const seed = encodeURIComponent(name);
  const top = name === "Prabhmannat Singh" ? "&top=turban" : "";
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}${top}&backgroundColor=transparent`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function VerdictPayoutScreen({ runId }: { runId: string }) {
  const [reviewers, setReviewers] = useState(REVIEWERS);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [activeModal, setActiveModal] = useState<VerdictModal>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const activeReview = REVIEW_SLIDES[activeReviewIndex];
  const activeVideo = REVIEW_VIDEOS[activeVideoIndex];
  const videoReview = REVIEW_SLIDES.find((review) => review.id === activeVideo.reviewerId) ?? activeReview;

  const paidCount = reviewers.filter((reviewer) => reviewer.status === "paid").length;
  const totals = useMemo(
    () => ({ paidOut: paidCount * 3_000, platformFee: paidCount * 1_000 }),
    [paidCount],
  );

  const moveReview = (direction: -1 | 1) => {
    setActiveReviewIndex((current) =>
      (current + direction + REVIEW_SLIDES.length) % REVIEW_SLIDES.length,
    );
  };

  const approve = async (testerId: string) => {
    const reviewer = reviewers.find((item) => item.id === testerId);
    if (!reviewer || reviewer.status === "paying" || reviewer.status === "paid") return;

    const startedAt = currentTime();
    setReviewers((current) => current.map((item) => item.id === testerId ? { ...item, status: "paying" } : item));

    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
      const approvedAt = currentTime();
      const reference = `test_txn_${runId}_${testerId}_${Date.now().toString(36)}`;
      setReviewers((current) => current.map((item) => item.id === testerId
        ? { ...item, status: "paid", reference, paidAt: approvedAt, failureCode: undefined }
        : item));
    } catch {
      setReviewers((current) => current.map((item) => item.id === testerId
        ? { ...item, status: "failed", failureCode: "TEST_TRANSACTION_FAILED" }
        : item));
    }
  };

  return (
    <main className="verdict-pay">
      <header className="run-fund__header verdict-pay__nav">
        <Link className="run-fund__brand" href="/landing-2">
          <span className="run-fund__brand-mark" aria-hidden="true">
            <Image src="/fund-playground-logo.png" alt="" width={38} height={38} />
          </span>
          Playground
        </Link>
        <div className="run-fund__pinch">
          <span className="run-fund__pinch-mark" aria-hidden="true">
            <Image src="/pinch-payments-logo.png" alt="" width={496} height={200} />
          </span>
          <span className="run-fund__pinch-copy">
            <span>Powered by</span>
            <strong>Pinch Payments</strong>
          </span>
        </div>
        <span className="verdict-pay__mode">Find piloting users · test mode</span>
      </header>

      <div className="verdict-pay__page">
        <section className="verdict-pay__hero" aria-labelledby="verdict-title">
          <div className="verdict-pay__hero-copy">
            <p>Product pre-screening · HR test panel</p>
            <h1 id="verdict-title">MAKE THE PROOF UNMISSABLE</h1>
            <span className="verdict-pay__hero-muted">4 of 5 understood the pricing. 1 of 5 started a trial.</span>

            <article className="verdict-pay__review-card" aria-live="polite">
              <header>
                <div>
                  <span className="verdict-pay__review-kicker">Critical review summary</span>
                  <h2>{activeReview.name}</h2>
                  <p>{activeReview.role}</p>
                </div>
                <span className={`cw-severity cw-severity--${activeReview.severity.toLowerCase()}`}>{activeReview.severity}</span>
              </header>
              <h3>{activeReview.summary}</h3>
              <p className="verdict-pay__review-detail">{activeReview.detail}</p>
              <div className="verdict-pay__review-evidence"><span>Affected</span><strong>{activeReview.evidence}</strong></div>
              <div className="verdict-pay__review-actions">
                <a href="#analysis">View detailed analysis <span>↗</span></a>
                <button onClick={() => setActiveModal("report")} type="button">Report</button>
                <button onClick={() => { const index = REVIEW_VIDEOS.findIndex((video) => video.reviewerId === activeReview.id); setActiveVideoIndex(index >= 0 ? index : 0); setActiveModal("video"); }} type="button">Review video</button>
                <button onClick={() => setActiveModal("referral")} type="button">Referred user</button>
              </div>
            </article>

            <div className="verdict-pay__carousel-controls">
              <button type="button" onClick={() => moveReview(-1)} aria-label="Previous tester review">←</button>
              <div aria-label="Tester review slides">
                {REVIEW_SLIDES.map((review, index) => (
                  <button
                    type="button"
                    key={review.id}
                    className={index === activeReviewIndex ? "is-active" : ""}
                    onClick={() => setActiveReviewIndex(index)}
                    aria-label={`Show ${review.name}'s review`}
                  />
                ))}
              </div>
              <span>{String(activeReviewIndex + 1).padStart(2, "0")} / {String(REVIEW_SLIDES.length).padStart(2, "0")}</span>
              <button type="button" onClick={() => moveReview(1)} aria-label="Next tester review">→</button>
            </div>
          </div>
          <div className="verdict-pay__hero-media" aria-label="Evidence globe">
            <div className="verdict-pay__globe-frame">
              <Image src="/browserbase-globe.webp" alt="Pixelated evidence globe" fill priority sizes="(max-width: 900px) 70vw, 38vw" />
            </div>
            <div className="verdict-pay__media-caption"><span>LIVE EVIDENCE</span><strong>5 tester sessions</strong></div>
          </div>
        </section>

        <section id="analysis" className="verdict-pay__findings" aria-labelledby="findings-title">
          <header>
            <p>Decision-ready priorities</p>
            <h2 id="findings-title">Three findings to fix</h2>
          </header>
          <div className="cw-findings-grid">
            {FINDINGS.map((finding) => (
              <article className="cw-finding-card" key={finding.id}>
                <header>
                  <span className="cw-finding-number">0{finding.id}</span>
                  <span className={`cw-severity cw-severity--${finding.severity.toLowerCase()}`}>{finding.severity}</span>
                </header>
                <h3>{finding.title}</h3>
                <p className="cw-finding-analysis">{finding.analysis}</p>
                <dl><div><dt>Affected</dt><dd>{finding.affected}</dd></div></dl>
              </article>
            ))}
          </div>
        </section>

        <section id="payouts" className="verdict-pay__payouts" aria-labelledby="payouts-title">
          <header>
            <div><p>Reviewer payouts</p><h2 id="payouts-title">Approve completed reviews</h2></div>
            <span>A$40.00 → reviewer A$30.00 · Playground A$10.00</span>
          </header>

          <div className="verdict-pay__code-panel">
            <div><span>PINCH SPLIT</span><strong>review payout protocol</strong></div>
            <code>A$40.00 charged  →  reviewer A$30.00  ·  Playground A$10.00</code>
            <small>applicationFee: 1000 · payout legible at a glance</small>
          </div>

          <div className="verdict-pay__table" role="table" aria-label="Reviewer payouts">
            <div className="verdict-pay__table-head" role="row">
              <span role="columnheader">Reviewer</span><span role="columnheader">Findings</span><span role="columnheader">Tasks complete</span><span role="columnheader">Payment split</span><span role="columnheader">Status</span>
            </div>
            {reviewers.map((reviewer) => (
              <div className="verdict-pay__row" role="row" key={reviewer.id}>
                <div className="verdict-pay__reviewer" role="cell">
                  <Avatar className="verdict-pay__avatar">
                    <AvatarImage src={avatarUrl(reviewer.name)} alt={reviewer.name} />
                    <AvatarFallback>{initials(reviewer.name)}</AvatarFallback>
                    {reviewer.status === "paid" && <AvatarBadge aria-label="Payment approved" />}
                  </Avatar>
                  <strong>{reviewer.name}</strong>
                </div>
                <strong role="cell">{reviewer.findings}</strong><span role="cell">{reviewer.tasks}</span>
                <div className="verdict-pay__split" role="cell"><strong>A$40</strong><small>applicationFee: 1000</small></div>
                <div className="verdict-pay__state" role="cell">
                  {reviewer.status === "pending" ? <button onClick={() => void approve(reviewer.id)} type="button">Approve &amp; pay</button>
                    : reviewer.status === "paying" ? <button disabled type="button">Charging…</button>
                    : reviewer.status === "failed" ? <div className="verdict-pay__failed"><code>{reviewer.failureCode}</code><button onClick={() => void approve(reviewer.id)} type="button">Retry</button></div>
                    : <div className="verdict-pay__paid"><code>{reviewer.reference} · <em>approved</em></code><span><em>A$40.00</em> → {reviewer.name.split(" ")[0]} <em>A$30.00</em> · Playground <em>A$10.00</em></span><small>{reviewer.paidAt} · test mode</small></div>}
                </div>
              </div>
            ))}
          </div>

          <div className="verdict-pay__total" aria-live="polite">Approved {paidCount} of {reviewers.length} · Paid out <strong>{money(totals.paidOut)}</strong> · Platform fee <strong>{money(totals.platformFee)}</strong></div>
        </section>
      </div>
      {activeModal && (
        <div className="verdict-pay__modal" role="presentation" onClick={() => setActiveModal(null)}>
          <section className="verdict-pay__modal-panel" role="dialog" aria-modal="true" aria-labelledby="verdict-modal-title" onClick={(event) => event.stopPropagation()}>
            <header className="verdict-pay__modal-header">
              <div>
                <span className="verdict-pay__modal-kicker">{activeModal === "video" ? "YouTube · review capture" : activeModal === "report" ? "Review quality desk" : "Reviewer network"}</span>
                <h2 id="verdict-modal-title">{activeModal === "video" ? `${videoReview.name} review video` : activeModal === "report" ? "Report a review concern" : "Refer another HR reviewer"}</h2>
              </div>
              <button className="verdict-pay__modal-close" onClick={() => setActiveModal(null)} type="button" aria-label="Close popup">×</button>
            </header>

            {activeModal === "video" && (
              <div className="verdict-pay__video-modal">
                <div className="verdict-pay__video-player">
                  <iframe
                    className="verdict-pay__video-frame"
                    key={REVIEW_VIDEOS[activeVideoIndex].id}
                    src={`https://www.youtube-nocookie.com/embed/${REVIEW_VIDEOS[activeVideoIndex].id}?autoplay=1&mute=1&rel=0&modestbranding=1&start=${REVIEW_VIDEOS[activeVideoIndex].start}`}
                    title={activeVideo.title}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="verdict-pay__modal-copy">
                  <span className="eyebrow">Critical review · {videoReview.evidence}</span>
                  <div className="verdict-pay__video-switcher">
                    <button type="button" onClick={() => setActiveVideoIndex((current) => (current + REVIEW_VIDEOS.length - 1) % REVIEW_VIDEOS.length)} aria-label="Previous review video">←</button>
                    <span>Video {activeVideoIndex + 1} of {REVIEW_VIDEOS.length} · muted by default</span>
                    <button type="button" onClick={() => setActiveVideoIndex((current) => (current + 1) % REVIEW_VIDEOS.length)} aria-label="Next review video">→</button>
                  </div>
                  <h3>{activeVideo.title}: {videoReview.summary}</h3>
                  <p>{activeVideo.description} {videoReview.detail}</p>
                  <div className="verdict-pay__modal-facts"><span>Tester <strong>{activeReview.name}</strong></span><span>Focus <strong>Trust before booking</strong></span><span>Finding <strong>{activeReview.severity}</strong></span></div>
                </div>
              </div>
            )}

            {activeModal === "report" && (
              <div className="verdict-pay__modal-copy">
                <p>Flag this review for a founder-side follow-up. Your report stays attached to the current run and does not change the reviewer’s payout.</p>
                <label className="verdict-pay__modal-field"><span>Reason</span><select defaultValue="quality"><option value="quality">Needs quality review</option><option value="duplicate">Possible duplicate finding</option><option value="safety">Sensitive or unsafe content</option></select></label>
                <label className="verdict-pay__modal-field"><span>Notes</span><textarea defaultValue={`Follow up on ${activeReview.name}'s evidence for: ${activeReview.summary}`} rows={4} /></label>
                <button className="verdict-pay__modal-submit" onClick={() => setActiveModal(null)} type="button">Submit report</button>
              </div>
            )}

            {activeModal === "referral" && (
              <div className="verdict-pay__modal-copy">
                <p>Invite a recruiter, hiring manager, or people-operations lead to bring another expert lens into this pre-screening run.</p>
                <label className="verdict-pay__modal-field"><span>Reviewer email</span><input placeholder="reviewer@company.com" type="email" /></label>
                <label className="verdict-pay__modal-field"><span>Personal note</span><textarea defaultValue="Could you review this HR technology workflow with me?" rows={4} /></label>
                <button className="verdict-pay__modal-submit" onClick={() => setActiveModal(null)} type="button">Send invitation</button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
