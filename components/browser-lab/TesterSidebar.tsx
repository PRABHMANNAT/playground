"use client";

import {
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  BrowserSessionResponse,
  SessionStatus,
  ViewportMode,
} from "@/lib/browser/types";
import type { FeedbackCategory } from "@/lib/product/types";
import { DemoResearchAdapter } from "@/lib/product/scout";

type FeedbackKind =
  | "confusing"
  | "broken"
  | "frustrating"
  | "suggestion"
  | "good"
  | "overall";

interface FeedbackOption {
  kind: FeedbackKind;
  label: string;
  shortcut: string;
  icon: string;
}

interface SavedFeedback {
  id: string;
  kind: FeedbackKind;
  note: string;
  createdAt: number;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: "Idle",
  launching: "Launching",
  connected: "Live",
  error: "Error",
  stopping: "Ending",
  stopped: "Ended",
  disconnected: "Disconnected",
};

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { kind: "confusing", label: "Confusing", shortcut: "C", icon: "?" },
  { kind: "broken", label: "Broken", shortcut: "B", icon: "×" },
  { kind: "frustrating", label: "Frustrating", shortcut: "F", icon: "!" },
  { kind: "suggestion", label: "Suggestion", shortcut: "S", icon: "↗" },
  { kind: "good", label: "Good", shortcut: "G", icon: "✓" },
];

interface TesterSidebarProps {
  browserbaseConfigured: boolean;
  status: SessionStatus;
  url: string;
  viewport: ViewportMode;
  error: string | null;
  errorRef: RefObject<HTMLParagraphElement | null>;
  session: BrowserSessionResponse | null;
  productSessionId?: string;
  onUrlChange: (value: string) => void;
  onViewportChange: (value: ViewportMode) => void;
  onLaunch: () => void;
  onStop: () => void;
}

function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className={`session-badge session-badge--${status}`}>
      <span aria-hidden="true" className="session-badge__dot" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function BrowserSetupPanel({
  browserbaseConfigured,
  status,
  url,
  viewport,
  error,
  errorRef,
  session,
  onUrlChange,
  onViewportChange,
  onLaunch,
  onStop,
}: TesterSidebarProps) {
  const isBusy = status === "launching" || status === "stopping";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLaunch();
  };

  return (
    <form
      className={`browser-setup ${session ? "browser-setup--active" : ""}`}
      onSubmit={submit}
    >
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">Browser setup</span>
          <h2>Product to test</h2>
        </div>
        {session && <span className="setup-ready">Ready</span>}
      </div>

      <label className="input-label" htmlFor="product-url">
        Product URL
      </label>
      <input
        aria-describedby="product-url-notice product-url-error"
        autoCapitalize="none"
        autoComplete="url"
        className="url-input"
        disabled={isBusy}
        id="product-url"
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder="https://your-product.com"
        spellCheck={false}
        type="url"
        value={url}
      />

      <div className="viewport-row">
        <span className="input-label">Viewport</span>
        <div aria-label="Browser viewport" className="viewport-switch">
          {(["desktop", "mobile"] as const).map((option) => (
            <button
              aria-pressed={viewport === option}
              className="viewport-option"
              disabled={isBusy}
              key={option}
              onClick={() => onViewportChange(option)}
              type="button"
            >
              {option === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
      </div>

      {!browserbaseConfigured && (
        <p className="setup-notice" role="status">
          Add <code>BROWSERBASE_API_KEY</code> to <code>.env.local</code> and
          restart the server.
        </p>
      )}

      <p
        className={error ? "form-error" : "form-error form-error--empty"}
        id="product-url-error"
        ref={errorRef}
        role={error ? "alert" : undefined}
        tabIndex={error ? -1 : undefined}
      >
        {error ?? "No error"}
      </p>

      <div className="setup-actions">
        <button
          className="button button--primary"
          disabled={!browserbaseConfigured || isBusy}
          type="submit"
        >
          {status === "launching"
            ? "Launching browser…"
            : session
              ? "Restart browser"
              : "Launch browser"}
        </button>
        {session && (
          <button
            className="button button--secondary"
            disabled={isBusy}
            onClick={onStop}
            type="button"
          >
            {status === "stopping" ? "Ending…" : "Stop"}
          </button>
        )}
      </div>

      <p className="authorisation-notice" id="product-url-notice">
        Only test products you own or are authorised to evaluate.
      </p>
    </form>
  );
}

function FeedbackButtonsPanel({
  session,
  productSessionId,
  viewport,
}: {
  session: BrowserSessionResponse | null;
  productSessionId?: string;
  viewport: ViewportMode;
}) {
  const [activeFeedback, setActiveFeedback] =
    useState<FeedbackKind | null>(null);
  const [note, setNote] = useState("");
  const [savedFeedback, setSavedFeedback] = useState<SavedFeedback[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const scoutCategory: FeedbackCategory | null = activeFeedback
    ? activeFeedback === "good"
      ? "works-well"
      : activeFeedback
    : null;
  const scoutQuestion = scoutCategory
    ? DemoResearchAdapter.nextQuestion(scoutCategory, {})
    : null;

  const selectFeedback = useCallback(
    (kind: FeedbackKind) => {
      if (!session) {
        return;
      }
      setActiveFeedback(kind);
      setConfirmation(null);
      window.setTimeout(() => noteRef.current?.focus(), 0);
    },
    [session],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !session ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const option = [...FEEDBACK_OPTIONS, {
        kind: "overall" as const,
        label: "Overall feedback",
        shortcut: "O",
        icon: "○",
      }].find(
        (candidate) =>
          candidate.shortcut.toLowerCase() === event.key.toLowerCase(),
      );

      if (option) {
        event.preventDefault();
        selectFeedback(option.kind);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectFeedback, session]);

  const saveNote = async () => {
    if (!activeFeedback || !note.trim()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const label =
      activeFeedback === "overall"
        ? "Overall feedback"
        : FEEDBACK_OPTIONS.find((option) => option.kind === activeFeedback)
            ?.label;
    try {
      if (productSessionId && session) {
        const { saveFeedbackCapture } = await import("@/lib/product/db");
        const category: FeedbackCategory =
          activeFeedback === "good" ? "works-well" : activeFeedback;
        await saveFeedbackCapture({
          sessionId: productSessionId,
          category,
          text: note.trim(),
          pageUrl: session.finalUrl,
          viewport,
        });
      }
      setSavedFeedback((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          kind: activeFeedback,
          note: note.trim(),
          createdAt: Date.now(),
        },
      ]);
      setNote("");
      setActiveFeedback(null);
      setConfirmation(`${label ?? "Feedback"} saved for review.`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Feedback could not be saved. Try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className={`feedback-panel ${session ? "" : "feedback-panel--disabled"}`}
    >
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">Capture feedback</span>
          <h2>How does this feel?</h2>
        </div>
        {savedFeedback.length > 0 && (
          <span className="feedback-count">{savedFeedback.length} saved</span>
        )}
      </div>

      <div className="feedback-options">
        {FEEDBACK_OPTIONS.map((option) => (
          <button
            aria-pressed={activeFeedback === option.kind}
            className="feedback-option"
            disabled={!session}
            key={option.kind}
            onClick={() => selectFeedback(option.kind)}
            type="button"
          >
            <span aria-hidden="true" className="feedback-option__icon">
              {option.icon}
            </span>
            <span>{option.label}</span>
            <kbd>{option.shortcut}</kbd>
          </button>
        ))}
      </div>

      <button
        aria-pressed={activeFeedback === "overall"}
        className="overall-feedback"
        disabled={!session}
        onClick={() => selectFeedback("overall")}
        type="button"
      >
        <span className="overall-feedback__top">
          <span>Overall feedback</span>
          <kbd>O</kbd>
        </span>
        <small>
          Share a general thought about the product, idea or overall
          experience.
        </small>
      </button>

      {activeFeedback && (
        <div className="feedback-entry">
          <div className="feedback-entry__header">
            <strong>
              {activeFeedback === "overall"
                ? "Overall feedback"
                : FEEDBACK_OPTIONS.find(
                    (option) => option.kind === activeFeedback,
                  )?.label}
            </strong>
            <button
              aria-label="Cancel feedback"
              onClick={() => {
                setActiveFeedback(null);
                setNote("");
              }}
              type="button"
            >
              ×
            </button>
          </div>
          <label className="sr-only" htmlFor="feedback-note">
            Feedback note
          </label>
          {scoutQuestion && (
            <p className="scout-follow-up">
              <span>Scout</span>
              {scoutQuestion.prompt}
            </p>
          )}
          <textarea
            id="feedback-note"
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              scoutQuestion?.options?.join(" · ") ??
              "What happened, and what did you expect?"
            }
            ref={noteRef}
            rows={3}
            value={note}
          />
          <button
            className="save-feedback"
            disabled={!note.trim() || isSaving}
            onClick={() => void saveNote()}
            type="button"
          >
            {isSaving ? "Saving…" : "Save note"}
          </button>
        </div>
      )}

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}

      {confirmation && (
        <p className="feedback-confirmation" role="status">
          <span aria-hidden="true">✓</span> {confirmation}
        </p>
      )}

      {!session && (
        <p className="feedback-disabled-copy">
          Launch the product to start capturing feedback.
        </p>
      )}
    </section>
  );
}

function VoiceCapture({
  productSessionId,
  enabled,
}: {
  productSessionId?: string;
  enabled: boolean;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<{ blob: Blob; durationMs: number } | null>(
    null,
  );
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const start = async () => {
    if (!productSessionId || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Voice capture is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startedRef.current = Date.now();
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setDraft({ blob, durationMs: Date.now() - startedRef.current });
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
      setMessage("Recording. Microphone access ends when you press Stop.");
    } catch {
      setMessage("Microphone permission was not granted.");
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const save = async () => {
    if (!draft || !productSessionId) {
      return;
    }
    setSaving(true);
    try {
      const { saveVoiceNote } = await import("@/lib/product/db");
      await saveVoiceNote(
        productSessionId,
        draft.blob,
        draft.durationMs,
        transcript.trim(),
      );
      setDraft(null);
      setTranscript("");
      setMessage("Voice note saved locally for review.");
    } catch {
      setMessage("The voice note could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!productSessionId) {
    return null;
  }

  return (
    <section className="voice-capture">
      <div>
        <span aria-hidden="true">◉</span>
        <div>
          <strong>Speak feedback</strong>
          <small>Recorded only after an explicit click.</small>
        </div>
      </div>
      {!draft && (
        <button
          disabled={!enabled}
          onClick={recording ? stop : () => void start()}
          type="button"
        >
          {recording ? "Stop recording" : "Record voice note"}
        </button>
      )}
      {draft && (
        <div className="voice-draft">
          <span>{Math.max(1, Math.round(draft.durationMs / 1000))}s recorded</span>
          <label htmlFor="voice-transcript">Short transcript</label>
          <textarea
            id="voice-transcript"
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Transcription is not automated in this demo."
            rows={2}
            value={transcript}
          />
          <div>
            <button onClick={() => setDraft(null)} type="button">
              Discard
            </button>
            <button
              disabled={saving}
              onClick={() => void save()}
              type="button"
            >
              {saving ? "Saving…" : "Save voice note"}
            </button>
          </div>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function TesterSidebar(props: TesterSidebarProps) {
  return (
    <aside className="tester-sidebar">
      <header className="workspace-brand">
        <div className="workspace-brand__identity">
          <span aria-hidden="true" className="playground-mark">
            P
          </span>
          <div>
            <h1>Playground</h1>
            <p>Tester workspace</p>
          </div>
        </div>
        <SessionStatusBadge status={props.status} />
      </header>

      <div className="tester-sidebar__scroll">
        <section className="test-intro">
          <span className="section-eyebrow">Testing session</span>
          <p>
            Help the founder improve the product by marking anything confusing,
            broken, frustrating, useful, or worth changing.
          </p>
        </section>

        <BrowserSetupPanel {...props} />
        <FeedbackButtonsPanel
          key={props.session?.sessionId ?? "inactive"}
          productSessionId={props.productSessionId}
          session={props.session}
          viewport={props.viewport}
        />
        <VoiceCapture
          enabled={Boolean(props.session)}
          productSessionId={props.productSessionId}
        />

        <div className="tester-tip">
          <span aria-hidden="true">⌘</span>
          <p>
            <strong>Tip</strong>
            <span>
              Press <kbd>C</kbd> at any time to capture feedback quickly.
            </span>
          </p>
        </div>
      </div>
    </aside>
  );
}
