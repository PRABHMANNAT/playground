import Image from "next/image";
import Link from "next/link";

import { SunsetAsciiCanvas } from "@/components/landing/SunsetAsciiCanvas";

const TESTER_ENTRY = "/tester";
const FOUNDER_ENTRY = "/founder/new";

const WORKFLOW = [
  {
    number: "01",
    title: "PASTE",
    copy: "Your link and the one decision you're stuck on.",
  },
  {
    number: "02",
    title: "FUND",
    copy: "Pinch splits the payment across five matched testers.",
  },
  {
    number: "03",
    title: "DECIDE",
    copy: "Three fixes and a Ship / Modify / Kill verdict.",
  },
];

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <nav
          className="landing-shell landing-nav__inner"
          aria-label="Primary navigation"
        >
          <Link className="landing-brand" href="/">
            <span className="landing-brand__mark" aria-hidden="true">
              <Image
                src="/playground-logo.png"
                alt=""
                width={38}
                height={38}
                priority
              />
            </span>
            <span className="landing-brand__word">Playground</span>
          </Link>
          <span className="landing-brand__powered" aria-label="Powered by PinchPayments">
            <span>Powered by</span>
            <strong>PinchPayments</strong>
          </span>
          <div className="landing-nav__links">
            <a
              className="landing-nav__link landing-nav__link--how"
              href="#how-it-works"
            >
              How it works
            </a>
            <a className="landing-nav__link" href="#founding-users">
              For founding users
            </a>
          </div>
          <Link
            className="landing-btn landing-btn--primary landing-btn--nav"
            href={FOUNDER_ENTRY}
          >
            Launch validation
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <SunsetAsciiCanvas />
          <span
            className="landing-hero__map-anchor"
            id="founding-users"
            aria-hidden="true"
          />
          <div className="landing-shell landing-hero__inner">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow">
                SPLIT PAYMENTS BY PINCH · MATCHED AUSTRALIAN TESTERS
              </p>
              <h1>
                Kill bad ideas
                <br />
                before they kill
                <br />
                your runway.
              </h1>
              <p className="landing-hero__lede">
                Paste your link. Fund a campaign through Pinch. Five matched
                Australian users test it — you get three fixes and a Ship /
                Modify / Kill call.
              </p>
              <div className="landing-hero__actions">
                <Link
                  className="landing-btn landing-btn--primary landing-btn--hero"
                  href={FOUNDER_ENTRY}
                >
                  Launch a validation
                </Link>
                <Link
                  className="landing-hero__tester-link"
                  href={TESTER_ENTRY}
                >
                  Earn as a tester →
                </Link>
              </div>
              <p className="landing-trust">
                — A$199 · 5 testers · results in 24 hours
              </p>
            </div>

            <article className="landing-preview">
              <header className="landing-split-card__header">
                <span>PINCH · REALTIME SPLIT</span>
                <span>CMP_001</span>
              </header>

              <div className="landing-split-card__fork">
                <div className="landing-split-card__node landing-split-card__node--founder">
                  <span>Founder</span>
                  <strong>A$199</strong>
                </div>

                <svg
                  className="landing-split-card__connector landing-split-card__connector--desktop"
                  viewBox="0 0 120 150"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M0 75 H50" />
                  <path d="M50 75 C70 75 70 35 92 35 H120" />
                  <path d="M50 75 C70 75 70 115 92 115 H120" />
                  <circle cx="50" cy="75" r="4" />
                </svg>

                <svg
                  className="landing-split-card__connector landing-split-card__connector--mobile"
                  viewBox="0 0 240 64"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M120 0 V22" />
                  <path d="M120 22 C120 38 60 36 60 52 V64" />
                  <path d="M120 22 C120 38 180 36 180 52 V64" />
                  <circle cx="120" cy="22" r="4" />
                </svg>

                <div className="landing-split-card__recipients">
                  <div className="landing-split-card__node landing-split-card__node--settled">
                    <span>5 testers</span>
                    <strong>A$150.00</strong>
                  </div>
                  <div className="landing-split-card__node landing-split-card__node--settled">
                    <span>Playground</span>
                    <strong>A$49.00</strong>
                  </div>
                </div>
              </div>

              <div className="landing-split-card__divider" aria-hidden="true" />

              <footer className="landing-split-card__footer">
                <div className="landing-split-card__request">
                  <code>POST /payments/realtime</code>
                  <code>applicationFee: 4900</code>
                </div>
                <p>
                  pmt_8Kd2Xq ·{" "}
                  <strong className="landing-preview__approved">
                    approved
                  </strong>{" "}
                  · test mode
                </p>
              </footer>
            </article>

            <div className="landing-hero__reveal">
              <h2>Meet people who already have the problem.</h2>
              <p>
                Matched Australian testers, not a survey panel. Every tester is
                a verified Pinch merchant — which is why they get paid in one
                call, and why fake reviewers can&apos;t get paid at all.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-shell landing-flow" id="how-it-works">
          <h2>How it works</h2>
          <ol>
            {WORKFLOW.map((step) => (
              <li key={step.number}>
                <div className="landing-flow__step">
                  <span className="landing-flow__index" aria-hidden="true">
                    {step.number}
                  </span>
                  <div>
                    <strong className="landing-flow__label">
                      {step.title}
                    </strong>
                    <p className="landing-flow__copy">{step.copy}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
