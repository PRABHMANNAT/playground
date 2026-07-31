"use client";

import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  RUN_PRICING,
  calculateRunSplit,
} from "@/lib/campaign/package";
import type { RunPaymentStatus } from "@/lib/runs/server-store";

const CAPTURE_JS_URL =
  "https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js";
const CAPTURE_JS_INTEGRITY =
  "sha384-hglYFSKC4AMA/rAQOGB3OiA8u5ri5F4qNMGgw4I+fggDSlTmPyREcj1J+VGnkAX8";

type CaptureResult = {
  token?: string;
  errors?: Array<{ message?: string }>;
};

type PinchCaptureClient = {
  createToken(input: {
    sourceType: "credit-card";
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
    cardHolderName: string;
  }): Promise<CaptureResult>;
};

declare global {
  interface Window {
    Pinch?: {
      Capture(config: { publishableKey: string }): PinchCaptureClient;
    };
  }
}

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

function money(amount: number): string {
  return `A$${amount.toFixed(2)}`;
}

function readFounderIdentity() {
  try {
    const identity = JSON.parse(
      window.localStorage.getItem("playground-demo-entry") ?? "null",
    ) as { name?: string; email?: string } | null;
    return {
      founderName: identity?.name?.trim() || "Playground Founder",
      founderEmail:
        identity?.email?.trim() || "founder@ingenworkspace.com",
    };
  } catch {
    return {
      founderName: "Playground Founder",
      founderEmail: "founder@ingenworkspace.com",
    };
  }
}

function captureErrorMessage(caught: unknown): string {
  if (caught instanceof Error) {
    return caught.message;
  }
  if (!caught || typeof caught !== "object") {
    return "Pinch could not process this payment.";
  }
  const value = caught as {
    errors?: Array<{ errorMessage?: string; message?: string }>;
    errorMessage?: string;
    message?: string;
  };
  return (
    value.errors?.[0]?.errorMessage ??
    value.errors?.[0]?.message ??
    value.errorMessage ??
    value.message ??
    "Pinch could not process this payment."
  );
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function RunFundingScreen({
  runId,
  decision,
  publishableKey,
}: {
  runId: string;
  decision: string;
  publishableKey: string;
}) {
  const router = useRouter();
  const [testerCount, setTesterCount] = useState<number>(
    RUN_PRICING.defaultTesters,
  );
  const [captureReady, setCaptureReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<RunPaymentStatus | null>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const cvcRef = useRef<HTMLInputElement>(null);
  const holderRef = useRef<HTMLInputElement>(null);
  const split = useMemo(() => calculateRunSplit(testerCount), [testerCount]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/runs/${encodeURIComponent(runId)}/fund`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const next = await readJson<RunPaymentStatus>(response);
          if (!cancelled) {
            setPayment(next);
            setTesterCount(next.testerCount);
            if (next.runStatus === "live") {
              return;
            }
          }
        }
      } catch {
        // A transient status request must not replace a Pinch result.
      }
      if (!cancelled) {
        timer = window.setTimeout(poll, 750);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [runId]);

  useEffect(() => {
    if (payment?.runStatus !== "live") {
      return;
    }
    const timer = window.setTimeout(() => {
      router.push(`/campaigns/${encodeURIComponent(runId)}/scout`);
    }, 2_000);
    return () => window.clearTimeout(timer);
  }, [payment?.runStatus, router, runId]);

  const clearCardFields = () => {
    for (const ref of [
      numberRef,
      monthRef,
      yearRef,
      cvcRef,
      holderRef,
    ]) {
      if (ref.current) {
        ref.current.value = "";
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || payment) {
      return;
    }

    setSubmitting(true);
    router.push(`/runs/${encodeURIComponent(runId)}/verdict`);
  };

  return (
    <main className="run-fund">
      {publishableKey ? (
        <Script
          src={CAPTURE_JS_URL}
          integrity={CAPTURE_JS_INTEGRITY}
          crossOrigin="anonymous"
          strategy="afterInteractive"
          onReady={() => setCaptureReady(true)}
        />
      ) : null}

      <header className="run-fund__header">
        <Link className="run-fund__brand" href="/landing-2">
          <span className="run-fund__brand-mark" aria-hidden="true">
            <Image src="/fund-playground-logo.png" alt="" width={38} height={38} />
          </span>
          <span aria-hidden="true">✣</span>
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
        <nav className="run-fund__nav" aria-label="Primary navigation">
          <Link className="run-fund__nav-cta" href="/start">
            Switch Project
          </Link>
        </nav>
      </header>

      <div className="run-fund__layout">
        <section className="run-fund__configuration">
          <div className="run-fund__context">
            <h1>Fund the run</h1>
            <span>{decision}</span>
          </div>

          <div className="run-fund__range">
            <div>
              <label htmlFor="testerCount">Matched Australian testers</label>
              <output htmlFor="testerCount">{testerCount}</output>
            </div>
            <input
              id="testerCount"
              type="range"
              min={RUN_PRICING.minTesters}
              max={RUN_PRICING.maxTesters}
              step={1}
              value={testerCount}
              disabled={Boolean(payment)}
              onChange={(event) => setTesterCount(Number(event.target.value))}
            />
            <div className="run-fund__range-labels" aria-hidden="true">
              <span>3</span>
              <span>8</span>
            </div>
          </div>

          <div className="run-fund__split" aria-live="polite">
            <div className="run-fund__split-row run-fund__split-row--lead">
              <span>{testerCount} expert reviews</span>
              <strong>{money(split.total)}</strong>
            </div>
            <div className="run-fund__split-row run-fund__split-row--detail">
              <span>
                Testers ({testerCount} ×{" "}
                {money(RUN_PRICING.testerReceivesPerReview)})
              </span>
              <strong>{money(split.testers)}</strong>
            </div>
            <div className="run-fund__split-row run-fund__split-row--detail">
              <span>Playground (25%)</span>
              <strong>{money(split.playground)}</strong>
            </div>
            <div className="run-fund__split-row run-fund__split-row--total">
              <span>Total</span>
              <strong>{money(split.total)}</strong>
            </div>
          </div>
          <p className="run-fund__split-note">
            <Image src="/pinch-payments-logo.png" alt="Pinch Payments" width={496} height={200} />
            Split by Pinch at payment
          </p>
        </section>

        <section className="run-fund__payment">
          {payment ? (
            <div className="run-fund__success" aria-live="polite">
              <p className="run-fund__success-label">PINCH PAYMENT</p>
              <h2>Payment approved</h2>
              <div className="run-fund__receipt">
                <p>
                  <span>{payment.paymentId}</span> ·{" "}
                  <strong>approved</strong>
                </p>
                <p>
                  {money(payment.amount / 100)} ·{" "}
                  {payment.sourceBrand || "Visa"} ····
                  {payment.sourceLast4 || "4242"}
                </p>
                {payment.runStatus === "live" ? (
                  <>
                    <p className="run-fund__verified">
                      ✓ webhook received · signature verified
                    </p>
                    <p>→ Run {runId} is LIVE</p>
                  </>
                ) : (
                  <>
                    <p>Waiting for signed Pinch webhook…</p>
                    <p>Run remains payment pending.</p>
                  </>
                )}
              </div>
              <p className="run-fund__source-note">
                Card source vaulted. {payment.sourceReuseNotice}
              </p>
            </div>
          ) : (
            <>
              <div className="run-fund__payment-heading">
                <p>PINCH CAPTUREJS</p>
                <h2>Card details</h2>
                <span>
                  Card data goes directly to Pinch. Playground receives a
                  single-use token only.
                </span>
              </div>

              <form className="run-fund__form" onSubmit={onSubmit} noValidate>
                <label>
                  <span>Card number</span>
                  <input
                    ref={numberRef}
                    name="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                    required
                  />
                </label>
                <div className="run-fund__form-row">
                  <label>
                    <span>Month</span>
                    <input
                      ref={monthRef}
                      name="expiry-month"
                      inputMode="numeric"
                      autoComplete="cc-exp-month"
                      placeholder="MM"
                      maxLength={2}
                      required
                    />
                  </label>
                  <label>
                    <span>Year</span>
                    <input
                      ref={yearRef}
                      name="expiry-year"
                      inputMode="numeric"
                      autoComplete="cc-exp-year"
                      placeholder="YYYY"
                      maxLength={4}
                      required
                    />
                  </label>
                  <label>
                    <span>CVC</span>
                    <input
                      ref={cvcRef}
                      name="cvc"
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      maxLength={4}
                      required
                    />
                  </label>
                </div>
                <label>
                  <span>Cardholder name</span>
                  <input
                    ref={holderRef}
                    name="cardholder"
                    autoComplete="cc-name"
                    placeholder="Founder name"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Processing with Pinch…"
                    : `Fund run · ${money(split.total).replace(".00", "")}`}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
