"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TesterSidebar } from "@/components/browser-lab/TesterSidebar";
import { TesterWorkspace } from "@/components/browser-lab/TesterWorkspace";
import type {
  ApiErrorResponse,
  BrowserSessionResponse,
  SessionStatus,
  ViewportMode,
} from "@/lib/browser/types";
import { validatePublicHttpsUrl } from "@/lib/browser/url-validation";

const DEFAULT_URL = "https://ingen-hrandstudent-5.vercel.app";
const CLIENT_REQUEST_TIMEOUT = 75_000;

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>;
    return (
      body.error?.message ??
      "Playground could not complete the browser request. Try again."
    );
  } catch {
    return "Playground could not complete the browser request. Try again.";
  }
}

export function BrowserLabClient({
  browserbaseConfigured,
  defaultUrl = DEFAULT_URL,
  productSessionId,
}: {
  browserbaseConfigured: boolean;
  defaultUrl?: string;
  productSessionId?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(defaultUrl);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [session, setSession] = useState<BrowserSessionResponse | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState(
    "Creating an isolated browser…",
  );
  const launchControllerRef = useRef<AbortController | null>(null);
  const launchAttemptRef = useRef(0);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(
    () => () => {
      launchControllerRef.current?.abort();
    },
    [],
  );

  const requestStop = useCallback(async (sessionId: string) => {
    const response = await fetch("/api/browser/session/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
  }, []);

  const handleStop = useCallback(async () => {
    if (!session || status === "stopping") {
      return;
    }

    setStatus("stopping");
    setError(null);
    try {
      await requestStop(session.sessionId);
      setSession(null);
      setStartedAt(null);
      setStatus("stopped");
      if (productSessionId) {
        const { playgroundDb } = await import("@/lib/product/db");
        await playgroundDb.sessions.update(productSessionId, {
          state: "reviewing",
          endedAt: Date.now(),
        });
        router.push(`/tester/sessions/${productSessionId}/review`);
      }
    } catch (stopError) {
      const message =
        stopError instanceof Error
          ? stopError.message
          : "Playground could not end this browser session. Try again.";
      setStatus("error");
      setError(message);
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  }, [productSessionId, requestStop, router, session, status]);

  const handleLaunch = useCallback(async () => {
    if (status === "launching" || status === "stopping") {
      return;
    }

    if (!browserbaseConfigured) {
      const message =
        "Add BROWSERBASE_API_KEY to .env.local and restart the development server before launching.";
      setError(message);
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }

    const validation = validatePublicHttpsUrl(url);
    if (!validation.success) {
      setStatus("error");
      setError(validation.message);
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }

    if (session) {
      try {
        await requestStop(session.sessionId);
      } catch (replacementError) {
        console.warn(
          "The previous browser session could not be released before replacement.",
          replacementError,
        );
      }
    }

    launchControllerRef.current?.abort();
    const launchAttempt = launchAttemptRef.current + 1;
    launchAttemptRef.current = launchAttempt;
    const controller = new AbortController();
    launchControllerRef.current = controller;
    const clientTimeout = window.setTimeout(
      () => controller.abort(),
      CLIENT_REQUEST_TIMEOUT,
    );
    const hostname = validation.url.hostname;
    const stages = [
      { delay: 0, copy: "Creating an isolated browser…" },
      { delay: 850, copy: `Opening ${hostname}…` },
      { delay: 1_900, copy: "Waiting for the first screen…" },
      { delay: 3_200, copy: "Preparing the live testing workspace…" },
    ];
    const stageTimers = stages.map(({ delay, copy }) =>
      window.setTimeout(() => {
        if (launchAttemptRef.current === launchAttempt) {
          setProgressMessage(copy);
        }
      }, delay),
    );

    setSession(null);
    setStartedAt(null);
    setStatus("launching");
    setError(null);
    setProgressMessage(stages[0].copy);

    try {
      const response = await fetch("/api/browser/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: validation.url.toString(),
          viewport,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const nextSession = (await response.json()) as BrowserSessionResponse;
      if (launchAttemptRef.current !== launchAttempt) {
        return;
      }
      setSession(nextSession);
      setStartedAt(Date.now());
      setError(null);
      setStatus("connected");
      if (productSessionId) {
        const { playgroundDb } = await import("@/lib/product/db");
        const productSession =
          await playgroundDb.sessions.get(productSessionId);
        if (productSession) {
          await playgroundDb.sessions.update(productSessionId, {
            state: "testing",
            browserSessionId: nextSession.sessionId,
          });
          await playgroundDb.assignments.update(productSession.assignmentId, {
            status: "in-progress",
          });
        }
      }
    } catch (launchError) {
      if (launchAttemptRef.current !== launchAttempt) {
        return;
      }
      const message =
        launchError instanceof DOMException && launchError.name === "AbortError"
          ? "The browser launch request timed out. No live view was returned; try again."
          : launchError instanceof Error
            ? launchError.message
            : "Playground could not launch the browser. Try again.";
      setStatus("error");
      setError(message);
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      window.clearTimeout(clientTimeout);
      stageTimers.forEach((timer) => window.clearTimeout(timer));
      if (
        launchAttemptRef.current === launchAttempt &&
        launchControllerRef.current === controller
      ) {
        launchControllerRef.current = null;
      }
    }
  }, [
    browserbaseConfigured,
    productSessionId,
    requestStop,
    session,
    status,
    url,
    viewport,
  ]);

  const handleDisconnect = useCallback(() => {
    setSession(null);
    setStartedAt(null);
    setStatus("disconnected");
    setError(
      "The Browserbase Live View disconnected. Relaunch the product to create a fresh session.",
    );
  }, []);

  return (
    <main className="browser-lab">
      <TesterSidebar
        browserbaseConfigured={browserbaseConfigured}
        error={error}
        errorRef={errorRef}
        onLaunch={handleLaunch}
        onStop={handleStop}
        onUrlChange={setUrl}
        onViewportChange={setViewport}
        productSessionId={productSessionId}
        session={session}
        status={status}
        url={url}
        viewport={viewport}
      />
      <TesterWorkspace
        error={error}
        onDisconnect={handleDisconnect}
        onStop={handleStop}
        progressMessage={progressMessage}
        productSessionId={productSessionId}
        session={session}
        startedAt={startedAt}
        status={status}
      />
    </main>
  );
}
