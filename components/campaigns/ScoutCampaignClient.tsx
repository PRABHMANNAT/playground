"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProductBrowserSurface } from "@/components/campaigns/ProductBrowserSurface";
import { useRemoteBrowserSession } from "@/components/browser-lab/useRemoteBrowserSession";
import { getCampaign } from "@/lib/campaign/store";
import type { Campaign } from "@/lib/campaign/types";
import type { ViewportMode } from "@/lib/browser/types";

const PRODUCT_URL = "https://www.ingenworkspace.com";

const ACTIVITY = [
  ["Payment approved", "10:42:07"],
  ["Validation run funded", "10:42:08"],
  ["Scout started", "10:42:10"],
  ["Product structure captured", "10:42:13"],
  ["Validation tasks generated", "10:42:15"],
  ["Tester tasks released", "10:42:18"],
] as const;

const TESTER_TASKS = [
  "Explain the product in one sentence.",
  "Find how the product works.",
  "Attempt to request a demo.",
  "Mark anything that reduces trust.",
];

function connectionLabel(status: ReturnType<typeof useRemoteBrowserSession>["status"]) {
  if (status === "connected") return "Connected";
  if (status === "launching") return "Connecting";
  if (status === "stopping") return "Stopping";
  if (status === "disconnected") return "Disconnected";
  if (status === "error") return "Fallback active";
  return "Not connected";
}

export function ScoutCampaignClient({
  browserbaseConfigured,
  campaignId,
}: {
  browserbaseConfigured: boolean;
  campaignId: string;
}) {
  const {
    viewport: activeViewport,
    setViewport: updateViewport,
    status,
    session,
    error,
    progressMessage,
    errorRef,
    handleLaunch,
    handleStop,
    handleDisconnect,
  } = useRemoteBrowserSession({
    browserbaseConfigured,
    defaultUrl: PRODUCT_URL,
  });
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(
    undefined,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const autoLaunchRef = useRef(false);

  useEffect(() => {
    void getCampaign(campaignId).then((value) => setCampaign(value ?? null));
  }, [campaignId]);

  useEffect(() => {
    const campaignIsActive =
      campaign &&
      ["live", "evidence_pending", "results_ready"].includes(campaign.status);
    if (
      !browserbaseConfigured ||
      !campaignIsActive ||
      autoLaunchRef.current
    ) {
      return;
    }
    autoLaunchRef.current = true;
    void handleLaunch();
  }, [browserbaseConfigured, campaign, handleLaunch]);

  const campaignIsActive =
    !!campaign &&
    ["live", "evidence_pending", "results_ready"].includes(campaign.status);
  const paymentId = campaign?.pinchPaymentId || "pmt_XXXXXXXX";
  const activationTime = campaign?.activatedAt
    ? new Intl.DateTimeFormat("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(campaign.activatedAt)
    : "Awaiting verified payment";
  const scan = session?.initialScan;
  const observations = useMemo(
    () => [
      {
        title: "Page title captured",
        detail: scan?.title || "INGEN product homepage",
      },
      {
        title: "Main heading found",
        detail:
          scan?.headings.find((heading) => heading.level === 1)?.text ||
          scan?.headings[0]?.text ||
          "Homepage value proposition located",
      },
      {
        title: "Primary actions identified",
        detail: scan
          ? `${scan.visibleButtons.length + scan.visibleLinks.length} visible actions`
          : "Demo and product paths detected",
      },
      {
        title: "Navigation links counted",
        detail: scan ? `${scan.visibleLinks.length} visible links` : "Awaiting live scan",
      },
      {
        title: "One possible trust issue detected",
        detail:
          scan && scan.consoleErrors.length + scan.failedRequests.length > 0
            ? `${scan.consoleErrors.length + scan.failedRequests.length} technical signal detected`
            : "Evidence clarity requires tester review",
      },
    ],
    [scan],
  );

  const setViewport = (viewport: ViewportMode) => {
    updateViewport(viewport);
  };

  return (
    <main className="cw-shell">
      <header className="cw-topbar">
        <Link className="cw-brand" href="/">
          <span aria-hidden="true">P</span>
          Playground
        </Link>
        <div className="cw-topbar__status">
          <span className="cw-live-dot" aria-hidden="true" />
          {campaign === undefined
            ? "Loading validation run…"
            : campaignIsActive
              ? "Funded through Pinch · Validation run active"
              : "Validation run not active"}
        </div>
      </header>

      <div className="cw-page">
        <section className="cw-hero">
          <div>
            <p className="cw-kicker">Scout workspace · {campaignId}</p>
            <h1>Pinch starts the work.</h1>
            <p>
              {campaignIsActive
                ? "Payment has activated a live validation run. Scout is turning the authorised product into focused tester tasks."
                : "Scout will start only after Playground verifies the Pinch payment and activates this validation run."}
            </p>
          </div>
          <div className="cw-hero__actions">
            <button
              className="cw-link-action"
              disabled={!campaignIsActive}
              onClick={() => setPaymentOpen(true)}
              type="button"
            >
              View payment event
            </button>
            <Link
              className="cw-primary-action"
              href={
                campaignIsActive
                  ? `/tester/campaigns/${campaignId}`
                  : "/founder/new"
              }
            >
              {campaignIsActive
                ? "Open tester tasks"
                : "Activate validation run first"}{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <dl className="cw-metadata">
          <div>
            <dt>Validation run ID</dt>
            <dd>{campaignId}</dd>
          </div>
          <div>
            <dt>Funding</dt>
            <dd>{campaignIsActive ? "A$199 funded" : "Awaiting funding"}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>Test mode</dd>
          </div>
          <div>
            <dt>Payment ID</dt>
            <dd>{paymentId}</dd>
          </div>
          <div className="cw-metadata__url">
            <dt>Product URL</dt>
            <dd>{PRODUCT_URL}</dd>
          </div>
        </dl>

        <div className="cw-scout-layout">
          <aside className="cw-scout-panel">
            <section className="cw-section cw-controls">
              <div className="cw-section__heading">
                <div>
                  <span className="cw-section__index">01</span>
                  <h2>Scout controls</h2>
                </div>
                <span
                  className={`cw-connection cw-connection--${status}`}
                >
                  {connectionLabel(status)}
                </span>
              </div>

              <label className="cw-url-field">
                <span>Product URL</span>
                <input readOnly value={PRODUCT_URL} />
                <small>Founder-authorised destination</small>
              </label>

              <div className="cw-control-row">
                <div>
                  <span className="cw-field-label">Viewport</span>
                  <div className="cw-segmented" role="group" aria-label="Viewport">
                    {(["desktop", "mobile"] as const).map((viewport) => (
                      <button
                        aria-pressed={activeViewport === viewport}
                        className={
                          activeViewport === viewport ? "is-active" : ""
                        }
                        key={viewport}
                        onClick={() => setViewport(viewport)}
                        type="button"
                      >
                        {viewport === "desktop" ? "Desktop" : "Mobile"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cw-session-actions">
                  <button
                    disabled={
                      status === "launching" ||
                      status === "stopping"
                    }
                    onClick={() => void handleLaunch()}
                    type="button"
                  >
                    Replace browser
                  </button>
                  <button
                    className="cw-stop"
                    disabled={!session || status === "stopping"}
                    onClick={() => void handleStop()}
                    type="button"
                  >
                    Stop session
                  </button>
                </div>
              </div>
              {error ? (
                <p className="cw-inline-error" ref={errorRef} tabIndex={-1}>
                  {error}
                </p>
              ) : null}
            </section>

            <section className="cw-section">
              <div className="cw-section__heading">
                <div>
                  <span className="cw-section__index">02</span>
                  <h2>Scout activity</h2>
                </div>
                <span className="cw-muted-label">6 events</span>
              </div>
              {campaignIsActive ? (
                <ol className="cw-timeline">
                  {ACTIVITY.map(([label, time], index) => (
                    <li key={label}>
                      <span className="cw-timeline__rail">
                        <i aria-hidden="true">{index + 1}</i>
                      </span>
                      <div>
                        <strong>{label}</strong>
                        <small>{time} AEST</small>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="cw-locked-state">
                  <strong>Awaiting verified payment</strong>
                  <span>No Scout activity has started.</span>
                </div>
              )}
            </section>

            <section className="cw-section cw-mission">
              <div className="cw-section__heading">
                <div>
                  <span className="cw-section__index">03</span>
                  <h2>Generated validation tasks</h2>
                </div>
                <span className="cw-ai-label">
                  AI-generated prototype analysis
                </span>
              </div>
              <p className="cw-mission__label">Decision to answer</p>
              <h3>Can a recruiter understand the product and request a demo?</h3>
              <p className="cw-mission__label">Tester tasks</p>
              <ol className="cw-task-list">
                {TESTER_TASKS.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ol>
            </section>

            <section className="cw-section cw-observations">
              <div className="cw-section__heading">
                <div>
                  <span className="cw-section__index">04</span>
                  <h2>Scout observations</h2>
                </div>
                <span className="cw-ai-label">
                  AI-generated prototype analysis
                </span>
              </div>
              <div className="cw-observation-list">
                {observations.slice(0, 3).map((observation) => (
                  <div className="is-key" key={observation.title}>
                    <span aria-hidden="true">✓</span>
                    <p>
                      <strong>{observation.title}</strong>
                      <small>{observation.detail}</small>
                    </p>
                  </div>
                ))}
              </div>
              <div className="cw-supporting-signals">
                <span>Supporting signals</span>
                <ul>
                  {observations.slice(3).map((observation) => (
                    <li key={observation.title}>
                      <strong>{observation.title}</strong>
                      <small>{observation.detail}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </aside>

          <section className="cw-product-column">
            <div className="cw-product-column__heading">
              <div>
                <p className="cw-kicker">Live product browser</p>
                <h2>Founder-authorised product</h2>
              </div>
              <span>Session {session ? "active" : "fallback"}</span>
            </div>
            <ProductBrowserSurface
              error={error}
              onDisconnect={handleDisconnect}
              onRetry={() => void handleLaunch()}
              productUrl={PRODUCT_URL}
              progressMessage={progressMessage}
              session={session}
              status={status}
            />
            <div className="cw-product-note">
              <strong>Pinch does not finish the journey.</strong>
              <span>Pinch starts the work.</span>
            </div>
          </section>
        </div>
      </div>

      {paymentOpen ? (
        <div
          className="cw-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPaymentOpen(false);
          }}
        >
          <aside
            aria-labelledby="payment-event-title"
            aria-modal="true"
            className="cw-drawer"
            role="dialog"
          >
            <header>
              <div>
                <p className="cw-kicker">Pinch event</p>
                <h2 id="payment-event-title">Validation run activation</h2>
              </div>
              <button
                aria-label="Close payment event"
                onClick={() => setPaymentOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <span className="cw-approved">
              <i aria-hidden="true" /> Approved
            </span>
            <dl>
              <div>
                <dt>Payment ID</dt>
                <dd>{paymentId}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>A$199.00</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>Approved</dd>
              </div>
              <div>
                <dt>Validation run activated</dt>
                <dd>{activationTime}</dd>
              </div>
            </dl>
            <p>
              Verified funding activated Scout and released the validation
              workflow.
            </p>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
