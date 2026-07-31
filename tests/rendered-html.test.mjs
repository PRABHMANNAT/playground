import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Landing hero scrolls from the local sunset into the Australia ASCII scene", async () => {
  const [landing, canvas, styles, sunsetAsset, australiaAsset] = await Promise.all([
    readFile(new URL("components/landing/LandingPage.tsx", root), "utf8"),
    readFile(
      new URL("components/landing/SunsetAsciiCanvas.tsx", root),
      "utf8",
    ),
    readFile(new URL("app/landing.css", root), "utf8"),
    readFile(new URL("public/ascii-sunset.webp", root)),
    readFile(new URL("public/australia-ascii-reference.webp", root)),
  ]);

  assert.match(landing, /<SunsetAsciiCanvas \/>/);
  assert.match(landing, /src="\/playground-logo\.png"/);
  assert.match(landing, /Powered by/);
  assert.match(landing, /PinchPayments/);
  assert.match(landing, /For founding users/);
  assert.match(landing, /landing-hero__reveal/);
  assert.doesNotMatch(landing, /Australia-first validation|Scroll to reveal/);
  assert.doesNotMatch(landing, /landing-horizon-beam|landing-scroll-cue/);
  assert.match(canvas, /getContext\("2d"/);
  assert.match(canvas, /image\.src = "\/ascii-sunset\.webp"/);
  assert.match(
    canvas,
    /australiaImage\.src = "\/australia-ascii-reference\.webp"/,
  );
  assert.match(canvas, /scrollProgress/);
  assert.match(canvas, /character: "0" \| "1"/);
  assert.match(canvas, /shimmerHead/);
  assert.match(canvas, /driftStrength/);
  assert.match(canvas, /prefers-reduced-motion/);
  assert.match(canvas, /requestAnimationFrame/);
  assert.doesNotMatch(canvas, /https:\/\/21st\.dev/);
  assert.match(styles, /\.landing-ascii canvas/);
  assert.match(styles, /\.landing-ascii__sticky/);
  assert.doesNotMatch(styles, /\.landing-horizon-beam|\.landing-scroll-cue/);
  assert.match(styles, /\.landing-btn--primary[\s\S]*background: #de7356/);
  assert.match(
    styles,
    /backdrop-filter: blur\(24px\) saturate\(1\.35\) brightness\(0\.72\)/,
  );
  assert.match(styles, /\.landing-hero h1[\s\S]*color: #fff/);
  assert.ok(
    sunsetAsset.length > 80_000,
    "expected the local sunset WebP source asset",
  );
  assert.ok(
    australiaAsset.length > 150_000,
    "expected the local Australia ASCII reference asset",
  );
});

test("Tester Workspace keeps the live browser contract and tester UI", async () => {
  const [client, sidebar, workspace, screensRoute, page] = await Promise.all([
    readFile(new URL("components/browser-lab/BrowserLabClient.tsx", root), "utf8"),
    readFile(new URL("components/browser-lab/TesterSidebar.tsx", root), "utf8"),
    readFile(
      new URL("components/browser-lab/TesterWorkspace.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("app/api/browser/session/screens/route.ts", root),
      "utf8",
    ),
    readFile(new URL("app/browser-lab/page.tsx", root), "utf8"),
  ]);

  assert.match(client, /https:\/\/ingen-hrandstudent-5\.vercel\.app/);
  assert.match(sidebar, /Playground/);
  assert.match(sidebar, /Tester workspace/);
  assert.match(sidebar, /How does this feel\?/);
  assert.match(workspace, /completeSessionTask/);
  assert.match(workspace, /activeTask\.sequence/);
  assert.match(workspace, /Screens visited/);
  assert.match(workspace, /Mark current/);
  assert.match(screensRoute, /refreshVisitedScreens/);
  assert.match(workspace, /Your product will appear here/);
  assert.match(workspace, /Connecting the first live frame/);
  assert.match(workspace, /sandbox="allow-same-origin allow-scripts"/);
  assert.match(workspace, /clipboard-read; clipboard-write/);
  assert.match(page, /Tester Workspace/);
});

test("Product routes persist evidence and keep extension behavior explicit", async () => {
  const [product, database, manifest, overlay, home, globalStyles] =
    await Promise.all([
      readFile(new URL("components/product/TesterProduct.tsx", root), "utf8"),
      readFile(new URL("lib/product/db.ts", root), "utf8"),
      readFile(new URL("extension/manifest.json", root), "utf8"),
      readFile(new URL("extension/product-overlay.js", root), "utf8"),
      readFile(new URL("app/page.tsx", root), "utf8"),
      readFile(new URL("app/globals.css", root), "utf8"),
    ]);

  assert.match(product, /Ingen prototype teardown/);
  assert.match(product, /Expert verdict/);
  assert.match(product, /PLAYGROUND_EXTENSION_REQUEST_EXPORT/);
  assert.match(database, /playground-tester/);
  assert.match(database, /saveFeedbackCapture/);
  assert.match(database, /declineProject/);
  assert.match(database, /submitSession/);
  assert.match(manifest, /manifest_version/);
  assert.match(overlay, /PLAYGROUND_CAPTURE_SCREENSHOT/);
  assert.match(home, /<LandingPage \/>/);
  assert.match(globalStyles, /overflow-y: auto/);
  assert.match(globalStyles, /body:has\(\.browser-lab\)/);
});

test("Browserbase credentials remain server-only and project-free", async () => {
  const [environment, readme, serverClient, client] = await Promise.all([
    readFile(new URL(".env.example", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("lib/browser/server/browserbase.ts", root), "utf8"),
    readFile(new URL("components/browser-lab/BrowserLabClient.tsx", root), "utf8"),
  ]);

  // Every credential placeholder must stay empty. Checked by shape rather
  // than exact file contents so adding a provider cannot silently ship a key.
  const credentialLines = environment
    .split("\n")
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .filter((line) => /_(KEY|SECRET|TOKEN|PASSWORD|ID)=/.test(line));
  assert.ok(
    credentialLines.length >= 3,
    "expected .env.example to list the credential placeholders",
  );
  for (const line of credentialLines) {
    assert.match(line, /=$/, `${line} must not carry a value in .env.example`);
  }
  assert.match(readme, /No project ID is\s+required/);
  assert.match(serverClient, /process\.env\.BROWSERBASE_API_KEY/);
  assert.doesNotMatch(
    client,
    /NEXT_PUBLIC_BROWSERBASE_API_KEY|connectUrl|signingKey|bb_(live|test)_/i,
  );
  assert.doesNotMatch(
    environment + readme + serverClient + client,
    /BROWSERBASE_PROJECT_ID/,
  );
  assert.doesNotMatch(environment + serverClient + client, /bb_(live|test)_/i);
});

test("Pinch verification binds payment, link, amount, payer and campaign server-side", async () => {
  const [verifyRoute, pinchClient, paymentReturn] = await Promise.all([
    readFile(
      new URL("app/api/pinch/verify-payment/route.ts", root),
      "utf8",
    ),
    readFile(new URL("lib/pinch/client.ts", root), "utf8"),
    readFile(
      new URL("components/payment/PaymentReturn.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(verifyRoute, /campaignId: identifier\("campaignId"\)/);
  assert.match(paymentReturn, /new URLSearchParams\(\{[\s\S]*campaignId/);
  assert.match(pinchClient, /payment-links\/\$\{encodeURIComponent\(paymentLinkId\)\}/);
  assert.match(pinchClient, /payerMatches/);
  assert.match(pinchClient, /metadataMatches/);
  assert.match(pinchClient, /amountInCents === expectedAmount/);
  assert.match(pinchClient, /"pinch-version": "2020\.1"/);
});

test("Funded Scout and tester campaign screens keep the payment-to-evidence contract", async () => {
  const [scout, tester, browserSurface, browserHook, campaignStore, database] =
    await Promise.all([
      readFile(
        new URL("components/campaigns/ScoutCampaignClient.tsx", root),
        "utf8",
      ),
      readFile(
        new URL("components/campaigns/TesterCampaignClient.tsx", root),
        "utf8",
      ),
      readFile(
        new URL("components/campaigns/ProductBrowserSurface.tsx", root),
        "utf8",
      ),
      readFile(
        new URL(
          "components/browser-lab/useRemoteBrowserSession.ts",
          root,
        ),
        "utf8",
      ),
      readFile(new URL("lib/campaign/store.ts", root), "utf8"),
      readFile(new URL("lib/product/db.ts", root), "utf8"),
    ]);

  assert.match(scout, /Funded through Pinch · Campaign active/);
  assert.match(scout, /https:\/\/www\.ingenworkspace\.com/);
  assert.match(scout, /AI-generated prototype analysis/);
  assert.match(scout, /Open tester mission/);
  assert.match(browserSurface, /Fallback preview — not live/);
  assert.match(browserHook, /\/api\/browser\/session/);
  assert.match(tester, /Reward is reserved from the funded campaign/);
  assert.match(tester, /Positive feedback is not required/);
  assert.match(tester, /Submit evidence for review/);
  assert.match(campaignStore, /sub_\$\{crypto\.randomUUID\(\)\}/);
  assert.match(campaignStore, /Quality review pending/);
  assert.match(campaignStore, /rewardAmount: 20/);
  assert.match(campaignStore, /rewardStatus: "reserved"/);
  assert.equal(
    (campaignStore.match(/sourceType: "seeded_demo"/g) ?? []).length,
    4,
  );
  assert.doesNotMatch(
    campaignStore.match(
      /const SEEDED_SUBMISSIONS[\s\S]*?type LegacyCampaign/,
    )?.[0] ?? "",
    /rewardStatus: "paid"/,
  );
  assert.match(database, /campaignSubmissions/);
});

test("Founder results separate live evidence from seeded data and activation stays manual", async () => {
  const [results, activation, resultsPage, activationPage] = await Promise.all([
    readFile(
      new URL("components/campaigns/CampaignResultsHandoff.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("components/campaigns/FoundingUsersClient.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("app/campaigns/[id]/results/page.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("app/campaigns/[id]/founding-users/page.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(results, /MODIFY BEFORE LAUNCH/);
  assert.match(results, /AI creates the test and organises evidence/);
  assert.match(results, /One live submission and three seeded examples/);
  assert.match(results, /Seeded demo data/);
  assert.match(results, /Live demo submission/);
  assert.match(results, /Launch founding-user campaign/);
  assert.match(resultsPage, /CampaignResultsHandoff/);

  assert.match(activation, /Prototype activation ledger/);
  assert.match(activation, /reward\s+approval is currently manual/);
  assert.match(activation, /Turn testers into founding users/);
  assert.match(activation, /Paid conversion requires founder confirmation/);
  assert.match(activation, /Founding-user pool/);
  assert.doesNotMatch(
    activation,
    /Redeem through Pinch|Pinch wallet balance|Automated payout completed|Escrow|Real referral withdrawal|KYC/i,
  );
  assert.match(activationPage, /FoundingUsersClient/);
});
