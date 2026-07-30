import Image from "next/image";
import Link from "next/link";

import { SunsetAsciiCanvas } from "@/components/landing/SunsetAsciiCanvas";

const DEMO_CAMPAIGN_ID = "cmp_001";
const TESTER_ENTRY = `/tester/campaigns/${DEMO_CAMPAIGN_ID}`;
const FOUNDER_ENTRY = "/founder/new";

const WORKFLOW = [
  "Submit product",
  "Fund with Pinch",
  "Scout analyses",
  "Users test",
  "Get a decision",
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
            <Link className="landing-nav__link" href={TESTER_ENTRY}>
              For founding users
            </Link>
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
          <div className="landing-shell landing-hero__inner">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow">Pinch-powered product validation</p>
              <h1>Get your first useful users.</h1>
              <p className="landing-hero__lede">
                Paste your product. Fund a validation campaign. Matched users
                test it. Get three fixes and a launch decision.
              </p>
              <div className="landing-hero__actions">
                <Link
                  className="landing-btn landing-btn--primary landing-btn--hero"
                  href={FOUNDER_ENTRY}
                >
                  Launch a validation
                </Link>
                <Link
                  className="landing-btn landing-btn--secondary landing-btn--hero"
                  href={TESTER_ENTRY}
                >
                  Earn as a tester
                </Link>
              </div>
              <p className="landing-trust">
                Payment activates the work. Evidence supports the decision.
              </p>
            </div>

            <article className="landing-preview">
              <div className="landing-preview__chrome">
                <span className="landing-preview__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="landing-preview__url">
                  www.ingenworkspace.com
                </span>
                <span className="landing-chip landing-chip--demo">
                  Demo preview
                </span>
              </div>
              <div className="landing-preview__body">
                <h2 className="landing-preview__heading">
                  Campaign {DEMO_CAMPAIGN_ID}
                </h2>
                <p className="landing-preview__question">
                  Can a recruiter understand the product and request a demo?
                </p>
                <dl className="landing-preview__meta">
                  <div>
                    <dt>Audience</dt>
                    <dd>Australian recruiters</dd>
                  </div>
                  <div>
                    <dt>Package</dt>
                    <dd>A$199</dd>
                  </div>
                  <div>
                    <dt>Matched users</dt>
                    <dd>5 testers</dd>
                  </div>
                </dl>
                <div className="landing-preview__rail">
                  <span className="landing-preview__states" aria-hidden="true">
                    <i className="done" />
                    <i className="done" />
                    <i className="done" />
                    <i />
                    <i />
                  </span>
                  <span className="landing-preview__stage">Live · 3 of 5</span>
                  <span className="landing-chip landing-chip--live">
                    Funded · sandbox
                  </span>
                </div>
              </div>
            </article>

            <div className="landing-hero__reveal">
              <p className="landing-eyebrow">Australia-first validation</p>
              <h2>Meet people who already have the problem.</h2>
              <p>
                Start with relevant Australian testers, then turn clear human
                evidence into the next product decision.
              </p>
            </div>

            <span className="landing-horizon-beam" aria-hidden="true" />

            <div className="landing-scroll-cue" aria-hidden="true">
              <span>Scroll to reveal</span>
              <i>
                <b />
              </i>
              <span className="landing-scroll-cue__count">
                <em>01 / 02</em>
                <strong>02 / 02</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="landing-shell landing-flow" id="how-it-works">
          <h2>How it works</h2>
          <ol>
            {WORKFLOW.map((step, index) => (
              <li key={step}>
                <div className="landing-flow__step">
                  <span className="landing-flow__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="landing-flow__label">{step}</span>
                </div>
                {index < WORKFLOW.length - 1 ? (
                  <span className="landing-flow__arrow" aria-hidden="true">
                    &rarr;
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
