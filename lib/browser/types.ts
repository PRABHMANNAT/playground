export type ViewportMode = "desktop" | "mobile";

export type SessionStatus =
  | "idle"
  | "launching"
  | "connected"
  | "error"
  | "stopping"
  | "stopped"
  | "disconnected";

export interface InitialPageScan {
  title: string;
  finalUrl: string;
  hostname: string;
  headings: Array<{
    level: number;
    text: string;
  }>;
  visibleButtons: Array<{
    text: string;
    ariaLabel: string | null;
  }>;
  visibleLinks: Array<{
    text: string;
    href: string | null;
  }>;
  formCount: number;
  inputCount: number;
  imageCount: number;
  consoleErrors: string[];
  failedRequests: Array<{
    method: string;
    url: string;
    errorText: string | null;
  }>;
}

export interface BrowserSessionResponse {
  sessionId: string;
  liveViewUrl: string;
  pageTitle: string;
  finalUrl: string;
  hostname: string;
  expiresAt: string | null;
  navigation: {
    status: "succeeded" | "failed";
    message: string | null;
  };
  initialScan: InitialPageScan;
}

export interface VisitedScreen {
  id: string;
  name: string;
  url: string;
  visitedAt: number;
}

export interface VisitedScreensResponse {
  screens: VisitedScreen[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
