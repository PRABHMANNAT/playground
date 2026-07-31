"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useRemoteBrowserSession } from "@/components/browser-lab/useRemoteBrowserSession";
import { ProductBrowserSurface } from "@/components/campaigns/ProductBrowserSurface";
import {
  getCampaign,
  saveTesterSubmission,
} from "@/lib/campaign/store";
import type {
  CampaignEvidenceKind,
  CampaignVerdict,
} from "@/lib/campaign/types";

const PRODUCT_URL = "https://www.ingenworkspace.com";

const TASKS = [
  "Explain what the product does in one sentence.",
  "Find information about how it works.",
  "Attempt to request a demo.",
  "Mark anything that reduces trust.",
] as const;

type TesterPinSeverity = "Confusing" | "Broken" | "Trust";

type TesterPin = {
  id: string;
  xPercent: number;
  yPercent: number;
  severity: TesterPinSeverity;
  note: string;
};

const PIN_STORAGE_PREFIX = "playground:tester-pins:";

const ACCEPTANCE = [
  "Complete all required tasks",
  "Mark at least one confusing moment",
  "Explain what you expected",
  "Add written or video evidence",
  "Submit original feedback",
  "Positive feedback is not required",
] as const;

const EVIDENCE_CONTROLS: Array<{
  kind: CampaignEvidenceKind;
  label: string;
  symbol: string;
}> = [
  { kind: "confusion", label: "Mark confusion", symbol: "?" },
  { kind: "blocker", label: "Report blocker", symbol: "!" },
  { kind: "recommendation", label: "Add recommendation", symbol: "+" },
  { kind: "screenshot", label: "Add screenshot reference", symbol: "▧" },
  { kind: "loom", label: "Attach Loom link", symbol: "↗" },
];

const VERDICTS: Array<{ value: CampaignVerdict; label: string }> = [
  { value: "ready", label: "Ready to launch" },
  { value: "modification", label: "Needs modification" },
  { value: "blocker", label: "Major blocker" },
  { value: "insufficient", label: "Insufficient evidence" },
];

export function TesterCampaignClient({
  browserbaseConfigured,
  campaignId,
}: {
  browserbaseConfigured: boolean;
  campaignId: string;
}) {
  const router = useRouter();
  const {
    viewport: activeViewport,
    setViewport,
    status,
    session,
    error: browserError,
    progressMessage,
    handleLaunch,
    handleStop,
    handleDisconnect,
  } = useRemoteBrowserSession({
    browserbaseConfigured,
    defaultUrl: PRODUCT_URL,
  });
  const [paymentRef, setPaymentRef] = useState("pmt_XXXXXXXX");
  const [campaignReady, setCampaignReady] = useState<boolean | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [evidenceKinds, setEvidenceKinds] = useState<Set<CampaignEvidenceKind>>(
    new Set(["confusion", "recommendation"]),
  );
  const [issue, setIssue] = useState(
    "The homepage says “proof-first hiring,” but I could not understand what evidence the recruiter receives.",
  );
  const [severity, setSeverity] = useState<"Low" | "Medium" | "High">("High");
  const [expected, setExpected] = useState(
    "A clear example showing the evidence the recruiter receives.",
  );
  const [recommendation, setRecommendation] = useState(
    "Show one example evidence dossier above the fold.",
  );
  const [screenshotReference, setScreenshotReference] = useState("");
  const [loomUrl, setLoomUrl] = useState("");
  const [verdict, setVerdict] =
    useState<CampaignVerdict>("modification");
  const [originalConfirmed, setOriginalConfirmed] = useState(false);
  const [authoringMode, setAuthoringMode] = useState<"browse" | "mark">("browse");
  const [pins, setPins] = useState<TesterPin[]>([]);
  const [draftPin, setDraftPin] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [draftSeverity, setDraftSeverity] = useState<TesterPinSeverity | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const autoLaunchRef = useRef(false);
  const loomRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getCampaign(campaignId).then((campaign) => {
      if (campaign?.pinchPaymentId) {
        setPaymentRef(campaign.pinchPaymentId);
      }
      setCampaignReady(
        !!campaign &&
          ["live", "evidence_pending", "results_ready"].includes(
            campaign.status,
          ),
      );
    });
  }, [campaignId]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${PIN_STORAGE_PREFIX}${campaignId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as TesterPin[];
        if (Array.isArray(parsed)) setPins(parsed);
      }
    } catch {
      // Local persistence is optional for the authoring flow.
    }
  }, [campaignId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${PIN_STORAGE_PREFIX}${campaignId}`, JSON.stringify(pins));
    } catch {
      // Keep the current pins in memory if storage is unavailable.
    }
  }, [campaignId, pins]);

  useEffect(() => {
    if (!browserbaseConfigured || campaignReady !== true || autoLaunchRef.current) {
      return;
    }
    autoLaunchRef.current = true;
    void handleLaunch();
  }, [browserbaseConfigured, campaignReady, handleLaunch]);

  const toggleTask = (index: number) => {
    setCompletedTasks((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleEvidence = (kind: CampaignEvidenceKind) => {
    setEvidenceKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
    if (kind === "loom") {
      window.setTimeout(() => loomRef.current?.focus(), 0);
    }
  };

  const validate = (): string[] => {
    const nextErrors: string[] = [];
    if (campaignReady !== true) {
      nextErrors.push("The validation run must be active before evidence is submitted.");
    }
    if (completedTasks.size !== TASKS.length) {
      nextErrors.push("Complete all four required tasks.");
    }
    if (pins.length === 0) {
      nextErrors.push("Mark at least one issue on the product screen.");
    }
    if (!issue.trim()) nextErrors.push("Describe the issue you observed.");
    if (!expected.trim()) nextErrors.push("Explain what you expected.");
    if (!recommendation.trim()) nextErrors.push("Add a recommendation.");
    if (!originalConfirmed) {
      nextErrors.push("Confirm that this is your original feedback.");
    }
    if (
      evidenceKinds.has("screenshot") &&
      !screenshotReference.trim()
    ) {
      nextErrors.push("Add a screenshot reference or turn that evidence type off.");
    }
    if (loomUrl.trim()) {
      try {
        const parsed = new URL(loomUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        nextErrors.push("Enter a valid Loom URL, or leave it blank.");
      }
    }
    return nextErrors;
  };

  const submitReady =
    campaignReady === true &&
    completedTasks.size === TASKS.length &&
    pins.length > 0 &&
    originalConfirmed;

  const submitReason = !campaignReady
    ? "The validation run is not active."
    : completedTasks.size !== TASKS.length
      ? `Complete all ${TASKS.length} required tasks.`
      : pins.length === 0
        ? "Save at least one finding on the product screen."
        : !originalConfirmed
          ? "Confirm that this is your original feedback."
          : "Ready to submit.";

  const handlePinLayerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (authoringMode !== "mark" || draftPin) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = Math.round(((event.clientX - rect.left) / rect.width) * 10000) / 100;
    const yPercent = Math.round(((event.clientY - rect.top) / rect.height) * 10000) / 100;
    setDraftPin({ xPercent, yPercent });
    setDraftSeverity(null);
    setDraftNote("");
    setPinError(null);
  };

  const savePin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftPin || !draftSeverity || !draftNote.trim()) {
      setPinError("Choose a severity and add a one-line note.");
      return;
    }
    const pin: TesterPin = {
      id: `pin-${crypto.randomUUID()}`,
      ...draftPin,
      severity: draftSeverity,
      note: draftNote.trim().slice(0, 140),
    };
    setPins((current) => [...current, pin]);
    setHighlightedPinId(pin.id);
    setDraftPin(null);
    setDraftSeverity(null);
    setDraftNote("");
    setPinError(null);
  };

  const discardPin = () => {
    setDraftPin(null);
    setDraftSeverity(null);
    setDraftNote("");
    setPinError(null);
  };

  const submitEvidence = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.length > 0) {
      window.setTimeout(() => formErrorRef.current?.focus(), 0);
      return;
    }

    setSubmitting(true);
    try {
      await saveTesterSubmission({
        campaignId,
        testerName: "Alex Morgan",
        issue: issue.trim(),
        severity,
        expectedBehaviour: expected.trim(),
        recommendation: recommendation.trim(),
        loomUrl: loomUrl.trim(),
        finalVerdict: verdict,
        sourceType: "live_demo",
        qualityStatus: "Quality review pending",
        rewardAmount: 30,
        rewardStatus: "manual_review",
      });
      if (session) {
        await handleStop();
      }
      router.push(`/campaigns/${campaignId}/results`);
    } catch (error) {
      console.error("Validation run submission failed", error);
      setErrors([
        "The evidence could not be saved in this browser. Check local storage access and try again.",
      ]);
      setSubmitting(false);
      window.setTimeout(() => formErrorRef.current?.focus(), 0);
    }
  };

  return (
    <main className="cw-shell cw-shell--tester">
      <header className="cw-topbar">
        <Link className="cw-brand" href="/">
          <span aria-hidden="true">P</span>
          Playground
        </Link>
        <div className="cw-tester-context">
          <span>Tester run</span>
          <strong>92% match</strong>
        </div>
      </header>

      <div className="cw-page cw-tester-page">
        <section className="cw-tester-hero">
          <div>
            <p className="cw-kicker">Validation run {campaignId} · INGEN</p>
            <h1>Recruiter onboarding validation</h1>
            <p>
              Understand the tasks, collect focused evidence, and submit one
              clear launch recommendation.
            </p>
          </div>
          <div className="cw-reward-card">
            <span>Tester payout</span>
            <strong>A$30</strong>
            <small>Paid by Pinch on approval</small>
          </div>
        </section>

        <dl className="cw-metadata cw-metadata--tester">
          <div>
            <dt>Product</dt>
            <dd>INGEN</dd>
          </div>
          <div>
            <dt>Reward</dt>
            <dd>A$30</dd>
          </div>
          <div>
            <dt>Expected time</dt>
            <dd>20–30 minutes</dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd>Within 24 hours</dd>
          </div>
          <div>
            <dt>Match</dt>
            <dd>92%</dd>
          </div>
          <div>
            <dt>Funding</dt>
            <dd>Validation run funded through Pinch</dd>
          </div>
          <div>
            <dt>Payment reference</dt>
            <dd>{paymentRef}</dd>
          </div>
        </dl>

        {campaignReady === false ? (
          <p className="cw-payout-note cw-payout-note--blocked" role="alert">
            <span aria-hidden="true">!</span>
            This validation run is not active. Complete the verified Pinch sandbox
            payment before submitting evidence.
          </p>
        ) : (
          <p className="cw-payout-note">
            <span aria-hidden="true">◇</span>
            Tester payout is processed by Pinch after approval. Initial reviews are
            manually checked for quality.
          </p>
        )}

        <div className="cw-tester-layout">
          <section className="cw-tester-browser-column">
            <div className="cw-product-column__heading">
              <div>
                <p className="cw-kicker">Product workspace</p>
                <h2>Explore INGEN</h2>
              </div>
              <div className="cw-mini-browser-actions">
                <div className="cw-segmented" role="group" aria-label="Viewport">
                  {(["desktop", "mobile"] as const).map((viewport) => (
                    <button
                      aria-pressed={activeViewport === viewport}
                      className={
                        activeViewport === viewport ? "is-active" : ""
                      }
                      key={viewport}
                      onClick={() => setViewport(viewport)}
                      type="button"
                    >
                      {viewport === "desktop" ? "Desktop" : "Mobile"}
                    </button>
                  ))}
                </div>
                <button
                  className="cw-browser-retry"
                  disabled={
                    status === "launching" ||
                    status === "stopping"
                  }
                  onClick={() => void handleLaunch()}
                  type="button"
                >
                  Replace browser
                </button>
              </div>
            </div>
            <div className="cw-pin-mode-toggle" role="group" aria-label="Evidence authoring mode">
              <span>Evidence mode</span>
              <button
                aria-pressed={authoringMode === "browse"}
                className={authoringMode === "browse" ? "is-active" : ""}
                onClick={() => {
                  setAuthoringMode("browse");
                  discardPin();
                }}
                type="button"
              >
                Browse
              </button>
              <button
                aria-pressed={authoringMode === "mark"}
                className={authoringMode === "mark" ? "is-active" : ""}
                onClick={() => setAuthoringMode("mark")}
                type="button"
              >
                Mark issue
              </button>
              <small>{pins.length} saved</small>
            </div>
            <div
              className={`cw-pin-authoring-stage ${authoringMode === "mark" ? "is-marking" : ""}`}
              onClick={handlePinLayerClick}
              role={authoringMode === "mark" ? "button" : undefined}
              tabIndex={authoringMode === "mark" ? 0 : undefined}
              aria-label={authoringMode === "mark" ? "Click the product to place a finding pin" : undefined}
            >
              <ProductBrowserSurface
                compact
                error={browserError}
                onDisconnect={handleDisconnect}
                onRetry={() => void handleLaunch()}
                productUrl={PRODUCT_URL}
                progressMessage={progressMessage}
                session={session}
                status={status}
              />
              <div className="cw-tester-pin-layer" aria-label="Saved tester findings">
                {pins.map((pin, index) => (
                  <button
                    aria-label={`Finding ${index + 1}: ${pin.severity}`}
                    className={`founder-brief__capture-pin ${highlightedPinId === pin.id ? "is-highlighted" : ""}`}
                    key={pin.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setHighlightedPinId(pin.id);
                    }}
                    style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
                    type="button"
                  >
                    {index + 1}
                  </button>
                ))}
                {draftPin ? (
                  <form
                    className="cw-pin-popover"
                    onClick={(event) => event.stopPropagation()}
                    onSubmit={savePin}
                    style={{ left: `${draftPin.xPercent}%`, top: `${draftPin.yPercent}%` }}
                  >
                    <strong>New finding</strong>
                    <div className="cw-pin-severity" role="group" aria-label="Severity">
                      {(["Confusing", "Broken", "Trust"] as TesterPinSeverity[]).map((option) => (
                        <button
                          aria-pressed={draftSeverity === option}
                          className={draftSeverity === option ? "is-active" : ""}
                          key={option}
                          onClick={() => setDraftSeverity(option)}
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <input
                      autoFocus
                      maxLength={140}
                      onChange={(event) => setDraftNote(event.target.value)}
                      placeholder="What confused you?"
                      required
                      value={draftNote}
                    />
                    {pinError ? <small className="cw-pin-error">{pinError}</small> : null}
                    <div>
                      <button onClick={discardPin} type="button">Discard</button>
                      <button className="is-save" type="submit">Save</button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>
            <div className="cw-browser-safety">
              <span>Authorised destination</span>
              <strong>{PRODUCT_URL}</strong>
              <small>
                If the remote session is unavailable, the browser is explicitly
                labelled as a fallback preview.
              </small>
            </div>
          </section>

          <form className="cw-evidence-panel" onSubmit={submitEvidence}>
            <section className="cw-evidence-section cw-task-checklist">
              <div className="cw-evidence-heading">
                <div>
                  <span>01</span>
                  <h2>Required tasks</h2>
                </div>
                <small>
                  {completedTasks.size}/{TASKS.length} complete
                </small>
              </div>
              <ol>
                {TASKS.map((task, index) => (
                  <li key={task}>
                    <label>
                      <input
                        checked={completedTasks.has(index)}
                        onChange={() => toggleTask(index)}
                        type="checkbox"
                      />
                      <span aria-hidden="true">
                        {completedTasks.has(index) ? "✓" : index + 1}
                      </span>
                      <strong>{task}</strong>
                    </label>
                  </li>
                ))}
              </ol>
            </section>

            <section className="cw-evidence-section">
              <div className="cw-evidence-heading">
                <div>
                  <span>02</span>
                  <h2>Acceptance conditions</h2>
                </div>
              </div>
              <ul className="cw-acceptance">
                {ACCEPTANCE.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <label className="cw-original-check">
                <input
                  checked={originalConfirmed}
                  onChange={(event) =>
                    setOriginalConfirmed(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>I confirm this is my original feedback.</span>
              </label>
            </section>

            <section className="cw-evidence-section">
              <div className="cw-evidence-heading">
                <div>
                  <span>03</span>
                  <h2>Your findings</h2>
                </div>
                <small>{pins.length} saved pin{pins.length === 1 ? "" : "s"}</small>
              </div>
              {pins.length === 0 ? (
                <p className="cw-findings-empty">
                  No findings yet. Switch to Mark issue and click what confused you.
                </p>
              ) : (
                <div className="cw-tester-findings">
                  {pins.map((pin, index) => (
                    <article className={highlightedPinId === pin.id ? "is-highlighted" : ""} key={pin.id}>
                      <button
                        className="cw-tester-finding__main"
                        onClick={() => setHighlightedPinId(pin.id)}
                        type="button"
                      >
                        <span>{index + 1}</span>
                        <div>
                          <strong>{pin.severity}</strong>
                          <p>{pin.note}</p>
                          <small>{pin.xPercent.toFixed(2)}% × {pin.yPercent.toFixed(2)}%</small>
                        </div>
                      </button>
                      <button
                        aria-label={`Delete finding ${index + 1}`}
                        className="cw-tester-finding__delete"
                        onClick={() => {
                          setPins((current) => current.filter((item) => item.id !== pin.id));
                          if (highlightedPinId === pin.id) setHighlightedPinId(null);
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <div className="cw-evidence-controls">
                {EVIDENCE_CONTROLS.map((control) => (
                  <button
                    aria-pressed={evidenceKinds.has(control.kind)}
                    className={
                      evidenceKinds.has(control.kind) ? "is-active" : ""
                    }
                    key={control.kind}
                    onClick={() => toggleEvidence(control.kind)}
                    type="button"
                  >
                    <span aria-hidden="true">{control.symbol}</span>
                    {control.label}
                  </button>
                ))}
              </div>
              {evidenceKinds.has("screenshot") ? (
                <label className="cw-field">
                  <span>Screenshot reference</span>
                  <input
                    onChange={(event) =>
                      setScreenshotReference(event.target.value)
                    }
                    placeholder="e.g. Homepage — hero section, 02:14"
                    value={screenshotReference}
                  />
                </label>
              ) : null}
            </section>

            <section className="cw-evidence-section cw-form-fields">
              <div className="cw-evidence-heading">
                <div>
                  <span>04</span>
                  <h2>Written evidence</h2>
                </div>
                <small>Prefilled for a fast demo</small>
              </div>

              <label className="cw-field">
                <span>Issue</span>
                <textarea
                  onChange={(event) => setIssue(event.target.value)}
                  rows={3}
                  value={issue}
                />
              </label>

              <label className="cw-field cw-field--short">
                <span>Severity</span>
                <select
                  onChange={(event) =>
                    setSeverity(event.target.value as typeof severity)
                  }
                  value={severity}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>

              <label className="cw-field">
                <span>What I expected</span>
                <textarea
                  onChange={(event) => setExpected(event.target.value)}
                  rows={2}
                  value={expected}
                />
              </label>

              <label className="cw-field">
                <span>Recommendation</span>
                <textarea
                  onChange={(event) => setRecommendation(event.target.value)}
                  rows={2}
                  value={recommendation}
                />
              </label>

              <label className="cw-field">
                <span>
                  Loom URL <small>Optional</small>
                </span>
                <input
                  onChange={(event) => {
                    setLoomUrl(event.target.value);
                    if (event.target.value) {
                      setEvidenceKinds((current) =>
                        new Set(current).add("loom"),
                      );
                    }
                  }}
                  placeholder="https://www.loom.com/share/…"
                  ref={loomRef}
                  type="url"
                  value={loomUrl}
                />
              </label>
            </section>

            <fieldset className="cw-evidence-section cw-verdicts">
              <legend>
                <span>05</span>
                Final verdict
              </legend>
              <div>
                {VERDICTS.map((option) => (
                  <label key={option.value}>
                    <input
                      checked={verdict === option.value}
                      name="verdict"
                      onChange={() => setVerdict(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {errors.length > 0 ? (
              <div
                className="cw-form-errors"
                ref={formErrorRef}
                role="alert"
                tabIndex={-1}
              >
                <strong>Before submitting:</strong>
                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="cw-submit-bar">
              <div>
                <strong>A$30 · paid by Pinch on approval</strong>
                <span>{submitReason}</span>
              </div>
              <button
                disabled={submitting || !submitReady}
                type="submit"
              >
                {submitting ? "Saving evidence…" : "Submit evidence for review"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
