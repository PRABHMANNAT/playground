import { NextResponse } from "next/server";

import type { ApiErrorResponse } from "@/lib/browser/types";
import { stopSessionRequestSchema } from "@/lib/browser/url-validation";
import { closeActiveBrowser } from "@/lib/browser/server/active-sessions";
import { getBrowserbaseClient } from "@/lib/browser/server/browserbase";
import {
  errorMessage,
  errorStatus,
  logServerError,
  normalizeSessionError,
} from "@/lib/browser/server/errors";

export const runtime = "nodejs";

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(
  request: Request,
): Promise<NextResponse<{ success: true } | ApiErrorResponse>> {
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

  let browserbase;
  try {
    browserbase = getBrowserbaseClient();
  } catch (error) {
    const normalized = normalizeSessionError(error);
    return errorResponse(
      normalized.status,
      normalized.code,
      normalized.message,
    );
  }

  try {
    await browserbase.sessions.update(parsed.data.sessionId, {
      status: "REQUEST_RELEASE",
    });
    await closeActiveBrowser(parsed.data.sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = errorStatus(error);
    const message = errorMessage(error).toLowerCase();

    if (
      status === 400 &&
      (message.includes("completed") ||
        message.includes("already") ||
        message.includes("released"))
    ) {
      await closeActiveBrowser(parsed.data.sessionId);
      return NextResponse.json({ success: true });
    }

    logServerError("Session release failed", error);

    if (status === 404) {
      return errorResponse(
        404,
        "session_not_found",
        "This browser session no longer exists or has already expired.",
      );
    }

    return errorResponse(
      502,
      "session_stop_failed",
      "Playground could not stop this browser session. Try again before leaving the page.",
    );
  }
}
