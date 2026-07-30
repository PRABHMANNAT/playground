import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPayment } from "@/lib/pinch/client";
import {
  PinchError,
  type PinchApiErrorBody,
  type VerifyPaymentResult,
} from "@/lib/pinch/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const identifier = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(128, `${label} is too long.`)
    .regex(/^[A-Za-z0-9_-]+$/, `${label} contains unsupported characters.`);

const querySchema = z.object({
  paymentId: identifier("paymentId"),
  paymentLinkId: identifier("paymentLinkId"),
});

function errorResponse(
  status: number,
  code: PinchApiErrorBody["error"]["code"],
  message: string,
): NextResponse<PinchApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Server-side payment verification. This is the only thing that may be treated
 * as proof of payment — the presence of query parameters on /payment/return is
 * not evidence of anything, and Pinch's own documentation says the redirect
 * must not be used as the authoritative success signal.
 */
export async function GET(
  request: Request,
): Promise<NextResponse<VerifyPaymentResult | PinchApiErrorBody>> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    paymentId: url.searchParams.get("paymentId") ?? "",
    paymentLinkId: url.searchParams.get("paymentLinkId") ?? "",
  });

  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ??
        "paymentId and paymentLinkId are required.",
    );
  }

  try {
    const result = await verifyPayment(
      parsed.data.paymentId,
      parsed.data.paymentLinkId,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PinchError) {
      return errorResponse(error.status, error.code, error.message);
    }
    console.error("[pinch] unexpected verify-payment failure", error);
    return errorResponse(
      500,
      "pinch_unexpected_response",
      "Playground could not verify this payment. Try again in a moment.",
    );
  }
}
