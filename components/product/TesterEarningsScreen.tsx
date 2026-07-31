"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { TesterShell } from "@/components/product/TesterProduct";
import {
  TESTER_EARNINGS,
  approvedBalanceCents,
  formatAmount,
  type PinchPayment,
} from "@/lib/demo/tester-earnings";

const PINCH_FIELD_ORDER = [
  "id", "attemptId", "amount", "currency", "description", "applicationFee",
  "totalFee", "isSurcharged", "sourceType", "transactionDate", "status",
  "estimatedTransferDate", "actualTransferDate", "payer", "attempts", "metadata",
];

const COMPLETED_TASKS = [
  "Explain what the product does",
  "Find how it works",
  "Attempt the primary action",
  "Mark anything that reduces trust",
];

function orderedPayment(payment: PinchPayment): Record<string, unknown> {
  const source = payment as unknown as Record<string, unknown>;
  return PINCH_FIELD_ORDER.reduce<Record<string, unknown>>((ordered, key) => {
    if (key in source) ordered[key] = source[key];
    return ordered;
  }, {});
}

function display(value: string | null | undefined) {
  return value || "-";
}

function highlightJson(json: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(json)) !== null) {
    if (match.index > lastIndex) nodes.push(json.slice(lastIndex, match.index));
    if (match[1]) {
      nodes.push(
        <span className={match[2] ? "te-j-key" : "te-j-str"} key={key++}>{match[1]}</span>,
        ...(match[2] ? [<span className="te-j-punc" key={key++}>{match[2]}</span>] : []),
      );
    } else if (match[3]) {
      nodes.push(<span className="te-j-num" key={key++}>{match[3]}</span>);
    } else if (match[4]) {
      nodes.push(<span className="te-j-kw" key={key++}>{match[4]}</span>);
    }
    lastIndex = tokenPattern.lastIndex;
  }
  if (lastIndex < json.length) nodes.push(json.slice(lastIndex));
  return nodes;
}

function RawPanel({ payment }: { payment: PinchPayment }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(orderedPayment(payment), null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="te-raw">
      <button className="te-raw__toggle" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span aria-hidden="true">{open ? "v" : ">"}</span> View raw Pinch response
      </button>
      {open && (
        <div className="te-raw__body">
          <div className="te-raw__bar"><span>Pinch response JSON</span><button type="button" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button></div>
          <pre className="te-raw__code"><code>{highlightJson(json)}</code></pre>
        </div>
      )}
    </div>
  );
}

export function TesterEarningsScreen() {
  const { tester, payments } = TESTER_EARNINGS;
  const approved = payments.filter((payment) => payment.status === "approved");
  const paidCents = approvedBalanceCents(TESTER_EARNINGS);
  const firstPayment = approved[0];
  const [referralCopied, setReferralCopied] = useState(false);
  const totalCredits = 480;
  const referralCredits = 60;
  const completedTaskCount = 12;
  const totalTaskCount = 16;

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText("playground.test/join/sarah-chen");
      setReferralCopied(true);
      window.setTimeout(() => setReferralCopied(false), 1800);
    } catch {
      setReferralCopied(false);
    }
  };

  return (
    <TesterShell>
      <main className="product-page te-page">
        <div className="te-shell">
          <section className="te-hero" aria-labelledby="tester-earning-title">
            <div className="te-hero__grid" aria-hidden="true" />
            <div className="te-hero__copy">
              <p className="te-eyebrow">Tester earning - Pinch managed merchant</p>
              <h1 id="tester-earning-title">Your work is earning trust.</h1>
              <p className="te-hero__intro">Every completed product review becomes a clearer decision for a founder - and a verified earning for you.</p>
              <div className="te-hero__actions">
                <Link className="te-button te-button--dark" href="/tester/projects">Find another review <span aria-hidden="true">&gt;</span></Link>
                <Link className="te-button te-button--soft" href="#payments">View payment history <span aria-hidden="true">&gt;</span></Link>
              </div>
              <div className="te-hero__identity">
                <strong>{tester.firstName} {tester.lastName}</strong>
                <span>{tester.managedMerchantId} - <b>verified</b></span>
              </div>
            </div>
            <div className="te-hero__media">
              <Image src="/browserbase-identity.webp" alt="Abstract product verification interface" fill priority sizes="(max-width: 900px) 100vw, 46vw" />
              <div className="te-hero__media-note"><span>PINCH REALTIME</span><strong>VERIFIED PAYOUT</strong><em>{formatAmount(paidCents)} - next business day</em></div>
            </div>
          </section>

          <section className="te-credit-strip" aria-label="Tester earning summary">
            <article><span>Total credits</span><strong>{totalCredits}</strong><small>earned across reviews</small></article>
            <article><span>Completed tasks</span><strong>{completedTaskCount}<i>/{totalTaskCount}</i></strong><small>quality completion rate</small></article>
            <article><span>Referral credits</span><strong>{referralCredits}</strong><small>from your network</small></article>
            <article><span>Paid to you</span><strong className="te-green">{formatAmount(paidCents)}</strong><small>via Pinch</small></article>
          </section>

          <section className="te-progress" aria-labelledby="progress-title">
            <div className="te-progress__copy">
              <p className="te-eyebrow">Task completion</p>
              <h2 id="progress-title">Build a stronger reviewer record.</h2>
              <p>Complete the task set, leave evidence founders can act on, and your next matched review gets easier to trust.</p>
            </div>
            <div className="te-progress__tasks">
              <div className="te-progress__meter"><span style={{ width: `${(completedTaskCount / totalTaskCount) * 100}%` }} /><b>{completedTaskCount}/{totalTaskCount}</b></div>
              {COMPLETED_TASKS.map((task, index) => (
                <div className="te-task" key={task}><span className={index < 3 ? "is-done" : ""}>{index < 3 ? "done" : index + 1}</span><strong>{task}</strong><small>{index < 3 ? "complete" : "next task"}</small></div>
              ))}
            </div>
          </section>

          <section className="te-referral" aria-labelledby="referral-title">
            <div className="te-referral__copy">
              <p className="te-eyebrow">Bring pilot users</p>
              <h2 id="referral-title">Bring pilot users into the room.</h2>
              <p>Invite someone from your product, HR, or research network. When they complete their first approved review, your referral credits update here.</p>
              <button className="te-button te-button--dark" type="button" onClick={() => void copyReferral()}>{referralCopied ? "Referral link copied" : "Copy referral link"} <span aria-hidden="true">&gt;</span></button>
            </div>
            <div className="te-referral__steps"><span>01 <b>Share your link</b></span><span>02 <b>They complete a review</b></span><span>03 <b>Your credits update</b></span></div>
          </section>

          <section className="te-payments" id="payments" aria-labelledby="payments-title">
            <div className="te-section-heading"><div><p className="te-eyebrow">Pinch settlement ledger</p><h2 id="payments-title">Approved reviews, paid clearly.</h2></div><span>applicationFee {firstPayment?.applicationFee ?? 0}</span></div>
            <div className="te-list">
              {payments.map((payment) => {
                const reviewerShare = payment.amount - payment.applicationFee;
                const isApproved = payment.status === "approved";
                return (
                  <article className="te-row" key={payment.id}>
                    <div className="te-row__visual">
                      <Image src="/browserbase-computer.webp" alt="Browser computer illustration" fill sizes="(max-width: 760px) 100vw, 180px" />
                      <span>PINCH<br />PAYMENT</span>
                    </div>
                    <div className="te-row__content">
                      <div className="te-row__top"><p>Run {display(payment.metadata.runId)}</p><span className={isApproved ? "te-status te-status--approved" : "te-status"}>* {display(payment.status)}</span></div>
                      <h3>{payment.metadata.decision}</h3>
                      <p className="te-row__id">{display(payment.id)} - <b className={isApproved ? "te-green" : ""}>{display(payment.status)}</b> - test mode</p>
                      <p className="te-row__split">{formatAmount(payment.amount)} charged <span>-&gt;</span> <b className="te-green">You {formatAmount(reviewerShare)}</b> - Playground {formatAmount(payment.applicationFee)}</p>
                      <p className="te-row__meta">estimatedTransferDate: {display(payment.estimatedTransferDate)} - managed merchant settlement</p>
                      <RawPanel payment={payment} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <footer className="te-footer">Paid via Pinch - managed merchant settlement - test mode - {approved.length} approved review</footer>
        </div>
      </main>
    </TesterShell>
  );
}
