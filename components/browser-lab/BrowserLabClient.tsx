"use client";

import { TesterSidebar } from "@/components/browser-lab/TesterSidebar";
import { TesterWorkspace } from "@/components/browser-lab/TesterWorkspace";
import { useRemoteBrowserSession } from "@/components/browser-lab/useRemoteBrowserSession";

const DEFAULT_URL = "https://ingen-hrandstudent-5.vercel.app";

export function BrowserLabClient({
  browserbaseConfigured,
  defaultUrl = DEFAULT_URL,
  productSessionId,
}: {
  browserbaseConfigured: boolean;
  defaultUrl?: string;
  productSessionId?: string;
}) {
  const browser = useRemoteBrowserSession({
    browserbaseConfigured,
    defaultUrl,
    productSessionId,
  });

  return (
    <main className="browser-lab">
      <TesterSidebar
        browserbaseConfigured={browser.browserbaseConfigured}
        error={browser.error}
        errorRef={browser.errorRef}
        onLaunch={browser.handleLaunch}
        onStop={browser.handleStop}
        onUrlChange={browser.setUrl}
        onViewportChange={browser.setViewport}
        productSessionId={productSessionId}
        session={browser.session}
        status={browser.status}
        url={browser.url}
        viewport={browser.viewport}
      />
      <TesterWorkspace
        error={browser.error}
        onDisconnect={browser.handleDisconnect}
        onStop={browser.handleStop}
        progressMessage={browser.progressMessage}
        productSessionId={productSessionId}
        session={browser.session}
        startedAt={browser.startedAt}
        status={browser.status}
      />
    </main>
  );
}
