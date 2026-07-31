import "server-only";

export type RunPaymentStatus = {
  runId: string;
  decision: string;
  testerCount: number;
  amount: number;
  applicationFee: number;
  paymentId: string;
  paymentStatus: string;
  sourceId: string;
  sourceLast4: string | null;
  sourceBrand: string | null;
  sourceReusable: boolean;
  sourceReuseNotice: string;
  environment: "test";
  webhookReceived: boolean;
  signatureVerified: boolean;
  runStatus: "payment_pending" | "live";
  fundedAt: number;
  activatedAt: number | null;
};

export type StoredRunPayment = RunPaymentStatus & {
  payerId: string;
  sourceResponse: unknown;
  paymentResponse: unknown;
  webhookEvent: unknown | null;
};

type RunFundingGlobals = typeof globalThis & {
  __playgroundRunFundingStore?: Map<string, StoredRunPayment>;
  __playgroundRunFundingLocks?: Map<string, Promise<unknown>>;
};

const runtime = globalThis as RunFundingGlobals;

function store(): Map<string, StoredRunPayment> {
  runtime.__playgroundRunFundingStore ??= new Map();
  return runtime.__playgroundRunFundingStore;
}

function locks(): Map<string, Promise<unknown>> {
  runtime.__playgroundRunFundingLocks ??= new Map();
  return runtime.__playgroundRunFundingLocks;
}

export function getRunPayment(runId: string): StoredRunPayment | undefined {
  return store().get(runId);
}

export function findRunPaymentByPaymentId(
  paymentId: string,
): StoredRunPayment | undefined {
  for (const payment of store().values()) {
    if (payment.paymentId === paymentId) {
      return payment;
    }
  }
  return undefined;
}

export function saveRunPayment(record: StoredRunPayment): StoredRunPayment {
  store().set(record.runId, record);
  return record;
}

export function markRunLiveFromWebhook(
  runId: string,
  webhookEvent: unknown,
): StoredRunPayment | undefined {
  const current = getRunPayment(runId);
  if (!current) {
    return undefined;
  }

  const updated: StoredRunPayment = {
    ...current,
    webhookEvent,
    webhookReceived: true,
    signatureVerified: true,
    runStatus: "live",
    activatedAt: current.activatedAt ?? Date.now(),
  };
  return saveRunPayment(updated);
}

export async function withRunFundingLock<T>(
  runId: string,
  action: () => Promise<T>,
): Promise<T> {
  const existing = locks().get(runId);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = action().finally(() => {
    if (locks().get(runId) === pending) {
      locks().delete(runId);
    }
  });
  locks().set(runId, pending);
  return pending;
}

export function toPublicRunPayment(
  record: StoredRunPayment,
): RunPaymentStatus {
  return {
    runId: record.runId,
    decision: record.decision,
    testerCount: record.testerCount,
    amount: record.amount,
    applicationFee: record.applicationFee,
    paymentId: record.paymentId,
    paymentStatus: record.paymentStatus,
    sourceId: record.sourceId,
    sourceLast4: record.sourceLast4,
    sourceBrand: record.sourceBrand,
    sourceReusable: record.sourceReusable,
    sourceReuseNotice: record.sourceReuseNotice,
    environment: record.environment,
    webhookReceived: record.webhookReceived,
    signatureVerified: record.signatureVerified,
    runStatus: record.runStatus,
    fundedAt: record.fundedAt,
    activatedAt: record.activatedAt,
  };
}
