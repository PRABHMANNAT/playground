import Image from "next/image";
import Link from "next/link";

import { SunsetAsciiCanvas } from "@/components/landing/SunsetAsciiCanvas";

const TESTER_ENTRY = "/tester";
const FOUNDER_ENTRY = "/founder/new";

const WORKFLOW = [
  {
    number: "01",
    title: "Paste",
    copy: "Your link and the one decision you're stuck on",
  },
  {
    number: "02",
    title: "Test plan",
    copy: "Scout connects a live browser and builds the tasks",
  },
  {
    number: "03",
    title: "Fund",
    copy: "Split payment across five matched testers",
    pinch: true,
  },
  {
    number: "04",
    title: "Confirm",
    copy: "Signed webhook lands, the run goes live",
    pinch: true,
  },
  {
    number: "05",
    title: "Test",
    copy: "Real users run the tasks, evidence captured",
  },
  {
    number: "06",
    title: "Verdict",
    copy: "Ship / Modify / Kill, plus three fixes",
  },
  {
    number: "07",
    title: "Pay reviewer",
    copy: "One call: tester paid, platform fee split",
    pinch: true,
  },
  {
    number: "08",
    title: "Settled",
    copy: "Funds land in the tester's bank account",
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
            </div>

            <article
              className="landing-preview"
              aria-label="Pinch realtime payment split. Hover to reveal Pinch Payments."
              tabIndex={0}
            >
              <div className="landing-preview__flipper">
                <div className="landing-preview__face landing-preview__face--front">
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
                </div>

                <div
                  className="landing-preview__face landing-preview__face--back"
                  aria-hidden="true"
                >
                  <div className="landing-preview__pinch-glass">
                    <Image
                      className="landing-preview__pinch-logo"
                      src="/pinch-payments-logo.png"
                      alt=""
                      width={302}
                      height={168}
                    />
                    <span>PAYMENTS</span>
                  </div>
                  <p>REALTIME SPLIT INFRASTRUCTURE</p>
                </div>
              </div>
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
          <p className="landing-flow__eyebrow">
            PINCH POWERS 3 OF THE 8 STEPS
          </p>
          <ol>
            {WORKFLOW.map((step) => (
              <li
                className={step.pinch ? "landing-flow__pinch-step" : undefined}
                key={step.number}
              >
                <div className="landing-flow__marker">
                  <span className="landing-flow__index" aria-hidden="true">
                    {step.number}
                  </span>
                  <i className="landing-flow__dot" aria-hidden="true" />
                </div>
                <div className="landing-flow__content">
                  <strong className="landing-flow__label">
                    {step.title}
                  </strong>
                  {step.pinch ? (
                    <span className="landing-flow__pinch-tag">PINCH</span>
                  ) : null}
                  <p className="landing-flow__copy">{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
