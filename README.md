# Playground

Playground is a local-first product testing demo. It matches a professional
reviewer with a project, runs a guided test in Browserbase Live View or a
development Chrome extension, turns captured moments into evidence capsules,
collects an expert verdict, and produces a founder-facing report.

The live Browserbase integration remains intentionally narrow: credentials and
automation stay on the server, while only the session ID, Live View URL, and a
bounded first-screen scan reach the client.

## Prerequisites

- Node.js `>=22.13.0`
- A Browserbase account and API key
- A Pinch Developer account with sandbox application credentials

Browserbase resolves the associated project from the API key. No project ID is
required or supported by this integration.

## Local setup

1. Create a [Browserbase account](https://www.browserbase.com/).
2. Copy your Browserbase API key.
3. Add it to the existing `.env.local` file:

   ```env
   BROWSERBASE_API_KEY=your_real_key_here
   ```

   Never prefix this value with `NEXT_PUBLIC_`. `.env.local` is ignored by Git,
   while `.env.example` contains only an empty placeholder.

4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000/tester](http://localhost:3000/tester) (use the
   alternate port printed by Next.js if 3000 is busy).
7. Open the Ingen assignment, accept it, and choose **Secure cloud browser**.
8. Launch `https://ingen-hrandstudent-5.vercel.app`.
9. Complete the guided tasks, save feedback, and end the Browserbase session.
10. Review the evidence, complete the expert verdict, and submit the demo test.

The original focused integration remains available at
[http://localhost:3000/browser-lab](http://localhost:3000/browser-lab).

## Chrome extension development mode

The `extension/` directory contains an unpacked Manifest V3 extension for the
Ingen demo.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose the repository’s `extension` folder.
4. Choose **Chrome extension** from the Ingen mode selection screen.

The extension is restricted to the Playground deployment/local development and
the Ingen demo origin. It captures a screenshot only after an explicit tester
click and stores evidence in `chrome.storage.local`. It is not published to the
Chrome Web Store.

## Verification commands

```bash
npm run typecheck
npm run lint
npm run test:unit
npm test
npm run build
```

## Data and demo boundaries

- Cloud browser sessions can incur Browserbase usage costs.
- Keep-alive sessions must be stopped explicitly.
- A refresh may lose the active Live View handle and leave a cloud browser alive
  until its 15-minute timeout, although the product session itself is recovered.
- The initial Playwright scan is intentionally basic and bounded.
- Reviewer, assignment, task, feedback, evidence, verdict, submission, and
  earnings records are stored locally in IndexedDB with Dexie. There is no
  backend account or cross-device sync.
- Ingen is the one functional live test. Orchestra is explicitly marked as a
  demo brief with no product URL.
- Seeded founder findings are labelled demo evidence; local tester captures are
  counted separately.
- Browserbase journey tracking keeps a client-side history across serverless
  API invocations and can be reinforced with **Mark current**.
- The Scout research adapter is deterministic in this build. A provider-backed
  adapter is an explicit future extension point and is never impersonated.
- Rewards remain **pending** demo records. No payout or payment is transferred.
- Session ZIP export is manual and local.
- Navigation may fail while Live View remains usable for manual interaction.
- Authentication, production extension distribution, autonomous browser
  control, and payment features beyond the single Pinch sandbox Payment Link
  are intentionally out of scope.

## Hackathon demo handoff

### Product summary

Playground lets a founder fund one focused product-validation campaign, uses
Scout to inspect the founder-authorised product, collects one structured live
demo submission, and turns the combined evidence into three fixes and a launch
decision. The final activation ledger is a labelled prototype showing how
relevant testers could become founding users.

### Demo journey

Use this route order for the 120-second recording:

1. `/`
2. `/founder/new`
3. Pinch-hosted sandbox Payment Link
4. `/payment/return?campaign=cmp_001&paymentLinkId=…&paymentId=…`
5. `/campaigns/cmp_001/scout`
6. `/tester/campaigns/cmp_001`
7. `/campaigns/cmp_001/results`
8. `/campaigns/cmp_001/founding-users`

The founder form is prefilled with INGEN and the A$199 package. The hidden
development reset is available only when `?demoControls=true` is added to a
local URL; it is omitted from normal pitch-video routes.

### Pinch integration architecture

The browser submits the fixed A$199 package to
`POST /api/pinch/create-checkout`. The server authenticates with Pinch, creates
or resolves the payer, creates a sandbox Payment Link, and returns only the
hosted URL and safe Pinch identifiers. Pinch redirects back with
`paymentLinkId` and `paymentId`.

`GET /api/pinch/verify-payment` performs fresh server-side lookups for both the
Payment and the Payment Link. A campaign activates only when the Payment has a
funded status and both records match the A$199 amount, payer and `cmp_001`
metadata. The Payment Link identifier is also compared when Pinch includes it
on the Payment record. Redirect parameters alone never activate a campaign.
Credentials and access tokens stay server-side.

### Environment variables

```env
BROWSERBASE_API_KEY=
PINCH_APPLICATION_ID=
PINCH_APPLICATION_SECRET=
PINCH_API_BASE_URL=https://api.getpinch.com.au/test
PINCH_AUTH_URL=https://auth.getpinch.com.au/connect/token
PINCH_TEST_MODE=true
PINCH_MOCK_MODE=false
NEXT_PUBLIC_APP_URL=http://localhost:5198
```

Never expose `BROWSERBASE_API_KEY`, `PINCH_APPLICATION_ID`, or
`PINCH_APPLICATION_SECRET` with a `NEXT_PUBLIC_` prefix.

### Sandbox testing instructions

1. Keep `PINCH_API_BASE_URL` on `/test` and `PINCH_MOCK_MODE=false`.
2. Start Playground on port 5198 so it matches `NEXT_PUBLIC_APP_URL`.
3. Launch the campaign and continue to the Pinch-hosted Payment Link.
4. Use Pinch test card `4242 4242 4242 4242`, any future expiry date, and any
   CVC value.
5. Complete checkout and allow Pinch to redirect to `/payment/return`.
6. Confirm the page reports the sandbox transaction, the real returned Pinch
   identifiers, and campaign status `LIVE`.

Pinch test card details are documented in the official
[Test and Live Mode guide](https://docs.getpinch.com.au/docs/test-and-live-mode).

### Real versus seeded data explanation

- The sandbox payer, Payment Link, payment and payment status are real Pinch
  test-environment records when `PINCH_MOCK_MODE=false`.
- Scout’s first-screen scan is produced by the current Browserbase session for
  `https://www.ingenworkspace.com`.
- A `live_demo` tester submission is created only after the tester submits the
  evidence form.
- Exactly four `seeded_demo` submissions are persisted for `cmp_001` and every
  rendered seeded record is labelled **Seeded demo data**.
- Seeded reward records use manual-review states and never represent a
  completed transfer.
- The founding-user ledger is labelled **Prototype activation ledger**.

Campaign and tester-submission demo state is stored locally in IndexedDB using
the repository’s existing Dexie database, so the route journey survives a
browser refresh on the same device.

### Unsupported features deliberately excluded

- Pinch-based sign-in or identity claims
- Stored-value balances or withdrawal flows
- Automated tester or referral transfers
- Escrow, subscriptions or recurring billing
- Full marketplace, chat, admin tooling or tester profiles
- Session recording
- Cross-device accounts or production persistence

### Local setup commands

```bash
npm install
npm run dev -- -p 5198
```

Then open `http://localhost:5198/`.

### Build and deployment commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run start -- -p 5198
```

For a hosted deployment, set the same server-side environment variables in the
host, change `NEXT_PUBLIC_APP_URL` to the public HTTPS origin, build, and deploy
the Next.js application with the project’s normal hosting workflow.
