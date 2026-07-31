export type TesterPinSeverity = "Confusing" | "Broken" | "Trust";

export type TesterSessionStatus = "waiting" | "testing" | "complete";

export interface TesterEvidencePin {
  id: string;
  screenId: string;
  xPercent: number;
  yPercent: number;
  severity: TesterPinSeverity;
  note: string;
}

export interface TesterCapturedScreen {
  id: string;
  label: string;
  path: string;
}

export interface DemoTesterSession {
  id: string;
  runId: string;
  testerName: string;
  status: TesterSessionStatus;
  lastActivityAt: string;
  screens: TesterCapturedScreen[];
  pins: TesterEvidencePin[];
}

const STORAGE_PREFIX = "playground:run-tester-sessions:";

const SCREENS: TesterCapturedScreen[] = [
  { id: "homepage", label: "Homepage", path: "/" },
  { id: "how-it-works", label: "How it works", path: "/#how-it-works" },
  { id: "demo", label: "Demo request", path: "/#demo" },
];

const CLUSTERED_FINDING =
  "No example evidence dossier is visible before the demo call-to-action.";

export function createSeededTesterSessions(
  runId: string,
): DemoTesterSession[] {
  return [
    {
      id: "ses_olivia",
      runId,
      testerName: "Olivia Chen",
      status: "complete",
      lastActivityAt: "2026-07-31T10:42:18+10:00",
      screens: SCREENS,
      pins: [
        {
          id: "OC-1",
          screenId: "homepage",
          xPercent: 63,
          yPercent: 38,
          severity: "Trust",
          note: CLUSTERED_FINDING,
        },
        {
          id: "OC-2",
          screenId: "homepage",
          xPercent: 31,
          yPercent: 29,
          severity: "Confusing",
          note: "“Proof-first hiring” does not explain what proof I receive.",
        },
        {
          id: "OC-3",
          screenId: "demo",
          xPercent: 72,
          yPercent: 64,
          severity: "Broken",
          note: "The demo request does not explain the agenda or next step.",
        },
      ],
    },
    {
      id: "ses_marcus",
      runId,
      testerName: "Marcus Reid",
      status: "testing",
      lastActivityAt: "2026-07-31T10:43:02+10:00",
      screens: SCREENS,
      pins: [
        {
          id: "MR-1",
          screenId: "homepage",
          xPercent: 60,
          yPercent: 41,
          severity: "Trust",
          note: CLUSTERED_FINDING,
        },
        {
          id: "MR-2",
          screenId: "how-it-works",
          xPercent: 46,
          yPercent: 52,
          severity: "Confusing",
          note: "The concrete workflow appears after the first booking decision.",
        },
      ],
    },
    {
      id: "ses_priya",
      runId,
      testerName: "Priya Nair",
      status: "testing",
      lastActivityAt: "2026-07-31T10:43:27+10:00",
      screens: SCREENS,
      pins: [
        {
          id: "PN-1",
          screenId: "homepage",
          xPercent: 66,
          yPercent: 36,
          severity: "Trust",
          note: CLUSTERED_FINDING,
        },
        {
          id: "PN-2",
          screenId: "homepage",
          xPercent: 34,
          yPercent: 31,
          severity: "Confusing",
          note: "The headline describes a category, not the recruiter outcome.",
        },
        {
          id: "PN-3",
          screenId: "how-it-works",
          xPercent: 52,
          yPercent: 48,
          severity: "Confusing",
          note: "I expected to see the evidence format in this workflow.",
        },
        {
          id: "PN-4",
          screenId: "demo",
          xPercent: 75,
          yPercent: 67,
          severity: "Broken",
          note: "Booking gives no estimate for duration or follow-up.",
        },
      ],
    },
    {
      id: "ses_tom",
      runId,
      testerName: "Tom Walsh",
      status: "testing",
      lastActivityAt: "2026-07-31T10:43:49+10:00",
      screens: SCREENS,
      pins: [
        {
          id: "TW-1",
          screenId: "homepage",
          xPercent: 62,
          yPercent: 39,
          severity: "Trust",
          note: CLUSTERED_FINDING,
        },
        {
          id: "TW-2",
          screenId: "homepage",
          xPercent: 29,
          yPercent: 33,
          severity: "Confusing",
          note: "I cannot tell what decision the recruiter can make afterward.",
        },
        {
          id: "TW-3",
          screenId: "demo",
          xPercent: 70,
          yPercent: 62,
          severity: "Broken",
          note: "The primary action lacks an expectation-setting confirmation.",
        },
      ],
    },
    {
      id: "ses_elise",
      runId,
      testerName: "Elise Parker",
      status: "testing",
      lastActivityAt: "2026-07-31T10:44:11+10:00",
      screens: SCREENS,
      pins: [
        {
          id: "EP-1",
          screenId: "homepage",
          xPercent: 64,
          yPercent: 40,
          severity: "Trust",
          note: CLUSTERED_FINDING,
        },
        {
          id: "EP-2",
          screenId: "how-it-works",
          xPercent: 49,
          yPercent: 50,
          severity: "Confusing",
          note: "The process is clear, but the output is still abstract.",
        },
      ],
    },
  ];
}

function isSessionArray(value: unknown): value is DemoTesterSession[] {
  return (
    Array.isArray(value) &&
    value.length === 5 &&
    value.every(
      (session) =>
        typeof session === "object" &&
        session !== null &&
        "testerName" in session &&
        "status" in session &&
        "pins" in session &&
        Array.isArray(session.pins),
    )
  );
}

export function loadOrSeedTesterSessions(
  runId: string,
): DemoTesterSession[] {
  const seeded = createSeededTesterSessions(runId);

  if (typeof window === "undefined") {
    return seeded;
  }

  const storageKey = `${STORAGE_PREFIX}${runId}`;
  const stored = window.localStorage.getItem(storageKey);

  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (isSessionArray(parsed)) return parsed;
    } catch {
      // Replace malformed demo state with the stable seed below.
    }
  }

  window.localStorage.setItem(storageKey, JSON.stringify(seeded));
  return seeded;
}
