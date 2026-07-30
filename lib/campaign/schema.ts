import { z } from "zod";

import { browserUrlSchema } from "@/lib/browser/url-validation";
import type {
  CampaignFormErrors,
  CampaignFormField,
  CampaignFormValues,
} from "@/lib/campaign/types";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

/**
 * One schema for both sides. The client uses it for inline validation; the
 * route handler re-parses the same shape because client validation is a
 * convenience, never a trust boundary.
 */
export const campaignFormSchema = z.object({
  founderName: requiredText("Founder name", 120),
  founderEmail: z
    .string()
    .trim()
    .min(1, "Founder email is required.")
    .max(200, "Founder email must be 200 characters or fewer.")
    .pipe(z.email("Enter a valid email address.")),
  companyName: requiredText("Company name", 120),
  productUrl: browserUrlSchema,
  validationQuestion: z
    .string()
    .trim()
    .min(12, "Ask a question of at least 12 characters.")
    .max(240, "Keep the question to 240 characters or fewer."),
  audienceRole: requiredText("Role", 80),
  audienceLocation: requiredText("Location", 80),
  audienceExperience: requiredText("Experience", 80),
  audienceBehaviour: requiredText("Current behaviour", 120),
  testerCount: z.coerce
    .number()
    .int("Number of testers must be a whole number.")
    .min(1, "At least one tester is required.")
    .max(20, "This package supports up to 20 testers."),
});

export type CampaignFormInput = z.input<typeof campaignFormSchema>;

/** Flattens a zod failure into one message per field, in field order. */
export function collectFormErrors(error: z.ZodError): CampaignFormErrors {
  const errors: CampaignFormErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as CampaignFormField] = issue.message;
    }
  }
  return errors;
}

export function validateCampaignForm(
  values: CampaignFormValues,
):
  | { success: true; values: CampaignFormValues }
  | { success: false; errors: CampaignFormErrors } {
  const parsed = campaignFormSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, errors: collectFormErrors(parsed.error) };
  }
  return { success: true, values: parsed.data };
}
