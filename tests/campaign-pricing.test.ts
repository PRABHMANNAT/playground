import assert from "node:assert/strict";
import test from "node:test";

// package.ts only carries type-only imports, so it runs under node --test
// without needing the "@/" path alias to be resolved at runtime.
import {
  CAMPAIGN_PRICING,
  RUN_PRICING,
  calculateRunSplit,
  DEMO_CAMPAIGN_FORM,
  FIRST_FIVE_PACKAGE,
  PACKAGE_TESTER_COUNT,
  SEEDED_AUDIENCE_ESTIMATE,
  formatAud,
  toCents,
} from "../lib/campaign/package.ts";

test("the run split recalculates exactly from three to eight testers", () => {
  for (
    let testerCount = RUN_PRICING.minTesters;
    testerCount <= RUN_PRICING.maxTesters;
    testerCount += 1
  ) {
    const split = calculateRunSplit(testerCount);
    assert.equal(split.total, testerCount * 40);
    assert.equal(split.testers, testerCount * 30);
    assert.equal(split.playground, testerCount * 10);
    assert.equal(split.applicationFee, testerCount * 1_000);
    assert.equal(split.testers + split.playground, split.total);
  }
});

test("the order summary splits the campaign price exactly", () => {
  const { campaignFunding, testerRewardPool, foundingUserPool, grossMargin } =
    CAMPAIGN_PRICING;

  assert.equal(campaignFunding, 200);
  assert.equal(testerRewardPool, 150);
  assert.equal(foundingUserPool, 0);
  assert.equal(grossMargin, 50);
  assert.equal(
    testerRewardPool + foundingUserPool + grossMargin,
    campaignFunding,
    "the three pools must account for the whole campaign price",
  );
  assert.equal(CAMPAIGN_PRICING.currency, "AUD");
});

test("Pinch receives the price in cents", () => {
  assert.equal(toCents(CAMPAIGN_PRICING.campaignFunding), 20_000);
  assert.equal(formatAud(CAMPAIGN_PRICING.campaignFunding), "A$200");
});

test("only one package exists and it matches the brief", () => {
  assert.equal(FIRST_FIVE_PACKAGE.name, "First Five Useful Users");
  assert.deepEqual(FIRST_FIVE_PACKAGE.includes, [
    "AI Scout product analysis",
    "Five matched users",
    "Structured tester tasks",
    "Written or Loom evidence",
    "Three recommended fixes",
    "Ship, Modify or Kill verdict",
  ]);
  assert.equal(PACKAGE_TESTER_COUNT, 5);
});

test("the demo campaign is pre-filled with the Ingen brief", () => {
  assert.equal(DEMO_CAMPAIGN_FORM.companyName, "INGEN");
  assert.equal(DEMO_CAMPAIGN_FORM.productUrl, "https://www.ingenworkspace.com");
  assert.equal(
    DEMO_CAMPAIGN_FORM.validationQuestion,
    "Can a recruiter understand the product and request a demo?",
  );
  assert.equal(DEMO_CAMPAIGN_FORM.testerCount, PACKAGE_TESTER_COUNT);
  assert.equal(SEEDED_AUDIENCE_ESTIMATE, 24);
});
