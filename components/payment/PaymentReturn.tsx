"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  activateCampaignAfterVerification,
  getCampaign,
  setCampaignStatus,
} from "@/lib/campaign/store";
import type { PinchApiErrorBody, VerifyPaymentResult } from "@/lib/pinch/types";

type ViewState = "loading" | "success" | "pending" | "failed" | "missing";

/** https://docs.getpinch.com.au/docs/payment-statuses */
const IN_PROGRESS_STATUSES = new Set([
  "scheduled",
  "processing",
  "pending-action",
]);

const TIMELINE = [
  "Payment approved",
  "Campaign funded",
  "Campaign activated",
  "Scout ready",
];

function formatAmount(amount: number | null): string {
  return amount === null ? "—" : `A$${amount.toFixed(2)}`;
}

export function PaymentReturn() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId")?.trim() ?? "";
  const paymentLinkId = params.get("paymentLinkId")?.trim() ?? "";
  const campaignId = params.get("campaign")?.trim() || "cmp_001";
  const isMock = params.get("mock") === "1";

  const [state, setState] = useState<ViewState>("loading");
  const [result, setResult] = useState<VerifyPaymentResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatusLabel] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasRun = useRef(false);

  const verify = useCallback(async () => {
    if (!paymentId || !paymentLinkId) {
      setState("missing");
      return;
    }

    setState("loading");
    setMessage(null);

    try {
      const query = new URLSearchParams({ paymentId, paymentLinkId });
      const response = await fetch(`/api/pinch/verify-payment?${query}`);
      const payload = (await response.json()) as
        | VerifyPaymentResult
        | PinchApiErrorBody;

      if (!response.ok || "error" in payload) {
        setMessage(
          "error" in payload
            ? payload.error.message
            : "Playground could not verify this payment.",
        );
        setState("failed");
        return;
      }

      setResult(payload);

      if (!payload.verified) {
        setMessage(
          IN_PROGRESS_STATUSES.has(payload.status)
            ? "Pinch has not finished processing this payment yet. The campaign stays in payment_pending until it does."
            : "Pinch did not approve this payment, so the campaign was not activated.",
        );
        setState(IN_PROGRESS_STATUSES.has(payload.status) ? "pending" : "failed");
        return;
      }

      // Activation goes through the guard, which refuses anything that is not
      // server-verified. Query parameters alone never activate a campaign.
      const activation = await activateCampaignAfterVerification(campaignId, {
        verified: payload.verified,
        status: payload.status,
      });

      if (!activation.activated) {
        setMessage(
          `Payment is approved, but the campaign could not be activated in this browser. ${activation.reason ?? ""}`.trim(),
        );
        setState("failed");
        return;
      }

      // funded, then live.
      await setCampaignStatus(campaignId, "live");
      const campaign = await getCampaign(campaignId);
      setCampaignStatusLabel(campaign?.status ?? "live");
      setState("success");
    } catch (error) {
      console.error("Payment verification failed", error);
      setMessage(
        "Playground could not reach the verification service. Check your connection and try again.",
      );
      setState("failed");
    }
  }, [campaignId, paymentId, paymentLinkId]);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    void verify();
  }, [verify]);

  if (state === "loading") {
    return (
      <div className="pay-card pay-card--centred" aria-busy="true">
        <span className="pay-spinner" aria-hidden="true" />
        <p className="pay-loading" role="status">
          Verifying Pinch payment…
        </p>
        <p className="pay-muted">
          Playground is confirming this payment with Pinch on the server.
        </p>
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="pay-card">
        <span className="pay-badge pay-badge--neutral">No payment reference</span>
        <h1>Nothing to verify</h1>
        <p className="pay-muted">
          This page needs a <code>paymentId</code> and{" "}
          <code>paymentLinkId</code> from Pinch. The link you followed did not
          include them, so there is no payment to check.
        </p>
        <div className="pay-actions">
          <Link className="pay-btn pay-btn--secondary" href="/founder/new">
            Return to campaign
          </Link>
        </div>
      </div>
    );
  }

  if (state === "pending" || state === "failed") {
    const pending = state === "pending";
    return (
      <div className="pay-card">
        <span
          className={`pay-badge ${pending ? "pay-badge--pending" : "pay-badge--failed"}`}
        >
          {pending ? result?.status ?? "Processing" : result?.status ?? "Not approved"}
        </span>
        <h1>{pending ? "Payment still processing" : "Campaign not funded"}</h1>
        <p className="pay-muted">{message}</p>

        <p className="pay-note">
          Campaign <strong>{campaignId}</strong> has not been activated.
        </p>

        {result ? (
          <dl className="pay-details">
            <div>
              <dt>Status</dt>
              <dd>{result.status}</dd>
            </div>
            <div>
              <dt>Payment ID</dt>
              <dd>{result.paymentId}</dd>
            </div>
            <div>
              <dt>Payment Link</dt>
              <dd>{result.paymentLinkId}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>Test</dd>
            </div>
          </dl>
        ) : null}

        <div className="pay-actions">
          <button
            type="button"
            className="pay-btn pay-btn--primary"
            onClick={() => void verify()}
          >
            Check payment again
          </button>
          <Link className="pay-btn pay-btn--secondary" href="/founder/new">
            Return to campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-card pay-card--success">
      <div className="pay-success__head">
        <span className="pay-badge pay-badge--approved">
          <span className="pay-dot" aria-hidden="true" />
          Approved
        </span>
        <span className="pay-badge pay-badge--test">Test mode</span>
        {isMock || result?.mock ? (
          <span className="pay-badge pay-badge--mock">Mock mode</span>
        ) : null}
      </div>

      <h1>Campaign funded</h1>
      <p className="pay-sandbox">
        Pinch sandbox transaction — no real money moved
      </p>

      <dl className="pay-transaction">
        <div>
          <dt>Amount</dt>
          <dd>{formatAmount(result?.amount ?? null)}</dd>
        </div>
        <div>
          <dt>Payment ID</dt>
          <dd className="pay-mono">{result?.paymentId}</dd>
        </div>
        <div>
          <dt>Payment Link</dt>
          <dd className="pay-mono">{result?.paymentLinkId}</dd>
        </div>
        <div>
          <dt>Campaign</dt>
          <dd className="pay-mono">{campaignId}</dd>
        </div>
        <div>
          <dt>Processor</dt>
          <dd>Pinch</dd>
        </div>
        <div>
          <dt>Environment</dt>
          <dd>Test</dd>
        </div>
        <div>
          <dt>Campaign status</dt>
          <dd className="pay-live">{(campaignStatus ?? "live").toUpperCase()}</dd>
        </div>
      </dl>

      <ol className="pay-timeline">
        {TIMELINE.map((step, index) => (
          <li key={step}>
            <span className="pay-timeline__step">
              <span className="pay-timeline__tick" aria-hidden="true">
                ✓
              </span>
              {step}
            </span>
            {index < TIMELINE.length - 1 ? (
              <span className="pay-timeline__arrow" aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="pay-actions">
        <Link
          className="pay-btn pay-btn--primary"
          href={`/campaigns/${campaignId}/scout`}
        >
          Start Scout analysis
        </Link>
        <button
          type="button"
          className="pay-link"
          aria-expanded={detailsOpen}
          aria-controls="transaction-details"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          View transaction details
        </button>
      </div>

      {detailsOpen ? (
        <dl className="pay-details" id="transaction-details">
          <div>
            <dt>Verified by</dt>
            <dd>Playground server, via Pinch</dd>
          </div>
          <div>
            <dt>Pinch status</dt>
            <dd>{result?.status}</dd>
          </div>
          <div>
            <dt>Verified</dt>
            <dd>{String(result?.verified)}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>{result?.environment}</dd>
          </div>
          <div>
            <dt>Amount confirmed by Pinch</dt>
            <dd>{formatAmount(result?.amount ?? null)}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
