import { NextResponse } from "next/server";

import { isFundedStatus } from "@/lib/pinch/types";
import {
  PinchWebhookError,
  readRealtimeWebhook,
  verifyPinchWebhookSignature,
} from "@/lib/pinch/webhook";
import {
  findRunPaymentByPaymentId,
  getRunPayment,
  markRunLiveFromWebhook,
} from "@/lib/runs/server-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(
  status: number,
  body: Record<string, unknown>,
): NextResponse<Record<string, unknown>> {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PINCH_WEBHOOK_SECRET?.trim() ?? "";
  if (!webhookSecret) {
    return response(503, {
      error: "PINCH_WEBHOOK_SECRET is not configured.",
    });
  }

  const signature = request.headers.get("pinch-signature") ?? "";
  const rawBody = await request.text();

  try {
    verifyPinchWebhookSignature(rawBody, signature, webhookSecret);
  } catch (error) {
    if (error instanceof PinchWebhookError) {
      return response(error.status, { error: error.message });
    }
    return response(400, { error: "Webhook verification failed." });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody) as unknown;
  } catch {
    return response(400, { error: "Webhook body is not valid JSON." });
  }

  let realtime;
  try {
    realtime = readRealtimeWebhook(event);
  } catch (error) {
    if (error instanceof PinchWebhookError) {
      return response(error.status, { error: error.message });
    }
    return response(400, { error: "Webhook payload is invalid." });
  }

  if (!realtime) {
    return response(202, { received: true, ignored: true });
  }

  const record = realtime.runId
    ? getRunPayment(realtime.runId)
    : findRunPaymentByPaymentId(realtime.paymentId);
  if (!record) {
    return response(404, { error: "Run payment was not found." });
  }
  if (realtime.runId && realtime.runId !== record.runId) {
    return response(409, {
      error: "Webhook run ID does not match the stored payment.",
    });
  }
  if (record.paymentId !== realtime.paymentId) {
    return response(409, {
      error: "Webhook payment ID does not match this run.",
    });
  }
  if (!isFundedStatus(realtime.status)) {
    return response(202, {
      received: true,
      signatureVerified: true,
      activated: false,
      paymentStatus: realtime.status,
    });
  }

  markRunLiveFromWebhook(record.runId, event);
  return response(200, {
    received: true,
    signatureVerified: true,
    activated: true,
    runId: record.runId,
  });
}
