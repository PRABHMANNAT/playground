"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import { useRemoteBrowserSession } from "@/components/browser-lab/useRemoteBrowserSession";
import { DEMO_CAMPAIGN_FORM } from "@/lib/campaign/package";
import {
  createCampaign,
  DEMO_CAMPAIGN_ID,
} from "@/lib/campaign/store";

const FALLBACK_TASKS = [
  "Explain what the product does in one sentence.",
  "Find how it works.",
  "Attempt the primary action.",
  "Mark anything that reduces trust.",
] as const;

type TestPlan = {
  decision: string;
  tasks: readonly string[];
};

type ReviewPin = {
  id: number;
  x: number;
  y: number;
  note: string;
};

type ProductCapture = {
  dataUrl: string;
  title: string;
  url: string;
  width: number;
  height: number;
  capturedAt: string;
  pins: ReviewPin[];
};

function primaryActionFrom(decision: string): string {
  const normalized = decision.toLowerCase();

  if (normalized.includes("demo")) {
    return "Attempt to request a demo.";
  }
  if (normalized.includes("sign up") || normalized.includes("signup")) {
    return "Attempt to sign up.";
  }
  if (normalized.includes("book")) {
    return "Attempt to book the primary service.";
  }
  if (
    normalized.includes("buy") ||
    normalized.includes("purchase") ||
    normalized.includes("checkout")
  ) {
    return "Attempt to complete the primary purchase action.";
  }
  if (normalized.includes("contact")) {
    return "Attempt to contact the product team.";
  }

  return FALLBACK_TASKS[2];
}

async function generateTasks(decision: string): Promise<readonly string[]> {
  return [
    FALLBACK_TASKS[0],
    FALLBACK_TASKS[1],
    primaryActionFrom(decision),
    FALLBACK_TASKS[3],
  ];
}

function readFounderIdentity() {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem("playground-demo-entry") ?? "null",
    ) as { name?: string; email?: string } | null;
    return {
      name: stored?.name?.trim() || DEMO_CAMPAIGN_FORM.founderName,
      email: stored?.email?.trim() || DEMO_CAMPAIGN_FORM.founderEmail,
    };
  } catch {
    return {
      name: DEMO_CAMPAIGN_FORM.founderName,
      email: DEMO_CAMPAIGN_FORM.founderEmail,
    };
  }
}

function companyFromUrl(productUrl: string) {
  try {
    const hostname = new URL(productUrl).hostname.replace(/^www\./, "");
    return hostname.split(".")[0]?.toUpperCase() || "NEW PRODUCT";
  } catch {
    return "NEW PRODUCT";
  }
}

export function ScoutBrief({
  browserbaseConfigured,
}: {
  browserbaseConfigured: boolean;
}) {
  const [productUrl, setProductUrl] = useState("");
  const [decision, setDecision] = useState("");
  const [urlError, setUrlError] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [runId, setRunId] = useState(DEMO_CAMPAIGN_ID);
  const [refinement, setRefinement] = useState("");
  const [refinementSaved, setRefinementSaved] = useState(false);
  const [panelView, setPanelView] = useState<"plan" | "website">("website");
  const [pinMode, setPinMode] = useState(false);
  const [pins, setPins] = useState<ReviewPin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<number | null>(null);
  const [capture, setCapture] = useState<ProductCapture | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const nextPinIdRef = useRef(1);
  const refinePanelRef = useRef<HTMLDetailsElement>(null);
  const {
    setUrl: setBrowserUrl,
    status: browserStatus,
    session: browserSession,
    error: browserError,
    progressMessage: browserProgressMessage,
    handleLaunch: launchBrowser,
  } = useRemoteBrowserSession({
    browserbaseConfigured,
    defaultUrl: "",
  });
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? null;

  const invalidatePlan = () => {
    if (plan) {
      setPlan(null);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(productUrl);
    } catch {
      parsedUrl = null;
    }

    const nextUrlError =
      parsedUrl?.protocol === "https:"
        ? ""
        : "Enter a valid HTTPS product URL.";
    const trimmedDecision = decision.trim();
    const nextDecisionError = trimmedDecision
      ? ""
      : "Add the one decision Scout should answer.";

    setUrlError(nextUrlError);
    setDecisionError(nextDecisionError);

    if (nextUrlError || nextDecisionError || !parsedUrl) {
      return;
    }

    const fallbackTimer = new Promise<readonly string[]>((resolve) => {
      window.setTimeout(() => resolve(FALLBACK_TASKS), 4_000);
    });

    const tasks = await Promise.race([
      generateTasks(trimmedDecision).catch(() => FALLBACK_TASKS),
      fallbackTimer,
    ]);

    const identity = readFounderIdentity();
    try {
      const run = await createCampaign({
        ...DEMO_CAMPAIGN_FORM,
        founderName: identity.name,
        founderEmail: identity.email,
        companyName: companyFromUrl(parsedUrl.href),
        productUrl: parsedUrl.href,
        validationQuestion: trimmedDecision,
      });
      setRunId(run.id);
    } catch {
      setRunId(DEMO_CAMPAIGN_ID);
    }

    setPlan({
      decision: trimmedDecision,
      tasks,
    });
    setPanelView("plan");
  };

  const loadWebsite = () => {
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(productUrl);
    } catch {
      parsedUrl = null;
    }

    if (parsedUrl?.protocol !== "https:") {
      setUrlError("Enter a valid HTTPS product URL.");
      return;
    }

    setUrlError("");
    setCaptureError("");
    setPanelView("website");
    setPinMode(false);
    void launchBrowser();
  };

  const addPin = (event: MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextPin: ReviewPin = {
      id: nextPinIdRef.current,
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      note: "",
    };
    nextPinIdRef.current += 1;
    setPins((current) => [...current, nextPin]);
    setSelectedPinId(nextPin.id);
    setPinMode(false);
  };

  const captureReview = async () => {
    if (!browserSession || isCapturing) {
      return;
    }

    setIsCapturing(true);
    setCaptureError("");
    try {
      const response = await fetch("/api/browser/session/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: browserSession.sessionId }),
      });
      const body = (await response.json()) as
        | Omit<ProductCapture, "pins">
        | { error?: { message?: string } };

      if (!response.ok || !("dataUrl" in body)) {
        throw new Error(
          "error" in body
            ? body.error?.message
            : "The current product screen could not be captured.",
        );
      }

      setCapture({ ...body, pins: pins.map((pin) => ({ ...pin })) });
      if (refinePanelRef.current) {
        refinePanelRef.current.open = true;
      }
      window.setTimeout(() => {
        refinePanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 0);
    } catch (error) {
      setCaptureError(
        error instanceof Error
          ? error.message
          : "The current product screen could not be captured.",
      );
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="founder-brief">
      <div className="founder-brief__grid">
        <section className="founder-card founder-brief__entry">
          <div className="founder-brief__section-head">
            <div>
              <p className="founder-card__step">Required input</p>
              <h2>Give Scout the brief</h2>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate>
            <div className="founder-field">
              <label htmlFor="briefProductUrl">Product URL</label>
              <input
                id="briefProductUrl"
                type="url"
                inputMode="url"
                placeholder="https://your-product.com"
                value={productUrl}
                aria-invalid={urlError ? true : undefined}
                aria-describedby={
                  urlError
                    ? "briefProductUrl-error"
                    : "briefProductUrl-helper"
                }
                onChange={(event) => {
                  const nextUrl = event.target.value;
                  setProductUrl(nextUrl);
                  setBrowserUrl(nextUrl);
                  setUrlError("");
                  invalidatePlan();
                }}
              />
              <p
                className="founder-field__hint"
                id="briefProductUrl-helper"
              >
                Staging, prototype or live site. HTTPS only.
              </p>
              {urlError ? (
                <p
                  className="founder-field__error"
                  id="briefProductUrl-error"
                >
                  {urlError}
                </p>
              ) : null}
            </div>

            <div className="founder-field">
              <div className="founder-brief__label-row">
                <label htmlFor="briefDecision">
                  What decision are you stuck on?
                </label>
                <span aria-live="polite">{decision.length}/140</span>
              </div>
              <textarea
                id="briefDecision"
                rows={3}
                maxLength={140}
                placeholder="Can a recruiter understand the product and request a demo?"
                value={decision}
                aria-invalid={decisionError ? true : undefined}
                aria-describedby={
                  decisionError
                    ? "briefDecision-error"
                    : "briefDecision-helper"
                }
                onChange={(event) => {
                  setDecision(event.target.value);
                  setDecisionError("");
                  invalidatePlan();
                }}
              />
              <p className="founder-field__hint" id="briefDecision-helper">
                One question. Not a list of things to check.
              </p>
              {decisionError ? (
                <p
                  className="founder-field__error"
                  id="briefDecision-error"
                >
                  {decisionError}
                </p>
              ) : null}
            </div>

            {!plan ? (
              <button
                className="founder-btn founder-btn--primary founder-brief__primary"
                type="submit"
              >
                Get started <span aria-hidden="true">›</span>
              </button>
            ) : null}
          </form>
        </section>

        <section
          className={`founder-card founder-brief__plan${
            plan && panelView === "plan" ? " founder-brief__plan--ready" : ""
          }`}
          aria-live="polite"
        >
          <div className="founder-brief__review-bar">
            <div>
              <strong>
                {panelView === "plan" && plan
                  ? "Test plan"
                  : browserSession
                    ? browserSession.hostname
                    : "Product review"}
              </strong>
              <span>
                {browserStatus === "connected"
                  ? "Live Browserbase session"
                  : browserStatus === "launching"
                    ? "Connecting…"
                    : "Load an authorised HTTPS site"}
              </span>
            </div>
            <div className="founder-brief__review-actions">
              {plan ? (
                <button
                  className="founder-brief__tool-button"
                  type="button"
                  onClick={() =>
                    setPanelView((current) =>
                      current === "plan" ? "website" : "plan",
                    )
                  }
                >
                  {panelView === "plan" ? "Review website" : "View plan"}
                </button>
              ) : null}
              {browserSession && panelView === "website" ? (
                <>
                  <button
                    className={`founder-brief__tool-button${
                      pinMode ? " founder-brief__tool-button--active" : ""
                    }`}
                    type="button"
                    onClick={() => setPinMode((current) => !current)}
                  >
                    {pinMode ? "Click a detail…" : "Add pin"}
                  </button>
                  <button
                    className="founder-brief__tool-button"
                    type="button"
                    disabled={isCapturing}
                    onClick={() => void captureReview()}
                  >
                    {isCapturing ? "Capturing…" : "Capture review"}
                  </button>
                </>
              ) : null}
              <button
                className="founder-brief__load-button"
                type="button"
                disabled={
                  browserStatus === "launching" ||
                  browserStatus === "stopping"
                }
                onClick={loadWebsite}
              >
                {browserStatus === "launching"
                  ? "Loading…"
                  : browserSession
                    ? "Reload website"
                    : "Load website"}
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>

          {plan && panelView === "plan" ? (
            <>
              <div className="founder-brief__decision founder-brief__plan-content">
                <p className="founder-card__step">Decision to answer</p>
                <h2>{plan.decision}</h2>
              </div>

              <div className="founder-brief__tasks">
                <p className="founder-card__step">Tester tasks</p>
                <ol>
                  {plan.tasks.map((task, index) => (
                    <li key={`${index}-${task}`}>
                      <span>{index + 1}</span>
                      <p>{task}</p>
                    </li>
                  ))}
                </ol>
                <p className="founder-brief__task-meta">
                  4 tasks · 5 matched Australian testers · ~40 min each
                </p>
              </div>

              <div className="founder-brief__gate">
                <strong>Awaiting verified Pinch payment</strong>
                <span>Scout starts when the payment webhook confirms.</span>
              </div>

              <Link
                className="founder-btn founder-btn--primary founder-brief__fund"
                href={`/founder/new?step=fund&runId=${encodeURIComponent(runId)}`}
              >
                Fund this run · A$199 →
              </Link>
              <p className="founder-brief__pinch-note">
                Split by Pinch across 5 testers at payment
              </p>
            </>
          ) : browserSession ? (
            <div className="founder-brief__browser">
              <iframe
                allow="clipboard-read; clipboard-write"
                className="founder-brief__live-view"
                sandbox="allow-same-origin allow-scripts"
                src={browserSession.liveViewUrl}
                title={`Live product review for ${browserSession.hostname}`}
              />
              {pinMode ? (
                <button
                  className="founder-brief__pin-layer"
                  type="button"
                  aria-label="Place an annotation pin on the product"
                  onClick={addPin}
                >
                  <span>Click the detail you want Scout to review</span>
                </button>
              ) : null}
              {pins.map((pin) => (
                <button
                  key={pin.id}
                  className={`founder-brief__pin${
                    selectedPinId === pin.id
                      ? " founder-brief__pin--selected"
                      : ""
                  }`}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  type="button"
                  aria-label={`Edit annotation ${pin.id}`}
                  onClick={() => setSelectedPinId(pin.id)}
                >
                  {pin.id}
                </button>
              ))}
              {selectedPin ? (
                <div className="founder-brief__pin-editor">
                  <label htmlFor={`reviewPin-${selectedPin.id}`}>
                    Comment for pin {selectedPin.id}
                  </label>
                  <textarea
                    id={`reviewPin-${selectedPin.id}`}
                    rows={2}
                    placeholder="What should change at this point?"
                    value={selectedPin.note}
                    onChange={(event) => {
                      const note = event.target.value;
                      setPins((current) =>
                        current.map((pin) =>
                          pin.id === selectedPin.id ? { ...pin, note } : pin,
                        ),
                      );
                      setRefinementSaved(false);
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Remove annotation ${selectedPin.id}`}
                    onClick={() => {
                      setPins((current) =>
                        current.filter((pin) => pin.id !== selectedPin.id),
                      );
                      setSelectedPinId(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ) : browserStatus === "launching" ? (
            <div className="founder-brief__browser-state" aria-live="polite">
              <span className="founder-brief__loader" aria-hidden="true" />
              <h2>Opening the product</h2>
              <p>{browserProgressMessage}</p>
            </div>
          ) : browserError ? (
            <div
              className="founder-brief__browser-state founder-brief__browser-state--error"
              role="alert"
            >
              <span>Fallback preview</span>
              <h2>Remote browser unavailable</h2>
              <p tabIndex={-1}>{browserError}</p>
              <p>
                No live interaction or screenshot is being claimed. Check the
                Browserbase connection, then try again.
              </p>
            </div>
          ) : (
            <div className="founder-brief__empty">
              <Image
                className="founder-brief__computer"
                src="/browserbase-computer.webp"
                alt=""
                width={1600}
                height={723}
                priority
              />
              <span aria-hidden="true">REVIEW—01</span>
              <h2>Your test plan appears here</h2>
              <p>
                Load the product to browse, pin a detail, and attach a real
                screen capture for Scout.
              </p>
            </div>
          )}
          {captureError ? (
            <p className="founder-brief__capture-error" role="alert">
              {captureError}
            </p>
          ) : null}
        </section>
      </div>

      <details
        className="founder-card founder-brief__chat"
        ref={refinePanelRef}
      >
        <summary>
          <span>
            <strong>Refine with Scout</strong>
            <small>Optional · does not block the run</small>
          </span>
          <span aria-hidden="true">+</span>
        </summary>
        <div className="founder-brief__chat-body">
          {capture ? (
            <figure className="founder-brief__capture">
              <div className="founder-brief__capture-image">
                <Image
                  src={capture.dataUrl}
                  alt={`Captured product screen: ${capture.title}`}
                  width={capture.width}
                  height={capture.height}
                  unoptimized
                />
                {capture.pins.map((pin) => (
                  <span
                    className="founder-brief__capture-pin"
                    key={pin.id}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  >
                    {pin.id}
                  </span>
                ))}
              </div>
              <figcaption>
                <span>
                  <strong>Captured product screen</strong>
                  <small>{capture.title}</small>
                </span>
                <button type="button" onClick={() => setCapture(null)}>
                  Remove
                </button>
              </figcaption>
              {capture.pins.some((pin) => pin.note.trim()) ? (
                <ol className="founder-brief__capture-notes">
                  {capture.pins
                    .filter((pin) => pin.note.trim())
                    .map((pin) => (
                      <li key={pin.id}>
                        <span>{pin.id}</span>
                        {pin.note}
                      </li>
                    ))}
                </ol>
              ) : null}
            </figure>
          ) : null}
          <p>
            <strong>Scout</strong>
            Add an instruction for this screen. The capture and numbered pins
            will travel with your refinement.
          </p>
          <div className="founder-field">
            <label htmlFor="scoutRefinement">
              What do you want Scout to focus on?
            </label>
            <textarea
              id="scoutRefinement"
              rows={2}
              placeholder="For example: check whether this section gives a recruiter enough proof to continue."
              value={refinement}
              onChange={(event) => {
                setRefinement(event.target.value);
                setRefinementSaved(false);
              }}
            />
          </div>
          <button
            className="founder-btn founder-brief__chat-action"
            type="button"
            disabled={!refinement.trim() && !capture}
            onClick={() => {
              const savedReview = {
                text: refinement.trim(),
                capture,
                annotations: capture?.pins ?? pins,
              };
              try {
                window.sessionStorage.setItem(
                  "playground-scout-refinement",
                  JSON.stringify(savedReview),
                );
              } catch {
                window.sessionStorage.setItem(
                  "playground-scout-refinement",
                  JSON.stringify({
                    ...savedReview,
                    capture: capture
                      ? {
                          ...capture,
                          dataUrl: undefined,
                        }
                      : null,
                  }),
                );
              }
              setRefinementSaved(true);
            }}
          >
            Add refinement
          </button>
          {refinementSaved ? (
            <p className="founder-brief__refinement-status" role="status">
              Refinement added to this run.
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
