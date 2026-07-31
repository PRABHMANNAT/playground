import "server-only";

import { createHash } from "node:crypto";

import type { Browser, Page } from "playwright-core";

import type { VisitedScreen } from "@/lib/browser/types";

interface ScreenSeed {
  url: string;
  title: string;
  heading?: string;
}

interface ScreenSignal {
  url: string;
  title: string;
  heading: string;
  currentLabel: string;
}

interface ActiveBrowser {
  browser: Browser;
  screens: VisitedScreen[];
  lastFingerprint: string | null;
  refreshPromise: Promise<VisitedScreen[]> | null;
}

const MAX_VISITED_SCREENS = 20;
const activeBrowsers = new Map<string, ActiveBrowser>();

function safePublicUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "about:blank";
  }
}

function titleCaseSegment(value: string): string {
  const abbreviations = new Map([
    ["ai", "AI"],
    ["hr", "HR"],
    ["jd", "JD"],
    ["qa", "QA"],
    ["ui", "UI"],
    ["ux", "UX"],
  ]);

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return abbreviations.get(lower) ?? `${lower[0]?.toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function screenName(signal: ScreenSignal): string {
  const cleanedCurrent = signal.currentLabel.trim().slice(0, 60);
  if (cleanedCurrent) {
    return cleanedCurrent;
  }

  try {
    const url = new URL(signal.url);
    const segment = url.pathname.split("/").filter(Boolean).at(-1);
    if (segment) {
      return titleCaseSegment(decodeURIComponent(segment));
    }
  } catch {
    // A safe title or heading is still available below.
  }

  const heading = signal.heading.trim().replace(/\s+/g, " ").slice(0, 60);
  if (heading) {
    return heading;
  }

  const title = signal.title
    .split(/\s+[|–—]\s+/)[0]
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  return title || "Product screen";
}

function screenFingerprint(signal: ScreenSignal): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        url: signal.url,
        title: signal.title,
        heading: signal.heading,
        currentLabel: signal.currentLabel,
      }),
    )
    .digest("hex");
}

function selectCurrentPage(browser: Browser): Page | null {
  const pages = browser
    .contexts()
    .flatMap((context) => context.pages())
    .filter((page) => page.url() !== "about:blank");
  return pages.at(-1) ?? null;
}

async function readScreenSignal(page: Page): Promise<ScreenSignal> {
  const [title, pageSignal] = await Promise.all([
    page.title().catch(() => ""),
    page
      .evaluate(() => {
        const isVisible = (element: Element) => {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            bounds.width > 0 &&
            bounds.height > 0
          );
        };
        const text = (element: Element | null) =>
          element?.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "";
        const heading = Array.from(
          document.querySelectorAll("h1, h2, [role='heading']"),
        ).find((element) => isVisible(element) && text(element));
        const current = Array.from(
          document.querySelectorAll(
            "[aria-current='page'], [aria-current='step']",
          ),
        ).find((element) => isVisible(element) && text(element));
        return {
          heading: text(heading ?? null),
          currentLabel: text(current ?? null),
        };
      })
      .catch(() => ({ heading: "", currentLabel: "" })),
  ]);

  return {
    url: page.url(),
    title,
    heading: pageSignal.heading,
    currentLabel: pageSignal.currentLabel,
  };
}

function copyScreens(entry: ActiveBrowser): VisitedScreen[] {
  return entry.screens.map((screen) => ({ ...screen }));
}

export function registerActiveBrowser(
  sessionId: string,
  browser: Browser,
  seed: ScreenSeed,
): void {
  const signal: ScreenSignal = {
    url: seed.url,
    title: seed.title,
    heading: seed.heading ?? "",
    currentLabel: "",
  };
  activeBrowsers.set(sessionId, {
    browser,
    screens: [
      {
        id: `${sessionId}-screen-1`,
        name: screenName(signal),
        url: safePublicUrl(seed.url),
        visitedAt: Date.now(),
      },
    ],
    lastFingerprint: null,
    refreshPromise: null,
  });
}

export async function refreshVisitedScreens(
  sessionId: string,
  force = false,
): Promise<VisitedScreen[] | null> {
  const entry = activeBrowsers.get(sessionId);
  if (!entry) {
    return null;
  }

  if (entry.refreshPromise) {
    const currentScreens = await entry.refreshPromise;
    if (!force) {
      return currentScreens;
    }
    return refreshVisitedScreens(sessionId, true);
  }

  entry.refreshPromise = (async () => {
    const page = selectCurrentPage(entry.browser);
    if (!page) {
      return copyScreens(entry);
    }

    const signal = await readScreenSignal(page);
    const fingerprint = screenFingerprint(signal);
    const name = screenName(signal);
    const url = safePublicUrl(signal.url);
    const lastScreen = entry.screens.at(-1);

    if (
      entry.lastFingerprint === null &&
      lastScreen?.name === name &&
      lastScreen.url === url
    ) {
      entry.lastFingerprint = fingerprint;
      return copyScreens(entry);
    }

    if (force || fingerprint !== entry.lastFingerprint) {
      entry.lastFingerprint = fingerprint;
      entry.screens.push({
        id: `${sessionId}-screen-${Date.now()}`,
        name,
        url,
        visitedAt: Date.now(),
      });
      entry.screens = entry.screens.slice(-MAX_VISITED_SCREENS);
    }

    return copyScreens(entry);
  })();

  try {
    return await entry.refreshPromise;
  } finally {
    entry.refreshPromise = null;
  }
}

export async function captureActiveBrowser(
  sessionId: string,
): Promise<{
  dataUrl: string;
  title: string;
  url: string;
  width: number;
  height: number;
} | null> {
  const entry = activeBrowsers.get(sessionId);
  if (!entry) {
    return null;
  }

  const page = selectCurrentPage(entry.browser);
  if (!page) {
    return null;
  }

  const viewport = page.viewportSize() ?? { width: 1_440, height: 900 };
  const [buffer, title] = await Promise.all([
    page.screenshot({
      type: "jpeg",
      quality: 82,
      fullPage: false,
      animations: "disabled",
    }),
    page.title().catch(() => ""),
  ]);

  return {
    dataUrl: `data:image/jpeg;base64,${buffer.toString("base64")}`,
    title: title || "Product screen",
    url: safePublicUrl(page.url()),
    width: viewport.width,
    height: viewport.height,
  };
}

export async function closeActiveBrowser(sessionId: string): Promise<void> {
  const entry = activeBrowsers.get(sessionId);
  activeBrowsers.delete(sessionId);

  if (entry) {
    await entry.browser.close();
  }
}

export function activeBrowserSessionIds(): string[] {
  return [...activeBrowsers.keys()];
}
