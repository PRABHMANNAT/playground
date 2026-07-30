"use client";

import {
  BrowserLoadingState,
  RemoteBrowserView,
} from "@/components/browser-lab/TesterWorkspace";
import type {
  BrowserSessionResponse,
  SessionStatus,
} from "@/lib/browser/types";

interface ProductBrowserSurfaceProps {
  status: SessionStatus;
  progressMessage: string;
  error: string | null;
  session: BrowserSessionResponse | null;
  productUrl: string;
  onDisconnect: () => void;
  onRetry: () => void;
  compact?: boolean;
}

function FallbackPreview({
  error,
  productUrl,
  onRetry,
}: Pick<ProductBrowserSurfaceProps, "error" | "productUrl" | "onRetry">) {
  return (
    <div className="cw-fallback">
      <div className="cw-fallback__notice" role={error ? "alert" : "status"}>
        <span>Fallback preview — not live</span>
        <p>
          {error ??
            "The remote browser has not started. This labelled preview is only a visual reference."}
        </p>
        <div>
          <button onClick={onRetry} type="button">
            Retry connection
          </button>
          <a href={productUrl} rel="noreferrer" target="_blank">
            Open authorised URL ↗
          </a>
        </div>
      </div>

      <div aria-label="Static INGEN fallback preview" className="cw-ingen-preview">
        <header>
          <strong>INGEN</strong>
          <nav aria-label="Preview navigation">
            <span>Product</span>
            <span>How it works</span>
            <span>For recruiters</span>
          </nav>
          <span className="cw-ingen-preview__action">Request a demo</span>
        </header>
        <div className="cw-ingen-preview__hero">
          <p>PROOF-FIRST HIRING</p>
          <h2>See what candidates can do before you decide.</h2>
          <span>
            A static continuity preview of the authorised product. Interactions
            are disabled until the remote browser connects.
          </span>
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductBrowserSurface({
  status,
  progressMessage,
  error,
  session,
  productUrl,
  onDisconnect,
  onRetry,
  compact = false,
}: ProductBrowserSurfaceProps) {
  const isLive = status === "connected" || status === "stopping";

  return (
    <section
      className={`cw-browser ${compact ? "cw-browser--compact" : ""}`}
      aria-label="Product browser"
    >
      <header className="cw-browser__bar">
        <div>
          <span
            aria-hidden="true"
            className={`cw-browser__dot ${isLive ? "cw-browser__dot--live" : ""}`}
          />
          <strong>{session?.hostname ?? "www.ingenworkspace.com"}</strong>
          <span
            className={`cw-browser__status ${isLive ? "cw-browser__status--live" : ""}`}
          >
            {isLive ? "Live session" : "Preview"}
          </span>
        </div>
        {session ? (
          <a href={session.liveViewUrl} rel="noreferrer" target="_blank">
            Open separately ↗
          </a>
        ) : (
          <span>Authorised URL only</span>
        )}
      </header>

      <div className="cw-browser__surface">
        {status === "launching" ? (
          <BrowserLoadingState message={progressMessage} />
        ) : session ? (
          <RemoteBrowserView
            key={session.sessionId}
            onDisconnect={onDisconnect}
            session={session}
          />
        ) : (
          <FallbackPreview
            error={error}
            onRetry={onRetry}
            productUrl={productUrl}
          />
        )}
      </div>
    </section>
  );
}
