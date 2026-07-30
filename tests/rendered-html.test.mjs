import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

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
