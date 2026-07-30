import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import type {
  ApiErrorResponse,
  VisitedScreen,
  VisitedScreensResponse,
} from "@/lib/browser/types";
import { refreshVisitedScreens } from "@/lib/browser/server/active-sessions";
import { getBrowserbaseClient } from "@/lib/browser/server/browserbase";
import { logServerError } from "@/lib/browser/server/errors";
import { stopSessionRequestSchema } from "@/lib/browser/url-validation";

export const runtime = "nodejs";

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function screenResponse(
  sessionId: string,
  force: boolean,
): Promise<NextResponse<VisitedScreensResponse | ApiErrorResponse>> {
  try {
    let screens = await refreshVisitedScreens(sessionId, force);
    if (!screens) {
      const liveView = await getBrowserbaseClient().sessions.debug(sessionId);
      const page = liveView.pages.at(-1);
      if (!page) {
        return errorResponse(
          404,
          "session_not_found",
          "This testing session is no longer active.",
        );
      }

      const rawUrl = new URL(page.url);
      const safeUrl = `${rawUrl.origin}${rawUrl.pathname}`;
      const pathName = rawUrl.pathname
        .split("/")
        .filter(Boolean)
        .at(-1)
        ?.replace(/[-_]+/g, " ");
      const name =
        pathName?.replace(/\b\w/g, (character) => character.toUpperCase()) ||
        page.title ||
        rawUrl.hostname;
      const stableKey = createHash("sha256")
        .update(`${safeUrl}:${page.title}`)
        .digest("hex")
        .slice(0, 16);
      const remoteScreen: VisitedScreen = {
        id: force
          ? `${sessionId}-manual-${Date.now()}`
          : `${sessionId}-remote-${stableKey}`,
        name: name.slice(0, 60),
        url: safeUrl,
        visitedAt: Date.now(),
      };
      screens = [remoteScreen];
    }
    return NextResponse.json({ screens });
  } catch (error) {
    logServerError("Screen tracking failed", error);
    return errorResponse(
      502,
      "screen_tracking_failed",
      "Playground could not read the current product screen.",
    );
  }
}

export async function GET(
  request: Request,
): Promise<NextResponse<VisitedScreensResponse | ApiErrorResponse>> {
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  const parsed = stopSessionRequestSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_session_id",
      parsed.error.issues[0]?.message ?? "Enter a valid session ID.",
    );
  }
  return screenResponse(parsed.data.sessionId, false);
}

export async function POST(
  request: Request,
): Promise<NextResponse<VisitedScreensResponse | ApiErrorResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Send a valid JSON request body.");
  }

  const parsed = stopSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_session_id",
      parsed.error.issues[0]?.message ?? "Enter a valid session ID.",
    );
  }
  return screenResponse(parsed.data.sessionId, true);
}
