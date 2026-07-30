"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  completeSessionTask,
  playgroundDb,
  saveScreenVisits,
} from "@/lib/product/db";
import type { SessionTask, TestSession } from "@/lib/product/types";
import type {
  BrowserSessionResponse,
  SessionStatus,
  VisitedScreen,
  VisitedScreensResponse,
} from "@/lib/browser/types";

interface TesterWorkspaceProps {
  status: SessionStatus;
  progressMessage: string;
  error: string | null;
  session: BrowserSessionResponse | null;
  startedAt: number | null;
  onStop: () => void | Promise<void>;
  onDisconnect: () => void;
  productSessionId?: string;
}

function mergeVisitedScreens(
  current: VisitedScreen[],
  incoming: VisitedScreen[],
): VisitedScreen[] {
  const knownIds = new Set(current.map((screen) => screen.id));
  return [
    ...current,
    ...incoming.filter((screen) => !knownIds.has(screen.id)),
  ].slice(-20);
}

function formatStartedAt(startedAt: number | null): string {
  if (!startedAt) {
    return "Not started";
  }
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startedAt));
}

function TaskHeader({
  session,
  status,
  startedAt,
  onStop,
  productSessionId,
}: Pick<
  TesterWorkspaceProps,
  "session" | "status" | "startedAt" | "onStop" | "productSessionId"
>) {
  const [secondsRemaining, setSecondsRemaining] = useState(20 * 60);
  const [isCompleting, setIsCompleting] = useState(false);
  const productSession = useLiveQuery<TestSession | undefined>(
    async () =>
      productSessionId
        ? await playgroundDb.sessions.get(productSessionId)
        : undefined,
    [productSessionId],
  );
  const tasks =
    useLiveQuery<SessionTask[]>(
      async () =>
        productSessionId
          ? await playgroundDb.tasks
              .where("sessionId")
              .equals(productSessionId)
              .sortBy("sequence")
          : [],
      [productSessionId],
    ) ?? [];
  const activeTask =
    tasks.find((task) => task.id === productSession?.currentTaskId) ??
    tasks.find((task) => task.status !== "completed");
  const completeCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const progress = tasks.length
    ? Math.round((completeCount / tasks.length) * 100)
    : 50;

  useEffect(() => {
    if (!session || !startedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1_000);
      setSecondsRemaining(Math.max(0, 20 * 60 - elapsed));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [session, startedAt]);

  const displayedSeconds = session ? secondsRemaining : 20 * 60;
  const timer = `${String(Math.floor(displayedSeconds / 60)).padStart(2, "0")}:${String(displayedSeconds % 60).padStart(2, "0")}`;

  const markTaskComplete = async () => {
    if (!productSessionId || !activeTask || isCompleting) {
      return;
    }
    setIsCompleting(true);
    try {
      const result = await completeSessionTask(productSessionId, activeTask.id);
      if (result.allComplete) {
        await onStop();
      }
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <header className="task-header">
      <div className="task-header__content">
        <div className="task-step">
          <span>
            Task{" "}
            {activeTask
              ? `${activeTask.sequence} of ${tasks.length}`
              : `${Math.min(completeCount + 1, tasks.length || 4)} of ${tasks.length || 4}`}
          </span>
          <strong>
            {activeTask?.title ??
              (tasks.length
                ? "All required tasks are complete."
                : "Create a job description for a Senior Backend Engineer.")}
          </strong>
        </div>
        <div
          aria-label={`Test progress: ${progress} percent`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="task-progress"
          role="progressbar"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="task-header__actions">
        {productSessionId && activeTask && (
          <button
            className="task-complete-button"
            disabled={!session || isCompleting}
            onClick={() => void markTaskComplete()}
            type="button"
          >
            {isCompleting ? "Saving…" : "Complete task"}
          </button>
        )}
        <div className="session-timer">
          <span aria-hidden="true">◷</span>
          <div>
            <strong>{timer}</strong>
            <small>remaining</small>
          </div>
        </div>
        <button
          className="end-session-button"
          disabled={!session || status === "stopping"}
          onClick={onStop}
          type="button"
        >
          {status === "stopping" ? "Ending…" : "End session"}
        </button>
      </div>
    </header>
  );
}

function EmptyBrowserState({
  disconnected = false,
}: {
  disconnected?: boolean;
}) {
  return (
    <div className="browser-state browser-empty">
      <div aria-hidden="true" className="empty-browser-mark">
        <span />
      </div>
      <h2>
        {disconnected
          ? "The browser disconnected"
          : "Your product will appear here"}
      </h2>
      <p>
        {disconnected
          ? "The remote session ended. Launch the product again to continue testing."
          : "Paste a public product URL and launch an isolated browser session."}
      </p>
    </div>
  );
}

function BrowserLoadingState({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="browser-state browser-loading">
      <div aria-hidden="true" className="loading-frame">
        <span className="loading-bar loading-bar--wide" />
        <span className="loading-bar loading-bar--medium" />
        <span className="loading-block" />
      </div>
      <p>{message}</p>
      <small>Preparing a secure, isolated product session.</small>
    </div>
  );
}

function BrowserErrorState({ message }: { message: string }) {
  return (
    <div className="browser-state browser-error" role="alert">
      <div aria-hidden="true" className="error-mark">
        !
      </div>
      <h2>Session unavailable</h2>
      <p>{message}</p>
    </div>
  );
}

function RemoteBrowserView({
  session,
  onDisconnect,
}: {
  session: BrowserSessionResponse;
  onDisconnect: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [streamWarming, setStreamWarming] = useState(true);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const eventType =
        typeof event.data === "string"
          ? event.data
          : typeof event.data === "object" &&
              event.data !== null &&
              "type" in event.data &&
              typeof event.data.type === "string"
            ? event.data.type
            : "";

      if (eventType === "browserbase-disconnected") {
        onDisconnect();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onDisconnect]);

  useEffect(() => {
    const warmupTimer = window.setTimeout(() => {
      setStreamWarming(false);
    }, 8_000);
    return () => window.clearTimeout(warmupTimer);
  }, []);

  return (
    <div className="remote-browser">
      {frameError && (
        <div className="iframe-error" role="alert">
          <p>{frameError}</p>
          <a href={session.liveViewUrl} rel="noreferrer" target="_blank">
            Open Live View <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      {streamWarming && !frameError && (
        <div aria-live="polite" className="live-view-warming">
          <div aria-hidden="true" className="stream-pulse">
            <span />
          </div>
          <strong>Connecting the first live frame…</strong>
          <p>
            Browserbase is synchronising the interactive stream. This usually
            takes 20–30 seconds.
          </p>
          <button onClick={() => setStreamWarming(false)} type="button">
            Show browser now
          </button>
        </div>
      )}
      <iframe
        allow="clipboard-read; clipboard-write"
        className="live-view"
        onError={() =>
          setFrameError(
            "The Live View failed to load. Open it in a new tab or restart the session.",
          )
        }
        onLoad={() => {
          setFrameError(null);
          setStreamWarming(false);
        }}
        ref={iframeRef}
        sandbox="allow-same-origin allow-scripts"
        src={session.liveViewUrl}
        title={`Live product test for ${session.hostname}`}
      />
    </div>
  );
}

function LiveBrowserCard({
  status,
  progressMessage,
  error,
  session,
  onDisconnect,
}: Omit<TesterWorkspaceProps, "startedAt" | "onStop">) {
  const [showHint, setShowHint] = useState(true);

  const isLive = status === "connected" || status === "stopping";

  return (
    <section className="live-browser-card">
      <header className="browser-label-bar">
        <div className="browser-label-bar__identity">
          <span
            aria-hidden="true"
            className={`toolbar-dot ${isLive ? "toolbar-dot--live" : ""}`}
          />
          <strong>{session?.hostname ?? "Product browser"}</strong>
          {isLive && <span className="live-badge">LIVE</span>}
          <span className="isolation-label">Isolated session</span>
        </div>
        {session && (
          <a
            aria-label="Open Live View in a new tab"
            className="open-live-view"
            href={session.liveViewUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open separately <span aria-hidden="true">↗</span>
          </a>
        )}
      </header>

      <div className="browser-surface">
        {status === "launching" ? (
          <BrowserLoadingState message={progressMessage} />
        ) : status === "disconnected" ? (
          <EmptyBrowserState disconnected />
        ) : status === "error" && !session ? (
          <BrowserErrorState
            message={error ?? "The browser could not be launched."}
          />
        ) : session ? (
          <>
            <RemoteBrowserView
              onDisconnect={onDisconnect}
              session={session}
            />
            {showHint && (
              <div className="contextual-hint">
                <span aria-hidden="true">⌁</span>
                <p>
                  Choose a feedback type, then note the part of the product it
                  relates to.
                </p>
                <button
                  aria-label="Dismiss tip"
                  onClick={() => setShowHint(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyBrowserState />
        )}
      </div>
    </section>
  );
}

function ActiveScreenSequence({
  session,
  productSessionId,
}: {
  session: BrowserSessionResponse;
  productSessionId?: string;
}) {
  const [screens, setScreens] = useState<VisitedScreen[]>([]);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  const loadScreens = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/browser/session/screens?sessionId=${encodeURIComponent(session.sessionId)}`,
        { cache: "no-store", signal },
      );
      if (!response.ok) {
        throw new Error("Screen tracking is temporarily unavailable.");
      }
      const data = (await response.json()) as VisitedScreensResponse;
      setScreens((current) => mergeVisitedScreens(current, data.screens));
      if (productSessionId) {
        await saveScreenVisits(productSessionId, data.screens);
      }
      setTrackingError(null);
    },
    [productSessionId, session.sessionId],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => {
      void loadScreens(controller.signal).catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setTrackingError(
            "Screen tracking paused. Use Mark current to retry.",
          );
        }
      });
    }, 0);
    const interval = window.setInterval(() => {
      void loadScreens(controller.signal).catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setTrackingError("Screen tracking paused. Use Mark current to retry.");
        }
      });
    }, 3_500);

    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadScreens]);

  const markCurrentScreen = async () => {
    setIsMarking(true);
    try {
      const response = await fetch("/api/browser/session/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      if (!response.ok) {
        throw new Error("Screen capture failed.");
      }
      const data = (await response.json()) as VisitedScreensResponse;
      setScreens((current) => mergeVisitedScreens(current, data.screens));
      if (productSessionId) {
        await saveScreenVisits(productSessionId, data.screens);
      }
      setTrackingError(null);
    } catch {
      setTrackingError("Could not mark this screen. Try again.");
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <>
      <div className="visited-screens__heading">
        <div>
          <h2>Screens visited</h2>
          <span aria-live="polite">
            {trackingError ??
              `${screens.length} screen${screens.length === 1 ? "" : "s"} captured`}
          </span>
        </div>
        <button
          disabled={isMarking}
          onClick={markCurrentScreen}
          type="button"
        >
          {isMarking ? "Marking…" : "+ Mark current"}
        </button>
      </div>
      <div className="screen-sequence">
        {screens.length === 0 ? (
          <p className="screen-tracking-state">Reading the current screen…</p>
        ) : (
          screens.map((screen, index) => {
            const active = index === screens.length - 1;
            const complete = !active;
            return (
              <article
                className={`screen-step ${active ? "screen-step--active" : ""}`}
                key={screen.id}
                title={screen.url}
              >
                <div className="screen-thumbnail" aria-hidden="true">
                  <span className="screen-thumbnail__bar" />
                  <span className="screen-thumbnail__block" />
                  <span className="screen-thumbnail__line" />
                </div>
                <div className="screen-step__meta">
                  <span
                    className={`screen-step__number ${complete ? "screen-step__number--complete" : ""}`}
                  >
                    {complete ? "✓" : index + 1}
                  </span>
                  <strong>{screen.name}</strong>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}

function VisitedScreensStrip({
  session,
  startedAt,
  productSessionId,
}: Pick<TesterWorkspaceProps, "session" | "startedAt" | "productSessionId">) {
  const startedLabel = useMemo(() => formatStartedAt(startedAt), [startedAt]);

  return (
    <footer className="session-footer">
      <section className="visited-screens">
        {session ? (
          <ActiveScreenSequence
            key={session.sessionId}
            productSessionId={productSessionId}
            session={session}
          />
        ) : (
          <>
            <div className="visited-screens__heading">
              <div>
                <h2>Screens visited</h2>
                <span>Waiting to begin</span>
              </div>
            </div>
            <div className="screen-sequence screen-sequence--empty">
              <p>Visited screens will appear here as you navigate.</p>
            </div>
          </>
        )}
      </section>

      <aside className="session-info">
        <div className="session-info__heading">
          <h2>Session info</h2>
          <span aria-hidden="true">•••</span>
        </div>
        <dl>
          <div>
            <dt>Started</dt>
            <dd>{startedLabel}</dd>
          </div>
          <div>
            <dt>Test type</dt>
            <dd>Prototype</dd>
          </div>
          <div>
            <dt>Tester</dt>
            <dd>Alex Morgan</dd>
          </div>
        </dl>
      </aside>
    </footer>
  );
}

export function TesterWorkspace(props: TesterWorkspaceProps) {
  return (
    <section className="tester-workspace">
      <TaskHeader
        key={props.startedAt ?? "idle"}
        onStop={props.onStop}
        session={props.session}
        startedAt={props.startedAt}
        status={props.status}
        productSessionId={props.productSessionId}
      />
      <div className="browser-stage">
        <LiveBrowserCard
          key={props.session?.sessionId ?? props.status}
          error={props.error}
          onDisconnect={props.onDisconnect}
          progressMessage={props.progressMessage}
          session={props.session}
          status={props.status}
        />
      </div>
      <VisitedScreensStrip
        session={props.session}
        startedAt={props.startedAt}
        productSessionId={props.productSessionId}
      />
    </section>
  );
}
