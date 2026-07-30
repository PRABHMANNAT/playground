import { NextResponse } from "next/server";
import { chromium, type Browser } from "playwright-core";

import type {
  ApiErrorResponse,
  BrowserSessionResponse,
} from "@/lib/browser/types";
import { createSessionRequestSchema } from "@/lib/browser/url-validation";
import {
  activeBrowserSessionIds,
  closeActiveBrowser,
  registerActiveBrowser,
} from "@/lib/browser/server/active-sessions";
import { getBrowserbaseClient } from "@/lib/browser/server/browserbase";
import {
  logServerError,
  normalizeNavigationError,
  normalizeSessionError,
} from "@/lib/browser/server/errors";
import {
  registerPageSignals,
  scanPage,
} from "@/lib/browser/server/scan-page";

export const runtime = "nodejs";
export const maxDuration = 65;

const VIEWPORTS = {
  desktop: { width: 1_440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status });
}

function withHiddenNavbar(value: string): string {
  const url = new URL(value);
  url.searchParams.set("navbar", "false");
  return url.toString();
}

export async function POST(
  request: Request,
): Promise<NextResponse<BrowserSessionResponse | ApiErrorResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Send a valid JSON request body.");
  }

  const parsed = createSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_url",
      parsed.error.issues[0]?.message ?? "Enter a valid public HTTPS URL.",
    );
  }

  const targetUrl = new URL(parsed.data.url);
  const browserbase = (() => {
    try {
      return getBrowserbaseClient();
    } catch (error) {
      const normalized = normalizeSessionError(error);
      return errorResponse(
        normalized.status,
        normalized.code,
        normalized.message,
      );
    }
  })();

  if (browserbase instanceof NextResponse) {
    return browserbase;
  }

  let browser: Browser | null = null;
  let createdSessionId: string | null = null;

  try {
    const listedSessions = await Promise.all([
      browserbase.sessions.list({ status: "RUNNING" }),
      browserbase.sessions.list({ status: "PENDING" }),
    ]);
    const staleSessionIds = new Set([
      ...activeBrowserSessionIds(),
      ...listedSessions
        .flat()
        .filter(
          (candidate) =>
            candidate.userMetadata?.source === "playground-browser-lab",
        )
        .map((candidate) => candidate.id),
    ]);

    for (const staleSessionId of staleSessionIds) {
      try {
        await browserbase.sessions.update(staleSessionId, {
          status: "REQUEST_RELEASE",
        });
      } catch (error) {
        logServerError("Failed to release a replaced session", error);
      }
      try {
        await closeActiveBrowser(staleSessionId);
      } catch (error) {
        logServerError("Failed to close a replaced Playwright client", error);
      }
    }

    const session = await browserbase.sessions.create({
      keepAlive: true,
      timeout: 900,
      region: "ap-southeast-1",
      browserSettings: {
        viewport: VIEWPORTS[parsed.data.viewport],
      },
      userMetadata: {
        source: "playground-browser-lab",
        targetHostname: targetUrl.hostname,
        createdAt: new Date().toISOString(),
      },
    });
    createdSessionId = session.id;

    browser = await chromium.connectOverCDP(session.connectUrl, {
      timeout: 20_000,
    });
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error("Browserbase did not provide its default context.");
    }

    const page = context.pages()[0] ?? (await context.newPage());
    const signals = registerPageSignals(page);

    let navigationMessage: string | null = null;
    try {
      await page.goto(parsed.data.url, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      // Modern products often render their useful UI just after DOMContentLoaded.
      await page.waitForTimeout(1_500);
    } catch (error) {
      navigationMessage = normalizeNavigationError(error);
      logServerError("Navigation attempt failed", error);
    }

    const initialScan = await scanPage(page, signals, parsed.data.url);
    const liveView = await browserbase.sessions.debug(session.id);
    const matchingLivePage = [...liveView.pages]
      .reverse()
      .find(
        (candidate) =>
          candidate.url === initialScan.finalUrl ||
          (initialScan.title && candidate.title === initialScan.title),
      );
    const response: BrowserSessionResponse = {
      sessionId: session.id,
      liveViewUrl: withHiddenNavbar(
        matchingLivePage?.debuggerFullscreenUrl ??
          liveView.debuggerFullscreenUrl,
      ),
      pageTitle: initialScan.title,
      finalUrl: initialScan.finalUrl,
      hostname: initialScan.hostname,
      expiresAt: session.expiresAt ?? null,
      navigation: {
        status: navigationMessage ? "failed" : "succeeded",
        message: navigationMessage,
      },
      initialScan,
    };

    // browser.close() explicitly terminates Browserbase sessions. Keep this CDP
    // connection open until the Stop endpoint requests release.
    registerActiveBrowser(session.id, browser, {
      url: initialScan.finalUrl,
      title: initialScan.title,
      heading: initialScan.headings[0]?.text,
    });
    browser = null;
    return NextResponse.json(response);
  } catch (error) {
    logServerError("Session creation failed", error);

    if (createdSessionId) {
      try {
        await browserbase.sessions.update(createdSessionId, {
          status: "REQUEST_RELEASE",
        });
      } catch (releaseError) {
        logServerError("Failed to release an incomplete session", releaseError);
      }
    }

    const normalized = normalizeSessionError(error);
    return errorResponse(
      normalized.status,
      normalized.code,
      normalized.message,
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        logServerError("Playwright disconnect failed", error);
      }
    }
  }
}
