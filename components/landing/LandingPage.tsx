"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { SunsetAsciiCanvas } from "@/components/landing/SunsetAsciiCanvas";
import { RoleNavigation } from "@/components/navigation/RoleNavigation";

const TESTER_ENTRY = "/start?role=tester";
const FOUNDER_ENTRY = "/start?role=founder";

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

function PinchSplitPreview({
  flipped,
  onToggle,
}: {
  flipped: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      className={`landing-preview${flipped ? " landing-preview--flipped" : ""}`}
      aria-label="Pinch realtime payment split. Activate to toggle Pinch Payments."
      aria-pressed={flipped}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      role="button"
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
  );
}

export function LandingPage() {
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false);

  const togglePreview = () => {
    setIsPreviewFlipped((current) => !current);
  };

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
          <span
            className="landing-brand__powered"
            aria-label="Powered by PinchPayments"
          >
            <span
              className="landing-pinch-mark landing-pinch-mark--nav"
              aria-hidden="true"
            >
              <Image
                src="/pinch-payments-logo.png"
                alt=""
                width={496}
                height={200}
              />
            </span>
            <span className="landing-brand__powered-copy">
              <span>Powered by</span>
              <strong>PinchPayments</strong>
            </span>
          </span>
          <div className="landing-nav__links">
            <a
              className="landing-nav__link landing-nav__link--how"
              href="#how-it-works"
            >
              How it works
            </a>
            <a className="landing-nav__link" href="#founding-users">
              For testers
            </a>
          </div>
          <RoleNavigation variant="landing" />
        </nav>
      </header>

      <main>
        <section className="landing-api-hero" aria-labelledby="api-hero-title">
          <div className="landing-shell landing-api-hero__frame">
            <div className="landing-api-hero__copy">
              <p>PRODUCT VALIDATION · PROGRAMMED</p>
              <h1 id="api-hero-title">
                <span>Give your product access to the</span>
                <mark>real world.</mark>
              </h1>
              <h2>
                Playground makes product validation as reliable and
                programmable as the APIs behind it.
              </h2>
              <div className="landing-api-hero__actions">
                <Link
                  className="landing-api-hero__primary"
                  href={FOUNDER_ENTRY}
                >
                  Validate my product <span aria-hidden="true">›</span>
                </Link>
                <Link
                  className="landing-api-hero__secondary"
                  href={TESTER_ENTRY}
                >
                  Get paid to test <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <PinchSplitPreview
              flipped={isPreviewFlipped}
              onToggle={togglePreview}
            />
          </div>
        </section>

        <section className="landing-hero">
          <SunsetAsciiCanvas />
          <span
            className="landing-hero__map-anchor"
            id="founding-users"
            aria-hidden="true"
          />
          <div className="landing-shell landing-hero__inner">
            <div className="landing-hero__copy" hidden>
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
              <div className="landing-hero__actions">
                <Link
                  className="landing-btn landing-btn--primary landing-btn--hero"
                  href={FOUNDER_ENTRY}
                >
                  Validate my product
                </Link>
                <Link
                  className="landing-hero__tester-link"
                  href={TESTER_ENTRY}
                >
                  Get paid to test →
                </Link>
              </div>
            </div>

            <article
              hidden
              className={`landing-preview${isPreviewFlipped ? " landing-preview--flipped" : ""}`}
              aria-label="Pinch realtime payment split. Activate to toggle Pinch Payments."
              aria-pressed={isPreviewFlipped}
              onClick={togglePreview}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  togglePreview();
                }
              }}
              role="button"
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
              <p className="landing-hero__pillars">
                Pre-screen the product | Fund validation through Pinch | Reach
                founding users and audience
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
                  {step.pinch ? (
                    <span
                      className="landing-pinch-mark landing-pinch-mark--rail"
                      aria-hidden="true"
                    >
                      <Image
                        src="/pinch-payments-logo.png"
                        alt=""
                        width={496}
                        height={200}
                      />
                    </span>
                  ) : (
                    <i className="landing-flow__dot" aria-hidden="true" />
                  )}
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
