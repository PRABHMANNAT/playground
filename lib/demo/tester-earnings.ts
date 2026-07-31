/**
 * Static demo seed for /tester/earnings.
 *
 * This is a demonstration-only payload shaped to match a real Pinch
 * realtime-payment response — field order and casing follow Pinch's API so
 * the raw-response disclosure reads as genuine. No backend, no API calls: the
 * screen renders straight from this constant and is identical across reloads.
 *
 * Amounts are in CENTS. Never render them raw — use formatAmount().
 */

export type PinchSource = {
  id: string;
  sourceType: "credit-card";
  creditCardToken: string;
  cardHolderName: string;
  expiryDate: string;
  displayCardNumber: string;
  cardScheme: string;
  origin: string;
};

export type PinchAttempt = {
  id: string;
  amount: number;
  currency: string;
  estimatedSettlementDate: string;
  transactionDate: string;
  estimatedTransferDate: string;
  source: PinchSource;
  fees: {
    transactionFee: number;
    applicationFee: number;
    totalFee: number;
    currency: string;
    taxRate: number;
  };
  status: string;
};

export type PinchPayment = {
  id: string;
  attemptId: string;
  amount: number;
  currency: string;
  description: string;
  applicationFee: number;
  totalFee: number;
  isSurcharged: boolean;
  sourceType: "credit-card";
  transactionDate: string;
  status: string;
  estimatedTransferDate: string;
  actualTransferDate: string | null;
  payer: {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
  };
  attempts: PinchAttempt[];
  metadata: {
    runId: string;
    testerId: string;
    findings: number;
    verdict: string;
    decision: string;
  };
};

export type TesterEarnings = {
  tester: {
    firstName: string;
    lastName: string;
    managedMerchantId: string;
    verifiedAt: string;
    bankLast4: string;
  };
  payments: PinchPayment[];
};

export const TESTER_EARNINGS: TesterEarnings = {
  tester: {
    firstName: "Prabhmannat",
    lastName: "Singh",
    managedMerchantId: "mch_test_8f2Kq9Xd4nB7",
    verifiedAt: "2026-07-29T04:12:00Z",
    bankLast4: "4821",
  },
  payments: [
    {
      id: "pmt_8Kd2XqR7nP4v",
      attemptId: "att_9nX2mK4d",
      amount: 4000,
      currency: "AUD",
      description: "Playground review RUN_CMP_001 · Sarah Chen",
      applicationFee: 1000,
      totalFee: 108,
      isSurcharged: false,
      sourceType: "credit-card",
      transactionDate: "2026-07-31T09:14:22.481Z",
      status: "approved",
      estimatedTransferDate: "2026-08-01",
      actualTransferDate: null,
      payer: {
        id: "pyr_3nD9kL2xVq7B",
        firstName: "Adhira",
        lastName: "Founder",
        emailAddress: "founder@ingenworkspace.com",
      },
      attempts: [
        {
          id: "att_9nX2mK4d",
          amount: 4000,
          currency: "AUD",
          estimatedSettlementDate: "2026-08-01T00:00:00",
          transactionDate: "2026-07-31T09:14:22.481Z",
          estimatedTransferDate: "2026-08-01",
          source: {
            id: "src_2vN8pQ4kR9mL",
            sourceType: "credit-card",
            creditCardToken: "tkn_dk9GpnBk2vIlSbxsOZ8Vk0FwCQBVeABk",
            cardHolderName: "Adhira Founder",
            expiryDate: "2028-12-01T00:00:00",
            displayCardNumber: "4242",
            cardScheme: "visa",
            origin: "AU",
          },
          fees: {
            transactionFee: 108,
            applicationFee: 1000,
            totalFee: 1108,
            currency: "AUD",
            taxRate: 0.1,
          },
          status: "approved",
        },
      ],
      metadata: {
        runId: "RUN_CMP_001",
        testerId: "tst_sarah_chen",
        findings: 3,
        verdict: "modify",
        decision: "Can a recruiter understand the product and request a demo?",
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Formatters                                                                 */
/* -------------------------------------------------------------------------- */

/** Cents → "A$40.00". Raw cents must never reach the UI. */
export function formatAmount(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

/** ISO string → "1 Aug 2026" for display. Raw ISO stays in the JSON block. */
export function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/** "A$40.00 charged → You A$30.00 · Playground A$10.00" */
export function formatSplit(payment: PinchPayment): string {
  const you = payment.amount - payment.applicationFee;
  return `${formatAmount(payment.amount)} charged  →  You ${formatAmount(
    you,
  )}  ·  Playground ${formatAmount(payment.applicationFee)}`;
}

/** Sum of (amount − applicationFee) across approved payments, in cents. */
export function approvedBalanceCents(earnings: TesterEarnings): number {
  return earnings.payments
    .filter((payment) => payment.status === "approved")
    .reduce((total, payment) => total + payment.amount - payment.applicationFee, 0);
}
