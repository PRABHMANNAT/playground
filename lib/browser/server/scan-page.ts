import "server-only";

import type { Page, Request } from "playwright-core";

import type { InitialPageScan } from "@/lib/browser/types";

const MAX_CONSOLE_ERRORS = 20;
const MAX_FAILED_REQUESTS = 20;
const MAX_MESSAGE_LENGTH = 300;

function compactText(value: string, maximum = MAX_MESSAGE_LENGTH): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

function redactSensitiveText(value: string): string {
  return compactText(value)
    .replace(
      /([?&](?:access_?token|api_?key|auth|code|password|secret|token)=)[^&\s]+/gi,
      "$1[redacted]",
    )
    .replace(/bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]");
}

function safeRequestUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return compactText(url.toString());
  } catch {
    return compactText(value.split("?")[0] ?? value);
  }
}

function safeLinkUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    url.username = "";
    url.password = "";
    url.hash = "";
    for (const key of url.searchParams.keys()) {
      if (/token|key|auth|code|password|secret/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return compactText(url.toString());
  } catch {
    return null;
  }
}

export interface PageSignals {
  consoleErrors: string[];
  failedRequests: InitialPageScan["failedRequests"];
}

export function registerPageSignals(page: Page): PageSignals {
  const consoleErrors: string[] = [];
  const failedRequests: InitialPageScan["failedRequests"] = [];

  const addConsoleError = (message: string) => {
    const safe = redactSensitiveText(message);
    if (
      safe &&
      consoleErrors.length < MAX_CONSOLE_ERRORS &&
      !consoleErrors.includes(safe)
    ) {
      consoleErrors.push(safe);
    }
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      addConsoleError(message.text());
    }
  });
  page.on("pageerror", (error) => addConsoleError(error.message));
  page.on("requestfailed", (request: Request) => {
    if (failedRequests.length >= MAX_FAILED_REQUESTS) {
      return;
    }
    const failure = request.failure();
    failedRequests.push({
      method: compactText(request.method(), 12),
      url: safeRequestUrl(request.url()),
      errorText: failure?.errorText
        ? redactSensitiveText(failure.errorText)
        : null,
    });
  });

  return { consoleErrors, failedRequests };
}

type DomScan = Omit<
  InitialPageScan,
  "title" | "finalUrl" | "hostname" | "consoleErrors" | "failedRequests"
>;

const EMPTY_DOM_SCAN: DomScan = {
  headings: [],
  visibleButtons: [],
  visibleLinks: [],
  formCount: 0,
  inputCount: 0,
  imageCount: 0,
};

export async function scanPage(
  page: Page,
  signals: PageSignals,
  fallbackUrl: string,
): Promise<InitialPageScan> {
  let title = "";
  try {
    title = compactText(await page.title(), 160);
  } catch {
    title = "";
  }

  const currentUrl = page.url().startsWith("http") ? page.url() : fallbackUrl;
  let domScan = EMPTY_DOM_SCAN;

  try {
    domScan = await page.evaluate(() => {
      const clean = (value: string | null | undefined, maximum = 240) =>
        (value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
      const isVisible = (element: Element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const headings = Array.from(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      )
        .filter(isVisible)
        .map((element) => ({
          level: Number(element.tagName.slice(1)),
          text: clean(element.textContent),
        }))
        .filter((heading) => heading.text)
        .slice(0, 20);

      const visibleButtons = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, [role="button"], input[type="button"], input[type="submit"]',
        ),
      )
        .filter(isVisible)
        .map((element) => {
          const ariaLabel = clean(element.getAttribute("aria-label")) || null;
          const inputLabel =
            element instanceof HTMLInputElement ? clean(element.value) : "";
          return {
            text: clean(element.textContent) || inputLabel || ariaLabel || "",
            ariaLabel,
          };
        })
        .filter((button) => button.text || button.ariaLabel)
        .slice(0, 30);

      const visibleLinks = Array.from(document.querySelectorAll("a[href]"))
        .filter(isVisible)
        .map((element) => {
          const anchor = element as HTMLAnchorElement;
          return {
            text:
              clean(anchor.textContent) ||
              clean(anchor.getAttribute("aria-label")),
            href: anchor.href || null,
          };
        })
        .filter((link) => link.text)
        .slice(0, 30);

      return {
        headings,
        visibleButtons,
        visibleLinks,
        formCount: document.querySelectorAll("form").length,
        inputCount: document.querySelectorAll(
          "input:not([type='hidden']), textarea, select",
        ).length,
        imageCount: document.querySelectorAll("img").length,
      };
    });
  } catch {
    domScan = EMPTY_DOM_SCAN;
  }

  const hostname = (() => {
    try {
      return new URL(currentUrl).hostname;
    } catch {
      return new URL(fallbackUrl).hostname;
    }
  })();

  return {
    title,
    finalUrl: currentUrl,
    hostname,
    ...domScan,
    visibleLinks: domScan.visibleLinks.map((link) => ({
      ...link,
      href: safeLinkUrl(link.href),
    })),
    consoleErrors: signals.consoleErrors.slice(0, MAX_CONSOLE_ERRORS),
    failedRequests: signals.failedRequests.slice(0, MAX_FAILED_REQUESTS),
  };
}
