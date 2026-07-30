import { NextResponse } from "next/server";
import { z } from "zod";

import { CAMPAIGN_PRICING } from "@/lib/campaign/package";
import { createCheckout } from "@/lib/pinch/client";
import {
  PinchError,
  type CreateCheckoutResult,
  type PinchApiErrorBody,
} from "@/lib/pinch/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  campaignId: z
    .string()
    .trim()
    .min(1, "Campaign ID is required.")
    .max(64, "Campaign ID is too long.")
    .regex(/^[A-Za-z0-9_-]+$/, "Campaign ID contains unsupported characters."),
  founderName: z
    .string()
    .trim()
    .min(1, "Founder name is required.")
    .max(120, "Founder name must be 120 characters or fewer."),
  founderEmail: z
    .string()
    .trim()
    .min(1, "Founder email is required.")
    .max(200, "Founder email must be 200 characters or fewer.")
    .pipe(z.email("Enter a valid email address.")),
  amount: z.number().int().positive(),
});

function errorResponse(
  status: number,
  code: PinchApiErrorBody["error"]["code"],
  message: string,
): NextResponse<PinchApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(
  request: Request,
): Promise<NextResponse<CreateCheckoutResult | PinchApiErrorBody>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_request",
      "Send a valid JSON request body.",
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ??
        "The checkout request could not be validated.",
    );
  }

  // The client sends the amount so the request is self-describing, but it is
  // never trusted as the charge. It must equal the server-side package price.
  if (parsed.data.amount !== CAMPAIGN_PRICING.campaignFunding) {
    return errorResponse(
      400,
      "amount_mismatch",
      `This package is A$${CAMPAIGN_PRICING.campaignFunding}. The submitted amount does not match and was rejected.`,
    );
  }

  try {
    const result = await createCheckout({
      campaignId: parsed.data.campaignId,
      founderName: parsed.data.founderName,
      founderEmail: parsed.data.founderEmail,
      amount: CAMPAIGN_PRICING.campaignFunding,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PinchError) {
      return errorResponse(error.status, error.code, error.message);
    }
    console.error("[pinch] unexpected create-checkout failure", error);
    return errorResponse(
      500,
      "pinch_unexpected_response",
      "Playground could not start the Pinch checkout. Try again in a moment.",
    );
  }
}
