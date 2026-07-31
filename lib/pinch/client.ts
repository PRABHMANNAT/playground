import "server-only";

import {
  CAMPAIGN_PRICING,
  calculateRunSplit,
} from "@/lib/campaign/package";
import {
  PinchError,
  PinchProviderError,
  isFundedStatus,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type CreatePayerInput,
  type FundRunInput,
  type FundRunResult,
  type PinchCaptureConfig,
  type PinchConfig,
  type PinchErrorCode,
  type VerifyPaymentResult,
} from "@/lib/pinch/types";

const REQUEST_TIMEOUT_MS = 15_000;
/** Refresh early so a request never rides an expiring token. */
const TOKEN_SAFETY_WINDOW_MS = 30_000;

const DEFAULT_AUTH_URL = "https://auth.getpinch.com.au/connect/token";
const DEFAULT_API_BASE_URL = "https://api.getpinch.com.au/test";
const DEFAULT_APP_URL = "http://localhost:5198";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function isTruthy(value: string): boolean {
  return value.toLowerCase() === "true" || value === "1";
}

export function isMockMode(): boolean {
  return isTruthy(env("PINCH_MOCK_MODE"));
}

/**
 * Reads configuration. Credentials are read here and nowhere else, and are
 * never returned to a caller outside this module.
 */
export function readPinchConfig(): PinchConfig {
  const mockMode = isMockMode();
  const applicationId = env("PINCH_APPLICATION_ID");
  const applicationSecret = env("PINCH_APPLICATION_SECRET");

  if (!mockMode && (!applicationId || !applicationSecret)) {
    const missing = [
      !applicationId && "PINCH_APPLICATION_ID",
      !applicationSecret && "PINCH_APPLICATION_SECRET",
    ].filter(Boolean);

    throw new PinchError(
      "pinch_config_missing",
      `Pinch is not configured on this server. Add ${missing.join(" and ")} to .env.local and restart, or set PINCH_MOCK_MODE=true to run the demo without calling Pinch.`,
      503,
    );
  }

  return {
    applicationId,
    applicationSecret,
    apiBaseUrl: (env("PINCH_API_BASE_URL") || DEFAULT_API_BASE_URL).replace(
      /\/+$/,
      "",
    ),
    authUrl: env("PINCH_AUTH_URL") || DEFAULT_AUTH_URL,
    appUrl: (env("NEXT_PUBLIC_APP_URL") || DEFAULT_APP_URL).replace(/\/+$/, ""),
    // Playground only ever runs against the Pinch sandbox.
    testMode: env("PINCH_TEST_MODE") === "" ? true : isTruthy(env("PINCH_TEST_MODE")),
    mockMode,
  };
}

/* -------------------------------------------------------------------------- */
/* Logging                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Development logging with a fixed, safe field set: step, campaign, HTTP
 * status, and Pinch identifiers. Secrets, tokens, card data and bank details
 * are never accepted by this function.
 */
function logStep(
  step: string,
  fields: {
    campaignId?: string;
    status?: number;
    payerId?: string;
    paymentId?: string;
    paymentLinkId?: string;
    mock?: boolean;
  } = {},
): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  console.info(`[pinch] ${step}${parts.length ? ` ${parts.join(" ")}` : ""}`);
}

/** Failure detail stays server-side. Bodies may echo request fields. */
function logFailure(context: string, detail: unknown): void {
  console.error(`[pinch] ${context}`, detail);
}

/* -------------------------------------------------------------------------- */
/* HTTP                                                                       */
/* -------------------------------------------------------------------------- */

async function requestJson(
  url: string,
  init: RequestInit,
  failure: { code: PinchErrorCode; message: string },
  context: { step: string; campaignId?: string },
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    logFailure(`network error during ${context.step}`, error);
    throw new PinchError(
      "pinch_unreachable",
      "Playground could not reach Pinch. Check your connection and try again.",
    );
  }

  logStep(context.step, {
    campaignId: context.campaignId,
    status: response.status,
  });

  const raw = await response.text();

  if (!response.ok) {
    logFailure(`${context.step} returned ${response.status}`, raw.slice(0, 500));
    throw new PinchError(failure.code, failure.message);
  }

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    logFailure(`${context.step} returned unparseable JSON`, error);
    throw new PinchError(
      "pinch_unexpected_response",
      "Pinch returned a response Playground could not read. Try again in a moment.",
    );
  }
}

/**
 * Returns the objects worth searching for a field, top level first.
 *
 * Order matters. A payment-link response carries a nested `payer` object, so
 * descending into entity keys before checking the top level would read the
 * payer's `id` instead of the payment link's.
 */
function candidates(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as Record<string, unknown>;
  const found = [record];
  for (const key of ["data", "result", "paymentLink", "payment", "source"]) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      found.push(nested as Record<string, unknown>);
    }
  }
  return found;
}

function readString(
  records: Record<string, unknown>[],
  keys: string[],
): string | null {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}

function readNumber(
  records: Record<string, unknown>[],
  keys: string[],
): number | null {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
}

/** Field names only — never values, which may contain personal data. */
function shapeOf(records: Record<string, unknown>[]): string[][] {
  return records.map((record) => Object.keys(record));
}

function readMetadataCampaignId(
  records: Record<string, unknown>[],
): string | null {
  for (const record of records) {
    const metadata = record.metadata;
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      const campaignId = (metadata as Record<string, unknown>).campaignId;
      if (typeof campaignId === "string" && campaignId.trim()) {
        return campaignId.trim();
      }
    }
    if (typeof metadata !== "string" || !metadata.trim()) {
      continue;
    }
    try {
      const parsed = JSON.parse(metadata) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const campaignId = (parsed as Record<string, unknown>).campaignId;
        if (typeof campaignId === "string" && campaignId.trim()) {
          return campaignId.trim();
        }
      }
    } catch {
      // Metadata is free text. Playground writes JSON, so any other value
      // cannot authoritatively bind the payment to this campaign.
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(config: PinchConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const basic = Buffer.from(
    `${config.applicationId}:${config.applicationSecret}`,
    "utf8",
  ).toString("base64");

  const payload = await requestJson(
    config.authUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "api1",
      }).toString(),
    },
    {
      code: "pinch_auth_failed",
      message:
        "Pinch rejected this application's credentials. Check PINCH_APPLICATION_ID and PINCH_APPLICATION_SECRET on the server.",
    },
    { step: "auth.token" },
  );

  const record = payload as { access_token?: unknown; expires_in?: unknown };
  if (typeof record.access_token !== "string" || !record.access_token) {
    throw new PinchError(
      "pinch_auth_failed",
      "Pinch did not return an access token. Try again in a moment.",
    );
  }

  const expiresIn =
    typeof record.expires_in === "number" ? record.expires_in : 3_600;
  cachedToken = {
    value: record.access_token,
    expiresAt: Date.now() + expiresIn * 1_000 - TOKEN_SAFETY_WINDOW_MS,
  };

  return cachedToken.value;
}

function authorisedHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "pinch-version": "2020.1",
  };
}

/* -------------------------------------------------------------------------- */
/* Payers                                                                     */
/* -------------------------------------------------------------------------- */

/** Splits a display name into the two fields Pinch expects. */
export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Founder", lastName: "Founder" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

/**
 * Pinch treats POST /payers as an upsert keyed on email, so this both creates
 * a new payer and retrieves an existing one.
 */
async function upsertPayer(
  config: PinchConfig,
  token: string,
  input: CreatePayerInput,
  campaignId: string,
): Promise<string> {
  const { firstName, lastName } = splitName(input.founderName);

  const payload = await requestJson(
    `${config.apiBaseUrl}/payers`,
    {
      method: "POST",
      headers: authorisedHeaders(token),
      body: JSON.stringify({
        firstName,
        lastName,
        email: input.founderEmail,
        emailAddress: input.founderEmail,
      }),
    },
    {
      code: "pinch_payer_failed",
      message:
        "Pinch could not create the payer record for this validation run. Check the founder name and email, then try again.",
    },
    { step: "payers.upsert", campaignId },
  );

  const payerId = readString(candidates(payload), ["id", "payerId"]);
  if (!payerId) {
    logFailure("payer response missing id", shapeOf(candidates(payload)));
    throw new PinchError(
      "pinch_unexpected_response",
      "Pinch did not return a payer reference. Try again in a moment.",
    );
  }

  logStep("payers.resolved", { campaignId, payerId });
  return payerId;
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                   */
/* -------------------------------------------------------------------------- */

function mockCheckout(
  config: PinchConfig,
  input: CreateCheckoutInput,
): CreateCheckoutResult {
  const suffix = input.campaignId.replace(/[^A-Za-z0-9_]/g, "");
  const paymentLinkId = `mock_pl_${suffix}`;
  const paymentId = `mock_pmt_${suffix}`;

  const checkoutUrl = new URL("/payment/return", config.appUrl);
  checkoutUrl.searchParams.set("campaign", input.campaignId);
  checkoutUrl.searchParams.set("paymentId", paymentId);
  checkoutUrl.searchParams.set("paymentLinkId", paymentLinkId);
  checkoutUrl.searchParams.set("mock", "1");

  logStep("checkout.mock", { campaignId: input.campaignId, mock: true });

  return {
    checkoutUrl: checkoutUrl.toString(),
    payerId: `mock_pyr_${suffix}`,
    paymentLinkId,
    campaignId: input.campaignId,
    environment: "test",
    mock: true,
  };
}

export async function createCheckout(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const config = readPinchConfig();

  logStep("checkout.start", { campaignId: input.campaignId, mock: config.mockMode });

  if (config.mockMode) {
    return mockCheckout(config, input);
  }

  const token = await getAccessToken(config);
  const payerId = await upsertPayer(
    config,
    token,
    { founderName: input.founderName, founderEmail: input.founderEmail },
    input.campaignId,
  );

  const returnUrl = new URL("/payment/return", config.appUrl);
  returnUrl.searchParams.set("campaign", input.campaignId);

  const payload = await requestJson(
    `${config.apiBaseUrl}/payment-links`,
    {
      method: "POST",
      headers: authorisedHeaders(token),
      body: JSON.stringify({
        payerId,
        // Pinch amounts are in cents.
        amount: Math.round(input.amount * 100),
        currency: "AUD",
        description: "Playground validation run",
        allowedPaymentMethods: ["credit-card"],
        returnUrl: returnUrl.toString(),
        metadata: JSON.stringify({ campaignId: input.campaignId }),
      }),
    },
    {
      code: "pinch_payment_link_failed",
      message:
        "Pinch could not create the sandbox checkout for this validation run. Try again in a moment.",
    },
    { step: "payment-links.create", campaignId: input.campaignId },
  );

  const record = candidates(payload);
  // The reference documents the request body but not which response field
  // carries the hosted URL, so accept the plausible names rather than guess.
  const checkoutUrl = readString(record, [
    "url",
    "paymentLinkUrl",
    "paymentUrl",
    "hostedUrl",
    "shortUrl",
    "link",
    "href",
  ]);

  if (!checkoutUrl) {
    logFailure("payment link response missing url", shapeOf(record));
    throw new PinchError(
      "pinch_unexpected_response",
      "Pinch created the payment link but did not return a checkout URL. Try again in a moment.",
    );
  }

  const paymentLinkId = readString(record, ["id", "paymentLinkId"]) ?? "";
  logStep("checkout.created", {
    campaignId: input.campaignId,
    payerId,
    paymentLinkId,
  });

  return {
    checkoutUrl,
    payerId,
    paymentLinkId,
    campaignId: input.campaignId,
    environment: "test",
  };
}

/* -------------------------------------------------------------------------- */
/* Verification                                                               */
/* -------------------------------------------------------------------------- */

export async function verifyPayment(
  paymentId: string,
  paymentLinkId: string,
  campaignId: string,
): Promise<VerifyPaymentResult> {
  const config = readPinchConfig();

  if (config.mockMode) {
    logStep("verify.mock", { paymentId, paymentLinkId, mock: true });
    return {
      verified: true,
      status: "approved",
      paymentId,
      paymentLinkId,
      amount: CAMPAIGN_PRICING.campaignFunding,
      environment: "test",
      mock: true,
    };
  }

  const token = await getAccessToken(config);

  const [paymentPayload, paymentLinkPayload] = await Promise.all([
    requestJson(
      `${config.apiBaseUrl}/payments/${encodeURIComponent(paymentId)}`,
      { method: "GET", headers: authorisedHeaders(token) },
      {
        code: "pinch_payment_lookup_failed",
        message:
          "Pinch could not return this payment. It may still be processing — try again in a moment.",
      },
      { step: "payments.get" },
    ),
    requestJson(
      `${config.apiBaseUrl}/payment-links/${encodeURIComponent(paymentLinkId)}`,
      { method: "GET", headers: authorisedHeaders(token) },
      {
        code: "pinch_payment_lookup_failed",
        message:
          "Pinch could not verify the Payment Link for this validation run. Try again in a moment.",
      },
      { step: "payment-links.get", campaignId },
    ),
  ]);

  const paymentRecords = candidates(paymentPayload);
  const paymentLinkRecords = candidates(paymentLinkPayload);
  const status = readString(paymentRecords, ["status"]);

  if (!status) {
    logFailure("payment response missing status", shapeOf(paymentRecords));
    throw new PinchError(
      "pinch_unexpected_response",
      "Pinch did not return a payment status. Try again in a moment.",
    );
  }

  // Pinch names this `amount` on the payment object but `amountInCents` on the
  // payment link. Both are minor units; accept either.
  const amountInCents = readNumber(paymentRecords, ["amount", "amountInCents"]);
  const linkAmountInCents = readNumber(paymentLinkRecords, [
    "amount",
    "amountInCents",
  ]);
  const returnedPaymentLinkId = readString(paymentRecords, ["paymentLinkId"]);
  const linkMatches =
    returnedPaymentLinkId === null || returnedPaymentLinkId === paymentLinkId;
  const paymentPayerId = readString(paymentRecords, ["payerId"]);
  const paymentLinkPayerId = readString(paymentLinkRecords, ["payerId"]);
  const payerMatches =
    paymentPayerId !== null &&
    paymentLinkPayerId !== null &&
    paymentPayerId === paymentLinkPayerId;
  const expectedAmount = CAMPAIGN_PRICING.campaignFunding * 100;
  const amountMatches =
    amountInCents === expectedAmount && linkAmountInCents === expectedAmount;
  const metadataMatches =
    readMetadataCampaignId(paymentRecords) === campaignId &&
    readMetadataCampaignId(paymentLinkRecords) === campaignId;
  const verified =
    isFundedStatus(status) &&
    linkMatches &&
    payerMatches &&
    amountMatches &&
    metadataMatches;

  logStep("verify.result", { paymentId, paymentLinkId, status: undefined });
  logStep(`verify.status=${status} verified=${verified}`, { paymentId });

  return {
    verified,
    status,
    paymentId,
    paymentLinkId,
    amount: amountInCents === null ? null : amountInCents / 100,
    environment: "test",
  };
}

/* -------------------------------------------------------------------------- */
/* CaptureJS and realtime run funding                                         */
/* -------------------------------------------------------------------------- */

async function providerJson(
  url: string,
  init: RequestInit,
  context: { step: string; campaignId?: string },
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    logFailure(`network error during ${context.step}`, error);
    throw new PinchError(
      "pinch_unreachable",
      "Playground could not reach Pinch. Check your connection and try again.",
    );
  }

  logStep(context.step, {
    campaignId: context.campaignId,
    status: response.status,
  });

  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    logFailure(`${context.step} returned ${response.status}`, raw.slice(0, 500));
    const top =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};
    const arrayRecords = Array.isArray(payload)
      ? payload.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        )
      : [];
    const nested =
      top.error && typeof top.error === "object" && !Array.isArray(top.error)
        ? (top.error as Record<string, unknown>)
        : {};
    const code =
      readString([nested, top, ...arrayRecords], [
        "dishonourCode",
        "DishonourCode",
        "dishonourType",
        "DishonourType",
        "code",
        "Code",
        "errorCode",
        "ErrorCode",
        "type",
        "Type",
      ]) ?? `http-${response.status}`;
    const message =
      readString([nested, top, ...arrayRecords], [
        "message",
        "Message",
        "errorMessage",
        "ErrorMessage",
        "detail",
        "Detail",
        "title",
        "Title",
        "reason",
        "Reason",
      ]) ??
      `Pinch rejected the payment with ${code}.`;
    throw new PinchProviderError(code, message, response.status);
  }

  return payload;
}

export async function getPinchCaptureConfig(): Promise<PinchCaptureConfig> {
  const config = readPinchConfig();
  if (config.mockMode) {
    throw new PinchError(
      "pinch_config_missing",
      "CaptureJS is unavailable while PINCH_MOCK_MODE is enabled.",
      503,
    );
  }

  const configuredKey = env("NEXT_PUBLIC_PINCH_PUBLISHABLE_KEY");
  if (configuredKey) {
    return { publishableKey: configuredKey, environment: "test" };
  }

  const token = await getAccessToken(config);
  const merchant = await requestJson(
    `${config.apiBaseUrl}/merchants`,
    { method: "GET", headers: authorisedHeaders(token) },
    {
      code: "pinch_unexpected_response",
      message:
        "Pinch did not return the test publishable key required by CaptureJS.",
    },
    { step: "merchants.get" },
  );

  const publishableKey = readString(candidates(merchant), [
    "testPublishableKey",
    "publishableKey",
  ]);
  if (!publishableKey) {
    throw new PinchError(
      "pinch_unexpected_response",
      "Pinch did not return the test publishable key required by CaptureJS.",
    );
  }

  return { publishableKey, environment: "test" };
}

export async function fundRunWithRealtime(
  input: FundRunInput,
): Promise<FundRunResult> {
  const config = readPinchConfig();
  if (config.mockMode) {
    throw new PinchError(
      "pinch_config_missing",
      "Realtime run funding requires the Pinch sandbox. Disable PINCH_MOCK_MODE.",
      503,
    );
  }

  const accessToken = await getAccessToken(config);
  const payerId = await upsertPayer(
    config,
    accessToken,
    {
      founderName: input.founderName,
      founderEmail: input.founderEmail,
    },
    input.runId,
  );

  const sourceResponse = await providerJson(
    `${config.apiBaseUrl}/payers/${encodeURIComponent(payerId)}/sources`,
    {
      method: "POST",
      headers: authorisedHeaders(accessToken),
      body: JSON.stringify({
        sourceType: "credit-card",
        token: input.token,
      }),
    },
    { step: "sources.create", campaignId: input.runId },
  );
  const sourceRecords = candidates(sourceResponse);
  const sourceId = readString(sourceRecords, ["id", "sourceId"]);
  if (!sourceId) {
    logFailure("source response missing id", shapeOf(sourceRecords));
    throw new PinchError(
      "pinch_source_failed",
      "Pinch vaulted the card but did not return a reusable source ID.",
    );
  }

  const split = calculateRunSplit(input.testerCount);
  const amount = split.total * 100;
  const applicationFee = split.applicationFee;
  const paymentResponse = await providerJson(
    `${config.apiBaseUrl}/payments/realtime`,
    {
      method: "POST",
      headers: authorisedHeaders(accessToken),
      body: JSON.stringify({
        payerId,
        sourceId,
        amount,
        applicationFee,
        description: `Playground run ${input.runId}`,
        nonce: input.runId,
        metadata: JSON.stringify({
          runId: input.runId,
          testerCount: input.testerCount,
          decision: input.decision,
        }),
      }),
    },
    { step: "payments.realtime", campaignId: input.runId },
  );

  const paymentRecords = candidates(paymentResponse);
  const paymentId = readString(paymentRecords, ["id", "paymentId"]);
  const status = readString(paymentRecords, ["status"]);
  const returnedAmount = readNumber(paymentRecords, ["amount"]);
  const returnedApplicationFee = readNumber(paymentRecords, [
    "applicationFee",
  ]);

  if (!paymentId || !status || returnedAmount === null) {
    logFailure(
      "realtime payment response missing required fields",
      shapeOf(paymentRecords),
    );
    throw new PinchError(
      "pinch_unexpected_response",
      "Pinch processed the request but returned an incomplete payment result.",
    );
  }

  if (!isFundedStatus(status)) {
    const providerCode =
      readString(paymentRecords, ["dishonourType", "dishonourCode"]) ?? status;
    throw new PinchProviderError(
      providerCode,
      `Pinch returned ${providerCode}.`,
      402,
    );
  }

  logStep("payments.realtime.approved", {
    campaignId: input.runId,
    payerId,
    paymentId,
  });

  return {
    payerId,
    sourceId,
    sourceLast4: readString(sourceRecords, [
      "last4",
      "displayCardNumber",
      "cardLast4",
      "creditCardLast4",
    ]),
    sourceBrand: readString(sourceRecords, [
      "brand",
      "cardScheme",
      "scheme",
      "cardBrand",
      "creditCardType",
    ]),
    paymentId,
    status,
    amount: returnedAmount,
    applicationFee: returnedApplicationFee ?? applicationFee,
    sourceResponse,
    paymentResponse,
  };
}
