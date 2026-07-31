import { NextResponse } from "next/server";
import { z } from "zod";

import { RUN_PRICING } from "@/lib/campaign/package";
import { fundRunWithRealtime } from "@/lib/pinch/client";
import {
  PinchError,
  PinchProviderError,
} from "@/lib/pinch/types";
import {
  getRunPayment,
  saveRunPayment,
  toPublicRunPayment,
  withRunFundingLock,
  type RunPaymentStatus,
} from "@/lib/runs/server-store";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  token: z
    .string()
    .trim()
    .min(12, "CaptureJS did not return a usable payment token.")
    .max(500, "CaptureJS returned an invalid payment token.")
    .regex(/^tkn_[A-Za-z0-9_-]+$/, "CaptureJS returned an invalid payment token."),
  testerCount: z
    .number()
    .int()
    .min(RUN_PRICING.minTesters)
    .max(RUN_PRICING.maxTesters),
  decision: z.string().trim().min(1).max(140),
  founderName: z.string().trim().min(1).max(120),
  founderEmail: z.string().trim().max(200).pipe(z.email()),
});

type FundError = {
  error: {
    code: string;
    message: string;
  };
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse<FundError> {
  return NextResponse.json({ error: { code, message } }, { status });
}

function validRunId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<RunPaymentStatus | FundError>> {
  const { id } = await context.params;
  if (!validRunId(id)) {
    return errorResponse(400, "invalid_request", "Run ID is invalid.");
  }

  const record = getRunPayment(id);
  if (!record) {
    return errorResponse(
      404,
      "payment_not_started",
      "No realtime payment has been submitted for this run.",
    );
  }
  return NextResponse.json(toPublicRunPayment(record), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<RunPaymentStatus | FundError>> {
  const { id } = await context.params;
  if (!validRunId(id)) {
    return errorResponse(400, "invalid_request", "Run ID is invalid.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Send a valid JSON body.");
  }

  if (body && typeof body === "object" && !Array.isArray(body)) {
    const forbidden = [
      "cardNumber",
      "expiry",
      "expiryMonth",
      "expiryYear",
      "cvc",
      "cardHolderName",
    ].find((key) => Object.hasOwn(body, key));
    if (forbidden) {
      return errorResponse(
        400,
        "raw_card_data_rejected",
        "Raw card details must go directly to Pinch CaptureJS.",
      );
    }
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ?? "The funding request is invalid.",
    );
  }

  try {
    const publicRecord = await withRunFundingLock(id, async () => {
      const existing = getRunPayment(id);
      if (existing) {
        return toPublicRunPayment(existing);
      }

      const result = await fundRunWithRealtime({
        runId: id,
        ...parsed.data,
      });
      const now = Date.now();
      const stored = saveRunPayment({
        runId: id,
        decision: parsed.data.decision,
        testerCount: parsed.data.testerCount,
        amount: result.amount,
        applicationFee: result.applicationFee,
        paymentId: result.paymentId,
        paymentStatus: result.status,
        sourceId: result.sourceId,
        sourceLast4: result.sourceLast4,
        sourceBrand: result.sourceBrand,
        sourceReusable: true,
        sourceReuseNotice:
          "Reusable for this payer on the same Pinch merchant. A different Current-Merchant cannot reuse this source.",
        environment: "test",
        webhookReceived: false,
        signatureVerified: false,
        runStatus: "payment_pending",
        fundedAt: now,
        activatedAt: null,
        payerId: result.payerId,
        sourceResponse: result.sourceResponse,
        paymentResponse: result.paymentResponse,
        webhookEvent: null,
      });
      return toPublicRunPayment(stored);
    });

    return NextResponse.json(publicRecord, {
      status: publicRecord.runStatus === "live" ? 200 : 202,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof PinchProviderError) {
      return errorResponse(
        error.status,
        error.providerCode,
        error.message,
      );
    }
    if (error instanceof PinchError) {
      return errorResponse(error.status, error.code, error.message);
    }
    console.error("[pinch] unexpected run funding failure", error);
    return errorResponse(
      500,
      "pinch_unexpected_response",
      "Playground could not fund this run. Try again with a fresh card token.",
    );
  }
}
