import "server-only";

const SECRET_PATTERNS = [
  /bb_(?:live|test)_[A-Za-z0-9_-]+/gi,
  /(?:api[_-]?key|authorization|password|secret|token)\s*[:=]\s*[^\s,;]+/gi,
  /bearer\s+[A-Za-z0-9._~-]+/gi,
];

function redact(value: string): string {
  return SECRET_PATTERNS.reduce(
    (safe, pattern) => safe.replace(pattern, "[redacted]"),
    value,
  );
}

export function errorMessage(error: unknown): string {
  return redact(error instanceof Error ? error.message : String(error)).slice(
    0,
    500,
  );
}

export function errorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return null;
}

export function logServerError(context: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const status = errorStatus(error);
  console.error(
    `[browser-lab] ${context}: ${name}${status ? ` (${status})` : ""}: ${errorMessage(error)}`,
  );
}

export function normalizeSessionError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const status = errorStatus(error);
  const message = errorMessage(error).toLowerCase();

  if (message === "browserbase_not_configured") {
    return {
      status: 503,
      code: "configuration_missing",
      message:
        "Browserbase is not configured. Add BROWSERBASE_API_KEY to .env.local and restart the development server.",
    };
  }

  if (
    status === 429 ||
    message.includes("concurrency") ||
    message.includes("capacity")
  ) {
    return {
      status: 429,
      code: "browser_capacity_full",
      message:
        "Browser capacity is currently full. Stop another session or try again shortly.",
    };
  }

  if (
    status === 402 ||
    message.includes("browser minutes") ||
    message.includes("minutes limit")
  ) {
    return {
      status: 402,
      code: "browser_minutes_exhausted",
      message:
        "This Browserbase account has no browser minutes remaining. Add usage capacity, then launch the session again.",
    };
  }

  if (
    message.includes("keepalive") ||
    message.includes("keep alive") ||
    message.includes("hobby plan")
  ) {
    return {
      status: 422,
      code: "keep_alive_unavailable",
      message:
        "This Browserbase account does not support keeping sessions alive after the server disconnects.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 503,
      code: "browserbase_access_denied",
      message:
        "Browserbase could not authorise this request. Check the server-side API key.",
    };
  }

  return {
    status: 502,
    code: "session_creation_failed",
    message:
      "Playground could not create the cloud browser. Check the Browserbase setup and try again.",
  };
}

export function normalizeNavigationError(error: unknown): string {
  const message = errorMessage(error).toLowerCase();

  if (message.includes("timeout")) {
    return "The website took too long to open. The browser is still live so you can continue manually.";
  }

  if (
    message.includes("name_not_resolved") ||
    message.includes("dns") ||
    message.includes("internet_disconnected")
  ) {
    return "Playground could not resolve this website. Check the hostname and try again.";
  }

  return "Playground could not reach this website. Check that the URL is public and available.";
}
