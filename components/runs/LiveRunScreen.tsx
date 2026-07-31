"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRemoteBrowserSession } from "@/components/browser-lab/useRemoteBrowserSession";
import { ProductBrowserSurface } from "@/components/campaigns/ProductBrowserSurface";
import { getCampaign } from "@/lib/campaign/store";
import type { Campaign } from "@/lib/campaign/types";
import {
  createSeededTesterSessions,
  loadOrSeedTesterSessions,
  type DemoTesterSession,
  type TesterPinSeverity,
} from "@/lib/runs/demo-tester-sessions";

const PRODUCT_URL = "https://www.ingenworkspace.com";

const SEVERITY_CLASS: Record<TesterPinSeverity, string> = {
  Confusing: "is-confusing",
  Broken: "is-broken",
  Trust: "is-trust",
};

export function LiveRunScreen({
  browserbaseConfigured,
  runId,
}: {
  browserbaseConfigured: boolean;
  runId: string;
}) {
  const initialSessions = useMemo(
    () => createSeededTesterSessions(runId),
    [runId],
  );
  const [sessions, setSessions] =
    useState<DemoTesterSession[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState(
    initialSessions[0].id,
  );
  const [selectedScreenId, setSelectedScreenId] = useState(
    initialSessions[0].screens[0].id,
  );
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const autoLaunchRef = useRef(false);
  const {
    status,
    session,
    error,
    progressMessage,
    handleLaunch,
    handleDisconnect,
  } = useRemoteBrowserSession({
    browserbaseConfigured,
    defaultUrl: PRODUCT_URL,
  });

  useEffect(() => {
    setSessions(loadOrSeedTesterSessions(runId));
    void getCampaign(runId).then((record) => setCampaign(record ?? null));
  }, [runId]);

  const runIsLive =
    campaign === null ||
    ["live", "evidence_pending", "results_ready"].includes(campaign.status);

  useEffect(() => {
    if (
      !browserbaseConfigured ||
      !runIsLive ||
      autoLaunchRef.current
    ) {
      return;
    }
    autoLaunchRef.current = true;
    void handleLaunch();
  }, [browserbaseConfigured, handleLaunch, runIsLive]);

  const selectedSession =
    sessions.find((item) => item.id === selectedSessionId) ?? sessions[0];
  const selectedScreen =
    selectedSession.screens.find((item) => item.id === selectedScreenId) ??
    selectedSession.screens[0];
  const visiblePins = selectedSession.pins.filter(
    (pin) => pin.screenId === selectedScreen.id,
  );
  const testingCount = sessions.filter(
    (item) => item.status === "testing",
  ).length;
  const allComplete = sessions.every((item) => item.status === "complete");

  const selectSession = (next: DemoTesterSession) => {
    setSelectedSessionId(next.id);
    setSelectedScreenId(next.screens[0].id);
  };

  return (
    <main className="live-run">
      <header className="live-run__topbar">
        <Link className="live-run__brand" href="/landing-2">
          <Image alt="" height={31} src="/playground-mark.png" width={31} />
          <span>Playground</span>
        </Link>
        <div className="live-run__progress" aria-live="polite">
          <span>{testingCount} of {sessions.length} testing ·</span>
          <strong>{runIsLive ? "Live" : "Awaiting activation"}</strong>
        </div>
      </header>

      <section className="live-run__heading">
        <div>
          <p>RUN {runId} · LIVE EVIDENCE</p>
          <h1>Watch the pattern emerge.</h1>
          <span>
            Tester pins replay against the founder-authorised product at any
            viewport size.
          </span>
        </div>
        {allComplete ? (
          <Link
            className="live-run__verdict"
            href={`/runs/${encodeURIComponent(runId)}/verdict`}
          >
            Open verdict →
          </Link>
        ) : null}
      </section>

      <div className="live-run__workspace">
        <section className="live-run__stage" aria-label="Captured product evidence">
          <header className="live-run__stage-header">
            <div>
              <span>Captured screen</span>
              <strong>{selectedSession.testerName}</strong>
            </div>
            <nav aria-label="Captured screens">
              {selectedSession.screens.map((screen) => (
                <button
                  aria-pressed={screen.id === selectedScreen.id}
                  className={screen.id === selectedScreen.id ? "is-active" : ""}
                  key={screen.id}
                  onClick={() => setSelectedScreenId(screen.id)}
                  type="button"
                >
                  {screen.label}
                </button>
              ))}
            </nav>
          </header>

          <div className="live-run__browser-wrap">
            <ProductBrowserSurface
              compact
              error={error}
              onDisconnect={handleDisconnect}
              onRetry={() => void handleLaunch()}
              productUrl={`${PRODUCT_URL}${selectedScreen.path}`}
              progressMessage={progressMessage}
              session={session}
              status={status}
            />
            <div className="live-run__pin-layer" aria-label="Tester evidence pins">
              {visiblePins.map((pin, index) => (
                <span
                  className={`live-run__pin ${SEVERITY_CLASS[pin.severity]}`}
                  key={pin.id}
                  style={{
                    left: `${pin.xPercent}%`,
                    top: `${pin.yPercent}%`,
                  }}
                  title={`${pin.severity}: ${pin.note}`}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>

          <div className="live-run__pin-notes">
            {visiblePins.map((pin, index) => (
              <article key={pin.id}>
                <span className={SEVERITY_CLASS[pin.severity]}>
                  {index + 1}
                </span>
                <div>
                  <strong>{pin.severity}</strong>
                  <p>{pin.note}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="live-run__rail">
          <header>
            <div>
              <p>Evidence rail</p>
              <h2>Tester sessions</h2>
            </div>
            <span>seeded demo data · {sessions.length} tester sessions</span>
          </header>

          <ol>
            {sessions.map((tester, index) => {
              const clustered = tester.pins.some(
                (pin) =>
                  pin.note ===
                  "No example evidence dossier is visible before the demo call-to-action.",
              );
              return (
                <li key={tester.id}>
                  <button
                    aria-pressed={tester.id === selectedSession.id}
                    className={
                      tester.id === selectedSession.id ? "is-active" : ""
                    }
                    onClick={() => selectSession(tester)}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{tester.testerName}</strong>
                      <small>
                        {tester.pins.length} pins ·{" "}
                        {tester.status === "complete"
                          ? "Complete"
                          : tester.status === "testing"
                            ? "Testing"
                            : "Waiting"}
                      </small>
                    </div>
                    <i aria-hidden="true" />
                  </button>
                  {clustered ? (
                    <p>
                      <span>Trust</span>
                      Evidence dossier not visible before booking.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <footer>
            <span>Cluster detected</span>
            <strong>5 of 5 need proof before booking</strong>
            <p>
              The same trust issue appears independently across every seeded
              tester session.
            </p>
          </footer>
        </aside>
      </div>
    </main>
  );
}
