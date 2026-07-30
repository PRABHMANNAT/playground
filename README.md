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
- Authentication, databases, production extension distribution, payments, and
  autonomous browser control are intentionally out of scope.
