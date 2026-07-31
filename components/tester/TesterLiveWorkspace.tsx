"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  createTesterWorkspaceSeed,
  openPrefilledDemo,
  type TesterWorkspacePin,
  type TesterWorkspaceSeverity,
  type TesterWorkspaceTask,
} from "@/lib/demo/tester-workspace";

type InteractionMode = "browse" | "mark" | "note";
type ViewportMode = "desktop" | "mobile";

type DraftPin = {
  xPercent: number;
  yPercent: number;
};

type SessionEvent = {
  id: string;
  at: string;
  message: string;
};

const SEVERITIES: TesterWorkspaceSeverity[] = ["Confusing", "Broken", "Trust"];

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function pinLabel(severity: TesterWorkspaceSeverity) {
  if (severity === "Trust") return "Trust signal";
  if (severity === "Broken") return "Blocked action";
  return "Page clarity";
}

export function TesterLiveWorkspace({
  runId,
  prefilled = false,
}: {
  runId: string;
  prefilled?: boolean;
}) {
  const router = useRouter();
  const seed = useMemo(
    () => (prefilled ? openPrefilledDemo(runId) : createTesterWorkspaceSeed(runId)),
    [prefilled, runId],
  );
  const [tasks, setTasks] = useState<TesterWorkspaceTask[]>(seed.tasks);
  const [pins, setPins] = useState<TesterWorkspacePin[]>(seed.pins);
  const [mode, setMode] = useState<InteractionMode>("browse");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [elapsed, setElapsed] = useState(0);
  const [sessionLive, setSessionLive] = useState(true);
  const [frameError, setFrameError] = useState(false);
  const [draftPin, setDraftPin] = useState<DraftPin | null>(null);
  const [draftSeverity, setDraftSeverity] = useState<TesterWorkspaceSeverity | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [pulsePinId, setPulsePinId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [generalNote, setGeneralNote] = useState("");
  const [generalNotes, setGeneralNotes] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [events, setEvents] = useState<SessionEvent[]>(() => {
    if (!prefilled) return [{ id: "session-start", at: "00:00", message: "Session started" }];
    return [
      { id: "prefill-pin-2", at: "12:31", message: "Pin dropped · Confusing · Pricing" },
      { id: "prefill-task-2", at: "11:47", message: "Task 2 marked complete" },
      { id: "prefill-pin-1", at: "10:12", message: "Pin dropped · Trust · Candidate proof" },
      { id: "session-start", at: "00:00", message: "Session started" },
    ];
  });
  const submitTimers = useRef<number[]>([]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const confusingPinSaved = pins.some((pin) => pin.severity === "Confusing");
  const canSubmit = completedCount === tasks.length && pins.length > 0 && confirmed;

  const unmetReason = completedCount < tasks.length
    ? `Complete ${tasks.length - completedCount} remaining task${tasks.length - completedCount === 1 ? "" : "s"} to submit`
    : pins.length === 0
      ? "Add at least one finding to submit"
      : !confirmed
        ? "Confirm this is your original feedback"
        : "Ready for founder review";

  const addEvent = useCallback((message: string) => {
    setEvents((current) => [
      { id: `${Date.now()}-${message}`, at: formatElapsed(elapsed), message },
      ...current,
    ]);
  }, [elapsed]);

  const closeEditors = useCallback(() => {
    setDraftPin(null);
    setDraftSeverity(null);
    setDraftNote("");
    setPinError(null);
    setNoteOpen(false);
    setShortcutsOpen(false);
    setOpenMenuId(null);
  }, []);

  const triggerSubmit = useCallback(() => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    closeEditors();
    submitTimers.current.push(window.setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
      submitTimers.current.push(window.setTimeout(() => {
        router.push("/tester/earnings");
      }, 1500));
    }, 700));
  }, [canSubmit, closeEditors, router, submitting]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => submitTimers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "Escape") {
        closeEditors();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        triggerSubmit();
        return;
      }
      if (isTyping) return;
      if (event.key.toLowerCase() === "m") setMode("mark");
      if (event.key.toLowerCase() === "b") setMode("browse");
      if (event.key.toLowerCase() === "n") setMode("note");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeEditors, triggerSubmit]);

  const handleFrameClick = (event: MouseEvent<HTMLDivElement>) => {
    if (mode === "browse") return;
    if (mode === "note") {
      setNoteOpen(true);
      return;
    }
    if (draftPin) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setDraftPin({
      xPercent: Math.round(((event.clientX - bounds.left) / bounds.width) * 10000) / 100,
      yPercent: Math.round(((event.clientY - bounds.top) / bounds.height) * 10000) / 100,
    });
    setDraftSeverity(null);
    setDraftNote("");
    setPinError(null);
  };

  const discardPin = () => {
    setDraftPin(null);
    setDraftSeverity(null);
    setDraftNote("");
    setPinError(null);
  };

  const savePin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftPin || !draftSeverity || !draftNote.trim()) {
      setPinError("Choose a severity and add a one-line note.");
      return;
    }
    const nextPin: TesterWorkspacePin = {
      id: `pin-${pins.length + 1}-${Date.now()}`,
      ...draftPin,
      severity: draftSeverity,
      note: draftNote.trim().slice(0, 140),
      label: pinLabel(draftSeverity),
    };
    setPins((current) => [...current, nextPin]);
    setPulsePinId(nextPin.id);
    addEvent(`Pin dropped · ${nextPin.severity} · ${nextPin.label}`);
    discardPin();
    window.setTimeout(() => setPulsePinId(null), 450);
  };

  const toggleTask = (taskId: number) => {
    setTasks((current) => current.map((task) => (
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )));
    const task = tasks.find((item) => item.id === taskId);
    addEvent(`Task ${taskId} marked ${task?.completed ? "incomplete" : "complete"}`);
  };

  const focusPin = (pinId: string) => {
    setPulsePinId(pinId);
    document.getElementById(`workspace-pin-${pinId}`)?.scrollIntoView({ block: "center", inline: "center" });
    window.setTimeout(() => setPulsePinId(null), 450);
  };

  const cycleSeverity = (pinId: string) => {
    setPins((current) => current.map((pin) => {
      if (pin.id !== pinId) return pin;
      const next = SEVERITIES[(SEVERITIES.indexOf(pin.severity) + 1) % SEVERITIES.length];
      return { ...pin, severity: next, label: pinLabel(next) };
    }));
    setOpenMenuId(null);
    addEvent("Finding severity changed");
  };

  const deletePin = (pinId: string) => {
    setPins((current) => current.filter((pin) => pin.id !== pinId));
    setOpenMenuId(null);
    addEvent("Finding deleted");
  };

  const saveEditedNote = (pinId: string) => {
    if (!editingNote.trim()) return;
    setPins((current) => current.map((pin) => (
      pin.id === pinId ? { ...pin, note: editingNote.trim().slice(0, 140) } : pin
    )));
    setEditingPinId(null);
    setEditingNote("");
    addEvent("Finding note updated");
  };

  const acceptance = [
    { label: "Complete all required tasks", met: completedCount === tasks.length },
    { label: "Explain what you expected", met: pins.some((pin) => pin.note.length >= 20) },
    { label: "Submit original feedback", met: confirmed },
    { label: "Mark at least one confusing moment", met: confusingPinSaved },
    { label: "Add written or video evidence", met: pins.length > 0 || generalNotes.length > 0 },
    { label: "Positive feedback is not required", met: true },
  ];

  return (
    <main className="tester-live-workspace">
      <header className="tester-live-workspace__topbar">
        <Link href="/tester/projects">PLAYGROUND · TESTER WORKSPACE</Link>
        <div><strong>{seed.runId}</strong><span> · “{seed.founderDecision}”</span></div>
        <div><span>{seed.tester.firstName} {seed.tester.lastName}</span><Link href="/start">Switch role</Link></div>
      </header>

      <div className="tester-live-workspace__grid">
        <aside className="tester-live-workspace__left" aria-label="Session controls">
          <section className="tw-panel">
            <div className="tw-panel__heading"><span>01</span><h2>Session</h2></div>
            <label className="tw-url"><span>Product URL</span><input readOnly value={seed.productUrl} /></label>
            <small>Founder-authorised destination</small>
            <div className="tw-field-label">Viewport</div>
            <div className="tw-segmented" role="group" aria-label="Browser viewport">
              {(["desktop", "mobile"] as ViewportMode[]).map((option) => (
                <button aria-pressed={viewport === option} className={viewport === option ? "is-active" : ""} key={option} onClick={() => setViewport(option)} type="button">{option}</button>
              ))}
            </div>
            <div className="tw-button-row">
              <button onClick={() => { setSessionLive(true); addEvent("Browser replaced · local preview"); }} type="button">Replace browser</button>
              <button onClick={() => { setSessionLive(false); addEvent("Session stopped"); }} type="button">Stop session</button>
            </div>
          </section>

          <section className="tw-panel">
            <div className="tw-panel__heading"><span>02</span><h2>Interaction mode</h2></div>
            <div className="tw-mode-control" role="group" aria-label="Interaction mode">
              <button aria-pressed={mode === "browse"} className={mode === "browse" ? "is-active" : ""} onClick={() => { setMode("browse"); discardPin(); }} type="button">▶ Browse</button>
              <button aria-pressed={mode === "mark"} className={mode === "mark" ? "is-active" : ""} onClick={() => setMode("mark")} type="button">⊹ Mark issue</button>
              <button aria-pressed={mode === "note"} className={mode === "note" ? "is-active" : ""} onClick={() => { setMode("note"); discardPin(); }} type="button">⌘ Note</button>
            </div>
            <small>Tip: press M for Mark issue, B for Browse, N for Note.</small>
          </section>

          <section className="tw-panel tw-panel--log">
            <div className="tw-panel__heading"><span>03</span><h2>Session log</h2></div>
            <div className="tw-session-log" aria-live="polite">
              {events.map((event) => <p key={event.id}><time>{event.at}</time><span>{event.message}</span></p>)}
            </div>
          </section>
        </aside>

        <section className="tester-live-workspace__browser" aria-label="Static live browser workspace">
          <header className="tw-browser-bar">
            <div><span className={sessionLive ? "tw-live-dot" : "tw-live-dot is-stopped"} /><strong>www.ingenworkspace.com</strong><span className="tw-live-badge" title="Live cloud browser for www.ingenworkspace.com">{sessionLive ? "LIVE" : "STOPPED"}</span><span className="tw-isolated">Isolated session</span></div>
            <div><button onClick={() => addEvent("Separate preview opened") } type="button">↗ Open separately</button><i /><button onClick={() => { setSessionLive(false); addEvent("Session stopped"); }} type="button">Stop</button></div>
          </header>
          <div className={`tw-browser-stage is-${mode} is-${viewport}`} onClick={handleFrameClick}>
            <div className="tw-screenshot-wrap">
              <Image alt="Static Ingen product homepage for review" fill priority sizes="(max-width: 1100px) 55vw, 70vw" src={seed.productScreenshot} />
              {!frameError && (
                <iframe
                  className="tw-browser-iframe"
                  onError={() => setFrameError(true)}
                  src={seed.productUrl}
                  title="Live Ingen product browser"
                />
              )}
            </div>
            <div className="tw-pin-layer" aria-label="Product findings">
              {pins.map((pin, index) => {
                const dimmed = hoveredPinId && hoveredPinId !== pin.id;
                return (
                  <button
                    aria-label={`Pin ${index + 1}: ${pin.severity}`}
                    className={`founder-brief__capture-pin tw-pin ${hoveredPinId === pin.id ? "is-highlighted" : ""} ${dimmed ? "is-dimmed" : ""} ${pulsePinId === pin.id ? "is-pulsing" : ""}`}
                    id={`workspace-pin-${pin.id}`}
                    key={pin.id}
                    onClick={(event) => { event.stopPropagation(); focusPin(pin.id); }}
                    style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
                    type="button"
                  >{index + 1}</button>
                );
              })}
              {draftPin && (
                <>
                  <span className="founder-brief__capture-pin tw-pin tw-pin--draft" style={{ left: `${draftPin.xPercent}%`, top: `${draftPin.yPercent}%` }}>{pins.length + 1}</span>
                  <form
                    className={`tw-pin-popover ${draftPin.xPercent > 64 ? "is-left" : ""} ${draftPin.yPercent > 56 ? "is-up" : ""}`}
                    onClick={(event) => event.stopPropagation()}
                    onSubmit={savePin}
                    style={{ left: `${draftPin.xPercent}%`, top: `${draftPin.yPercent}%` }}
                  >
                    <small>Pin {String(pins.length + 1).padStart(2, "0")}</small>
                    <fieldset><legend>Severity</legend><div>{SEVERITIES.map((severity) => <button aria-pressed={draftSeverity === severity} className={draftSeverity === severity ? "is-active" : ""} key={severity} onClick={() => setDraftSeverity(severity)} type="button">{severity}</button>)}</div></fieldset>
                    <label><span>Note</span><textarea autoFocus maxLength={140} onChange={(event) => setDraftNote(event.target.value)} placeholder="What confused you here?" rows={3} value={draftNote} /><small>{draftNote.length}/140</small></label>
                    {pinError && <p role="alert">{pinError}</p>}
                    <div><button onClick={discardPin} type="button">Discard</button><button className="tw-save-pin" type="submit">Save pin</button></div>
                  </form>
                </>
              )}
            </div>
            <div className="tw-shortcut-anchor">
              <button aria-expanded={shortcutsOpen} aria-label="Keyboard shortcuts" onClick={(event) => { event.stopPropagation(); setShortcutsOpen((current) => !current); }} type="button">?</button>
              {shortcutsOpen && <div className="tw-shortcut-popover" onClick={(event) => event.stopPropagation()}><strong>Keyboard shortcuts</strong><span><kbd>M</kbd> Mark issue</span><span><kbd>B</kbd> Browse</span><span><kbd>N</kbd> Note</span><span><kbd>Esc</kbd> Close editor</span><span><kbd>⌘↵</kbd> Submit</span></div>}
            </div>
          </div>
        </section>

        <aside className="tester-live-workspace__right" aria-label="Tasks and findings">
          <section className="tw-panel tw-tasks">
            <div className="tw-panel__heading"><span>01</span><h2>Required tasks</h2><small>{completedCount}/{tasks.length}</small></div>
            <ol>{tasks.map((task) => <li className={task.completed ? "is-complete" : ""} key={task.id}><button aria-label={`${task.completed ? "Uncheck" : "Complete"} task ${task.id}`} onClick={() => toggleTask(task.id)} type="button"><span>{task.completed ? "✓" : task.id}</span><strong>{task.title}</strong></button><button onClick={() => setMode("mark")} type="button">Add finding →</button></li>)}</ol>
          </section>

          <section className="tw-panel tw-findings">
            <div className="tw-panel__heading"><span>02</span><h2>Your findings</h2><small>{pins.length}</small></div>
            {pins.length === 0 ? <p className="tw-empty">No findings yet. Switch to Mark issue and click what confused you.</p> : <div className="tw-finding-list">{pins.map((pin, index) => <article className={hoveredPinId === pin.id ? "is-active" : ""} key={pin.id} onMouseEnter={() => setHoveredPinId(pin.id)} onMouseLeave={() => setHoveredPinId(null)}><div><button onClick={() => focusPin(pin.id)} type="button"><span>⊙ {String(index + 1).padStart(2, "0")} · {pin.severity} · {pin.label}</span><strong>“{pin.note}”</strong></button><button aria-expanded={openMenuId === pin.id} aria-label={`Finding ${index + 1} menu`} onClick={() => setOpenMenuId((current) => current === pin.id ? null : pin.id)} type="button">⋯</button></div>{openMenuId === pin.id && <div className="tw-finding-menu"><button onClick={() => { setEditingPinId(pin.id); setEditingNote(pin.note); setOpenMenuId(null); }} type="button">Edit note</button><button onClick={() => cycleSeverity(pin.id)} type="button">Change severity</button><button onClick={() => deletePin(pin.id)} type="button">Delete</button></div>}{editingPinId === pin.id && <div className="tw-inline-edit"><input maxLength={140} onChange={(event) => setEditingNote(event.target.value)} value={editingNote} /><button onClick={() => saveEditedNote(pin.id)} type="button">Save</button><button onClick={() => setEditingPinId(null)} type="button">Cancel</button></div>}</article>)}</div>}
          </section>

          <section className="tw-panel tw-acceptance">
            <div className="tw-panel__heading"><span>03</span><h2>Acceptance conditions</h2></div>
            <ul>{acceptance.map((condition) => <li className={condition.met ? "is-met" : ""} key={condition.label}><span>{condition.met ? "✓" : "○"}</span>{condition.label}</li>)}</ul>
            <label><input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /><span>I confirm this is my original feedback.</span></label>
          </section>
        </aside>
      </div>

      <footer className="tester-live-workspace__status">
        <div><span className={sessionLive ? "tw-live-dot" : "tw-live-dot is-stopped"} />{sessionLive ? "Session live" : "Session stopped"} · {formatElapsed(elapsed)} elapsed</div>
        <strong>{completedCount} of {tasks.length} tasks · {pins.length} finding{pins.length === 1 ? "" : "s"}</strong>
        <div className="tw-submit-area"><span><em>A$30</em> · paid by Pinch on approval</span><div><button disabled={!canSubmit || submitting || submitted} onClick={triggerSubmit} type="button">{submitting ? "Submitting..." : submitted ? "Submitted" : "Submit for review"}</button><small>{unmetReason}</small></div></div>
      </footer>

      {noteOpen && <div className="tw-modal-backdrop" onClick={() => setNoteOpen(false)}><form className="tw-note-modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (!generalNote.trim()) return; setGeneralNotes((current) => [...current, generalNote.trim()]); addEvent("General observation added"); setGeneralNote(""); setNoteOpen(false); }}><small>GENERAL OBSERVATION</small><h2>Add a session note</h2><textarea autoFocus maxLength={140} onChange={(event) => setGeneralNote(event.target.value)} placeholder="What did you notice across the experience?" rows={4} value={generalNote} /><span>{generalNote.length}/140</span><div><button onClick={() => setNoteOpen(false)} type="button">Discard</button><button type="submit">Save note</button></div></form></div>}

      {submitted && <aside className="tw-submit-toast" role="status"><span>● SUBMITTED FOR REVIEW</span><strong>{seed.runId} · {pins.length} findings · {completedCount}/{tasks.length} tasks</strong><p>Payment queued via Pinch · pending founder approval</p><em>You’ll receive A$30.00 if approved.</em></aside>}
    </main>
  );
}
