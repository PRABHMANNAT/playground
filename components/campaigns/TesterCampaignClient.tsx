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
    if (!evidenceKinds.has("confusion")) {
      nextErrors.push("Mark at least one confusing moment.");
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
        rewardAmount: 20,
        rewardStatus: "reserved",
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
            <span>Reserved reward</span>
            <strong>A$20</strong>
            <small>Quality review required</small>
          </div>
        </section>

        <dl className="cw-metadata cw-metadata--tester">
          <div>
            <dt>Product</dt>
            <dd>INGEN</dd>
          </div>
          <div>
            <dt>Reward</dt>
            <dd>A$20</dd>
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
          <p className="cw-reserved-note cw-reserved-note--blocked" role="alert">
            <span aria-hidden="true">!</span>
            This validation run is not active. Complete the verified Pinch sandbox
            payment before submitting evidence.
          </p>
        ) : (
          <p className="cw-reserved-note">
            <span aria-hidden="true">◇</span>
            Reward is reserved from the funded validation run. Initial tester payouts
            are manually reviewed.
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
                  <h2>Evidence controls</h2>
                </div>
                <small>Choose what applies</small>
              </div>
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
                <strong>A$20 reserved</strong>
                <span>Quality review follows submission</span>
              </div>
              <button
                disabled={submitting || campaignReady !== true}
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
