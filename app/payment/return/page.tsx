import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { PaymentReturn } from "@/components/payment/PaymentReturn";

export const metadata: Metadata = {
  title: "Payment return",
  description: "Server-verified result of a Pinch sandbox checkout.",
};

export default function PaymentReturnPage() {
  return (
    <div className="pay">
      <header className="pay-nav">
        <div className="pay-shell pay-nav__inner">
          <Link className="pay-brand" href="/">
            <span className="pay-brand__mark" aria-hidden="true">
              P
            </span>
            <span className="pay-brand__word">Playground</span>
          </Link>
          <span className="pay-attribution">
            Payments by <strong>Pinch</strong>
          </span>
        </div>
      </header>

      <main className="pay-shell pay-main">
        <Suspense
          fallback={
            <div className="pay-card pay-card--centred" aria-busy="true">
              <span className="pay-spinner" aria-hidden="true" />
              <p className="pay-loading" role="status">
                Verifying Pinch payment…
              </p>
            </div>
          }
        >
          <PaymentReturn />
        </Suspense>
      </main>
    </div>
  );
}
