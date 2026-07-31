import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export class PinchWebhookError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PinchWebhookError";
    this.status = status;
  }
}

export function verifyPinchWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): void {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  const timestamp = Number(parts.t);
  const supplied = parts.v2 ?? "";

  if (!Number.isInteger(timestamp) || !/^[a-f0-9]{64}$/i.test(supplied)) {
    throw new PinchWebhookError("Malformed pinch-signature header.");
  }
  if (Math.abs(nowSeconds - timestamp) > MAX_CLOCK_SKEW_SECONDS) {
    throw new PinchWebhookError(
      "Pinch webhook timestamp is outside the five-minute replay window.",
    );
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBytes = Buffer.from(expected, "hex");
  const suppliedBytes = Buffer.from(supplied, "hex");
  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    throw new PinchWebhookError("Pinch webhook signature verification failed.");
  }
}

function objectAt(
  value: unknown,
  ...keys: string[]
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }
  return null;
}

function stringAt(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  if (!record) {
    return null;
  }
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function metadataRunId(value: unknown): string | null {
  if (typeof value === "string") {
    try {
      return metadataRunId(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const runId = metadataRunId(item);
      if (runId) {
        return runId;
      }
    }
    return null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  return stringAt(value as Record<string, unknown>, "runId", "RunId");
}

export type RealtimeWebhookPayment = {
  eventType: string;
  paymentId: string;
  status: string;
  runId: string | null;
  event: unknown;
};

export function readRealtimeWebhook(
  event: unknown,
): RealtimeWebhookPayment | null {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return null;
  }
  const root = event as Record<string, unknown>;
  const eventType = stringAt(root, "type", "Type");
  if (eventType !== "realtime-payment") {
    return null;
  }

  const data = objectAt(root, "data", "Data");
  const payment = objectAt(data, "payment", "Payment");
  const paymentId = stringAt(payment, "id", "Id");
  const status = stringAt(payment, "status", "Status");
  const runId =
    metadataRunId(payment?.metadata ?? payment?.Metadata) ??
    metadataRunId(root.metadata ?? root.Metadata);

  if (!paymentId || !status) {
    throw new PinchWebhookError(
      "Realtime payment webhook is missing payment ID or status.",
    );
  }

  return { eventType, paymentId, status, runId, event };
}
