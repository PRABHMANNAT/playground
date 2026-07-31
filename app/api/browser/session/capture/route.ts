import { NextResponse } from "next/server";

import type { ApiErrorResponse } from "@/lib/browser/types";
import { captureActiveBrowser } from "@/lib/browser/server/active-sessions";
import { logServerError } from "@/lib/browser/server/errors";
import { stopSessionRequestSchema } from "@/lib/browser/url-validation";

export const runtime = "nodejs";

type CaptureResponse = {
  dataUrl: string;
  title: string;
  url: string;
  width: number;
  height: number;
  capturedAt: string;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(
  request: Request,
): Promise<NextResponse<CaptureResponse | ApiErrorResponse>> {
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

  try {
    const capture = await captureActiveBrowser(parsed.data.sessionId);
    if (!capture) {
      return errorResponse(
        404,
        "session_not_found",
        "The live product screen is no longer available. Load the website again.",
      );
    }

    return NextResponse.json({
      ...capture,
      capturedAt: new Date().toISOString(),
    });
  } catch (error) {
    logServerError("Product screen capture failed", error);
    return errorResponse(
      502,
      "capture_failed",
      "Playground could not capture the current product screen. Try again.",
    );
  }
}
