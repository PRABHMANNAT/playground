"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import {
  DEMO_CAMPAIGN_FORM,
  FIRST_FIVE_PACKAGE,
  SEEDED_AUDIENCE_ESTIMATE,
  formatAud,
} from "@/lib/campaign/package";
import { validateCampaignForm } from "@/lib/campaign/schema";
import {
  createDraftCampaign,
  recordPinchCheckout,
  setCampaignStatus,
} from "@/lib/campaign/store";
import type {
  CampaignFormErrors,
  CampaignFormField,
  CampaignFormValues,
} from "@/lib/campaign/types";
import type {
  CreateCheckoutResult,
  PinchApiErrorBody,
} from "@/lib/pinch/types";

type SubmitState = "idle" | "submitting" | "error" | "mock";

const FIELD_ORDER: CampaignFormField[] = [
  "founderName",
  "founderEmail",
  "companyName",
  "productUrl",
  "validationQuestion",
  "audienceRole",
  "audienceLocation",
  "audienceExperience",
  "audienceBehaviour",
];

export function CampaignForm() {
  const [values, setValues] = useState<CampaignFormValues>(DEMO_CAMPAIGN_FORM);
  const [errors, setErrors] = useState<CampaignFormErrors>({});
  const [state, setState] = useState<SubmitState>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [mockResult, setMockResult] = useState<CreateCheckoutResult | null>(
    null,
  );
  // Retrying reuses the campaign created on the first attempt instead of
  // leaving an orphaned draft behind for every failed checkout.
  const campaignIdRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submitting = state === "submitting";
  const pricing = FIRST_FIVE_PACKAGE.pricing;

  const update = (field: CampaignFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!(field in current)) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const focusFirstError = (found: CampaignFormErrors) => {
    const field = FIELD_ORDER.find((candidate) => found[candidate]);
    if (!field) {
      return;
    }
    formRef.current
      ?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${field}`)
      ?.focus();
  };

  const startCheckout = async () => {
    const validation = validateCampaignForm(values);
    if (!validation.success) {
      setErrors(validation.errors);
      setState("idle");
      setFailure(null);
      focusFirstError(validation.errors);
      return;
    }

    setErrors({});
    setFailure(null);
    setState("submitting");

    try {
      if (!campaignIdRef.current) {
        const draft = await createDraftCampaign(validation.values);
        campaignIdRef.current = draft.id;
      }
      const campaignId = campaignIdRef.current;

      await setCampaignStatus(campaignId, "payment_pending");

      const response = await fetch("/api/pinch/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          founderName: validation.values.founderName,
          founderEmail: validation.values.founderEmail,
          amount: pricing.campaignFunding,
        }),
      });

      const payload = (await response.json()) as
        | CreateCheckoutResult
        | PinchApiErrorBody;

      if (!response.ok || "error" in payload) {
        const message =
          "error" in payload
            ? payload.error.message
            : "Playground could not start the Pinch checkout.";
        // Return the campaign to draft so a retry starts from a clean state.
        await setCampaignStatus(campaignId, "draft");
        setFailure(message);
        setState("error");
        return;
      }

      await recordPinchCheckout(campaignId, {
        payerId: payload.payerId,
        paymentLinkId: payload.paymentLinkId,
        hostedUrl: payload.checkoutUrl,
      });

      if (payload.mock) {
        // Mock mode never pretends a Pinch transaction happened. Show what
        // would have been sent and let the founder choose to continue.
        setMockResult(payload);
        setState("mock");
        return;
      }

      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      console.error("Checkout could not be started", error);
      if (campaignIdRef.current) {
        await setCampaignStatus(campaignIdRef.current, "draft");
      }
      setFailure(
        "Playground could not reach the checkout service. Check your connection and try again.",
      );
      setState("error");
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void startCheckout();
  };

  const fieldProps = (field: CampaignFormField) => ({
    id: field,
    name: field,
    value: String(values[field]),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => update(field, event.target.value),
  });

  const fieldError = (field: CampaignFormField) =>
    errors[field] ? (
      <p className="founder-field__error" id={`${field}-error`}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <form className="founder-form" onSubmit={onSubmit} ref={formRef} noValidate>
      <div className="founder-columns">
        <div className="founder-sections">
          <section className="founder-card" aria-labelledby="section-product">
            <p className="founder-card__step">Section 1</p>
            <h2 id="section-product">Product</h2>
            <div className="founder-grid">
              <div className="founder-field">
                <label htmlFor="founderName">Founder name</label>
                <input type="text" autoComplete="name" {...fieldProps("founderName")} />
                {fieldError("founderName")}
              </div>
              <div className="founder-field">
                <label htmlFor="founderEmail">Founder email</label>
                <input
                  type="email"
                  autoComplete="email"
                  {...fieldProps("founderEmail")}
                />
                {fieldError("founderEmail")}
              </div>
              <div className="founder-field">
                <label htmlFor="companyName">Company name</label>
                <input
                  type="text"
                  autoComplete="organization"
                  {...fieldProps("companyName")}
                />
                {fieldError("companyName")}
              </div>
              <div className="founder-field">
                <label htmlFor="productUrl">Product URL</label>
                <input
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  {...fieldProps("productUrl")}
                />
                {fieldError("productUrl")}
              </div>
            </div>
          </section>

          <section className="founder-card" aria-labelledby="section-decision">
            <p className="founder-card__step">Section 2</p>
            <h2 id="section-decision">Decision</h2>
            <div className="founder-field">
              <label htmlFor="validationQuestion">
                What do you need to learn?
              </label>
              <textarea rows={3} {...fieldProps("validationQuestion")} />
              <p className="founder-field__hint">
                Ask one question that could change your launch decision.
              </p>
              {fieldError("validationQuestion")}
            </div>
          </section>

          <section className="founder-card" aria-labelledby="section-audience">
            <p className="founder-card__step">Section 3</p>
            <h2 id="section-audience">Audience</h2>
            <div className="founder-grid">
              <div className="founder-field">
                <label htmlFor="audienceRole">Role</label>
                <input type="text" {...fieldProps("audienceRole")} />
                {fieldError("audienceRole")}
              </div>
              <div className="founder-field">
                <label htmlFor="audienceLocation">Location</label>
                <input type="text" {...fieldProps("audienceLocation")} />
                {fieldError("audienceLocation")}
              </div>
              <div className="founder-field">
                <label htmlFor="audienceExperience">Experience</label>
                <input type="text" {...fieldProps("audienceExperience")} />
                {fieldError("audienceExperience")}
              </div>
              <div className="founder-field">
                <label htmlFor="audienceBehaviour">Current behaviour</label>
                <input type="text" {...fieldProps("audienceBehaviour")} />
                {fieldError("audienceBehaviour")}
              </div>
              <div className="founder-field">
                <label htmlFor="testerCount">Number of testers</label>
                <input
                  id="testerCount"
                  name="testerCount"
                  type="text"
                  value={values.testerCount}
                  readOnly
                  aria-describedby="testerCount-hint"
                />
                <p className="founder-field__hint" id="testerCount-hint">
                  Fixed by the First Five Useful Users package.
                </p>
              </div>
            </div>
            <p className="founder-estimate">
              <span>
                Estimated matched audience
                <strong>{SEEDED_AUDIENCE_ESTIMATE}</strong>
              </span>
              <span className="founder-tag">Seeded demo estimate</span>
            </p>
          </section>
        </div>

        <aside className="founder-aside">
          <section className="founder-card" aria-labelledby="section-package">
            <p className="founder-card__step">Section 4</p>
            <h2 id="section-package">Package</h2>

            <div className="founder-package">
              <div className="founder-package__head">
                <strong>{FIRST_FIVE_PACKAGE.name}</strong>
                <span className="founder-tag founder-tag--selected">
                  Selected
                </span>
              </div>
              <ul className="founder-package__list">
                {FIRST_FIVE_PACKAGE.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="founder-package__price">
                {formatAud(pricing.campaignFunding)}
              </p>
            </div>

            <h3 className="founder-summary__title">Order summary</h3>
            <dl className="founder-summary">
              <div>
                <dt>Campaign funding</dt>
                <dd>{formatAud(pricing.campaignFunding)}</dd>
              </div>
              <div>
                <dt>Tester reward pool</dt>
                <dd>{formatAud(pricing.testerRewardPool)}</dd>
              </div>
              <div>
                <dt>Founding-user pool</dt>
                <dd>{formatAud(pricing.foundingUserPool)}</dd>
              </div>
              <div>
                <dt>Playground gross margin</dt>
                <dd>
                  {formatAud(pricing.grossMargin)}
                  <small>before Pinch fees</small>
                </dd>
              </div>
            </dl>

            {state === "mock" && mockResult ? (
              <div className="founder-mock" role="status">
                <span className="founder-tag founder-tag--mock">
                  Mock mode — no Pinch request was made
                </span>
                <p>
                  <code>PINCH_MOCK_MODE</code> is on, so Playground generated
                  placeholder identifiers instead of calling Pinch. No payment
                  exists and no money moved.
                </p>
                <dl className="founder-mock__ids">
                  <div>
                    <dt>Payer</dt>
                    <dd>{mockResult.payerId}</dd>
                  </div>
                  <div>
                    <dt>Payment link</dt>
                    <dd>{mockResult.paymentLinkId}</dd>
                  </div>
                </dl>
                <a
                  className="founder-btn founder-btn--secondary founder-btn--mock"
                  href={mockResult.checkoutUrl}
                >
                  Continue to the mock return URL
                </a>
              </div>
            ) : null}

            {state === "error" && failure ? (
              <div className="founder-alert" role="alert">
                <strong>Checkout could not be created</strong>
                <p>{failure}</p>
                <button
                  type="button"
                  className="founder-btn founder-btn--secondary"
                  onClick={() => void startCheckout()}
                >
                  Retry
                </button>
              </div>
            ) : null}

            <button
              type="submit"
              className="founder-btn founder-btn--primary"
              disabled={submitting}
            >
              {submitting
                ? "Creating secure Pinch checkout…"
                : "Fund campaign with Pinch"}
            </button>

            <p className="founder-note" aria-live="polite">
              {submitting
                ? "Creating secure Pinch checkout…"
                : "Sandbox transaction. Payment is handled on Pinch's hosted checkout."}
            </p>
            <p className="founder-note founder-note--quiet">
              Campaign stays in draft until Pinch confirms the payment.{" "}
              <Link href="/">Back to overview</Link>
            </p>
          </section>
        </aside>
      </div>
    </form>
  );
}
