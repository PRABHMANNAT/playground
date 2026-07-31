/**
 * Pinch Payments types for the Playground sandbox integration.
 *
 * Scope is deliberately narrow: authenticate, upsert a payer, create a payment
 * link, read a payment back. No wallets, identity checks, payouts, escrow,
 * subscriptions, refunds or managed-merchant onboarding.
 *
 * Reference: https://docs.getpinch.com.au
 */

export type PinchEnvironment = "test";

export interface PinchConfig {
  applicationId: string;
  applicationSecret: string;
  apiBaseUrl: string;
  authUrl: string;
  appUrl: string;
  testMode: boolean;
  mockMode: boolean;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export type PinchErrorCode =
  | "pinch_config_missing"
  | "pinch_auth_failed"
  | "pinch_payer_failed"
  | "pinch_payment_link_failed"
  | "pinch_payment_lookup_failed"
  | "pinch_source_failed"
  | "pinch_realtime_payment_failed"
  | "pinch_unexpected_response"
  | "pinch_unreachable";

/**
 * Every message on this class is written to be shown to a founder. Provider
 * response bodies, credentials and tokens are logged server-side instead and
 * never attached here.
 */
export class PinchError extends Error {
  readonly code: PinchErrorCode;
  readonly status: number;

  constructor(code: PinchErrorCode, message: string, status = 502) {
    super(message);
    this.name = "PinchError";
    this.code = code;
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* Payment statuses                                                           */
/* -------------------------------------------------------------------------- */

/** https://docs.getpinch.com.au/docs/payment-statuses */
export type PinchPaymentStatus =
  | "scheduled"
  | "processing"
  | "dishonoured"
  | "settled"
  | "cancelled"
  | "approved"
  | "cleared-settlements-disabled"
  | "cleared-pending-dispute"
  | "returned-without-settlement"
  | "pending-action";

/**
 * Statuses Playground treats as "the founder has paid".
 *
 * `approved` is success before settlement; `settled` is success after it;
 * `cleared-settlements-disabled` is a successful payment the merchant simply
 * has not settled. Disputed and refunded payments are deliberately excluded —
 * a campaign should not run on money that is being clawed back.
 */
const FUNDED_STATUSES = new Set<PinchPaymentStatus>([
  "approved",
  "settled",
  "cleared-settlements-disabled",
]);

export function isFundedStatus(status: string): boolean {
  return FUNDED_STATUSES.has(status as PinchPaymentStatus);
}

/* -------------------------------------------------------------------------- */
/* Service inputs and outputs                                                 */
/* -------------------------------------------------------------------------- */

export interface CreatePayerInput {
  founderName: string;
  founderEmail: string;
}

export interface CreateCheckoutInput {
  campaignId: string;
  founderName: string;
  founderEmail: string;
  /** Whole Australian dollars. Verified against the server-side package price. */
  amount: number;
}

/** Exactly what the browser is allowed to see. */
export interface CreateCheckoutResult {
  checkoutUrl: string;
  payerId: string;
  paymentLinkId: string;
  campaignId: string;
  environment: PinchEnvironment;
  /** Present and true only when PINCH_MOCK_MODE is on. */
  mock?: true;
}

export interface VerifyPaymentResult {
  verified: boolean;
  status: string;
  paymentId: string;
  paymentLinkId: string;
  /** Whole Australian dollars, or null when Pinch did not return an amount. */
  amount: number | null;
  environment: PinchEnvironment;
  mock?: true;
}

export interface FundRunInput {
  runId: string;
  token: string;
  testerCount: number;
  decision: string;
  founderName: string;
  founderEmail: string;
}

export interface FundRunResult {
  payerId: string;
  sourceId: string;
  sourceLast4: string | null;
  sourceBrand: string | null;
  paymentId: string;
  status: string;
  amount: number;
  applicationFee: number;
  sourceResponse: unknown;
  paymentResponse: unknown;
}

export interface PinchCaptureConfig {
  publishableKey: string;
  environment: PinchEnvironment;
}

export class PinchProviderError extends PinchError {
  readonly providerCode: string;

  constructor(
    providerCode: string,
    message: string,
    status = 502,
  ) {
    super("pinch_realtime_payment_failed", message, status);
    this.name = "PinchProviderError";
    this.providerCode = providerCode;
  }
}

export interface PinchApiErrorBody {
  error: {
    code:
      | PinchErrorCode
      | "invalid_request"
      | "amount_mismatch"
      | "payment_already_submitted";
    message: string;
  };
}
