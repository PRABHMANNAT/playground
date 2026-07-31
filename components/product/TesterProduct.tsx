"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HomeSimple, ProfileCircle, Suitcase, Wallet } from "iconoir-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  acceptProject,
  completeSessionTask,
  createTestSession,
  declineProject,
  importExtensionEvidence,
  playgroundDb,
  seedDemoData,
  submitSession,
} from "@/lib/product/db";
import type { ExtensionEvidenceInput } from "@/lib/product/db";
import { DEMO_REVIEWER } from "@/lib/product/demo";
import { exportSessionArchive } from "@/lib/product/export";
import type {
  Assignment,
  ExpertVerdict,
  Project,
  ReviewerProfile,
  TestMode,
} from "@/lib/product/types";

function money(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function useSeededDemo() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void seedDemoData()
      .then(() => setReady(true))
      .catch(() => {
        setError(
          "Playground could not open local storage. Check browser privacy settings and try again.",
        );
      });
  }, []);

  return { ready, error };
}

function DemoGate({ children }: { children: React.ReactNode }) {
  const { ready, error } = useSeededDemo();
  if (error) {
    return (
      <main className="product-gate">
        <div className="product-error-card">
          <span>!</span>
          <h1>Local workspace unavailable</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }
  if (!ready) {
    return (
      <main className="product-gate" aria-live="polite">
        <div className="product-loading-mark">P</div>
        <p>Preparing Alex’s private review queue…</p>
      </main>
    );
  }
  return children;
}

export function TesterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reviewer = useLiveQuery(() => playgroundDb.reviewers.get("alex-morgan"));
  const activeSession = useLiveQuery(() =>
    playgroundDb.sessions
      .filter((session) => session.submittedAt === null)
      .first(),
  );

  const nav = [
    { href: "/tester", label: "Overview", icon: <HomeSimple /> },
    { href: "/tester/projects", label: "Projects", icon: <Suitcase /> },
    { href: "/tester/earnings", label: "Earnings", icon: <Wallet /> },
    { href: "/tester/profile", label: "Profile", icon: <ProfileCircle /> },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <DemoGate>
      <div className="product-app">
        <aside className="product-nav">
          <Link className="product-logo" href="/tester">
            <span className="product-logo__mark">
              <Image src="/fund-playground-logo.png" alt="" width={42} height={42} priority />
            </span>
            <div>
              <strong>Playground</strong>
              <small>Tester workspace</small>
            </div>
          </Link>
          <nav aria-label="Tester navigation">
            {nav.map((item) => (
              <Link
                className={
                  pathname === item.href ||
                  (item.href !== "/tester" && pathname.startsWith(item.href))
                    ? "active"
                    : ""
                }
                href={item.href}
                key={item.href}
              >
                <span className="product-nav__icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          {activeSession && (
            <Link
              className="resume-session-card"
              href={`/tester/sessions/${activeSession.id}/${activeSession.mode}`}
            >
              <span>Active assignment</span>
              <strong>Resume Ingen</strong>
              <small>Saved locally on this device →</small>
            </Link>
          )}
          <div className="product-nav__footer">
            <Avatar className="mini-avatar">
              <AvatarImage
                src="https://api.dicebear.com/9.x/avataaars/svg?seed=Prabhmannat%20Singh&top=turban&backgroundColor=transparent"
                alt="Prabhmannat Singh"
              />
              <AvatarFallback>PS</AvatarFallback>
              <AvatarBadge aria-label="Reviewer available" />
            </Avatar>
            <div>
              <strong>Prabhmannat Singh</strong>
              <small>Quality {reviewer?.qualityScore ?? 4.8}</small>
            </div>
          </div>
        </aside>
        <div className="product-main">
          {children}
        </div>
      </div>
    </DemoGate>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`assignment-status assignment-status--${status}`}>
      {status.replace("-", " ")}
    </span>
  );
}

function ProjectCard({
  project,
  assignment,
}: {
  project: Project;
  assignment?: Assignment;
}) {
  return (
    <article className="project-card">
      <div className="project-card__top">
        <div className={`project-monogram project-monogram--${project.id}`}>
          {project.name[0]}
        </div>
        <div>
          <div className="project-card__title">
            <h3>{project.name}</h3>
            <StatusBadge status={assignment?.status ?? project.status} />
          </div>
          <p>{project.tagline}</p>
        </div>
        <span className="match-score">{project.matchScore}% match</span>
      </div>
      <div className="project-card__metrics">
        <div>
          <span>Reward</span>
          <strong>{money(project.reward)}</strong>
        </div>
        <div>
          <span>Time</span>
          <strong>{project.estimatedMinutes} min</strong>
        </div>
        <div>
          <span>Format</span>
          <strong>{project.testType}</strong>
        </div>
      </div>
      <div className="match-reasons">
        <span>Why you match</span>
        <ul>
          {project.whyMatched.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <div className="project-card__footer">
        {project.demoBriefOnly && (
          <span className="brief-only">Demo brief only · no product URL</span>
        )}
        <Link href={`/tester/projects/${project.id}/workspace`}>Open workspace →</Link>
      </div>
    </article>
  );
}

export function TesterDashboard() {
  const queriedProjects = useLiveQuery(() => playgroundDb.projects.toArray());
  const projects = queriedProjects ?? [];
  const assignments =
    useLiveQuery(() => playgroundDb.assignments.toArray()) ?? [];
  const reviewer = useLiveQuery(() => playgroundDb.reviewers.get("alex-morgan"));
  const earnings = useLiveQuery(() => playgroundDb.earnings.toArray()) ?? [];
  const sessions = useLiveQuery(() => playgroundDb.sessions.toArray()) ?? [];
  const pending = earnings
    .filter((earning) => earning.status === "pending")
    .reduce((sum, earning) => sum + earning.amount, 0);
  const inProgress = assignments.filter((item) =>
    ["accepted", "launching", "in-progress", "review-required"].includes(
      item.status,
    ),
  );
  const available = assignments.filter((item) => item.status === "available");
  const submitted = sessions.filter((session) => session.state === "submitted");

  return (
    <TesterShell>
      <main className="product-page">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Good morning, Alex</span>
            <h1>Your review queue</h1>
            <p>
              Private product assignments matched to your hiring and engineering
              experience.
            </p>
          </div>
          <Link className="primary-action" href="/tester/projects">
            View matched projects
          </Link>
        </section>

        <section className="summary-grid" aria-label="Reviewer summary">
          {[
            ["Available", available.length || (submitted.length ? 1 : 2)],
            ["In progress", inProgress.length],
            ["Completed", reviewer?.completedTests ?? 12],
            ["Pending earnings", money(pending)],
            ["Quality score", reviewer?.qualityScore ?? 4.8],
          ].map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        {inProgress[0] && (
          <section className="active-assignment-banner">
            <div>
              <span className="eyebrow">Active assignment</span>
              <h2>Ingen prototype teardown</h2>
              <p>Your progress and captured evidence are saved on this device.</p>
            </div>
            <Link href="/tester/projects/ingen/mode">Resume assignment →</Link>
          </section>
        )}

        <div className="dashboard-columns">
          <section>
            <div className="section-title-row">
              <div>
                <span className="eyebrow">Best matches</span>
                <h2>Available projects</h2>
              </div>
              <Link href="/tester/projects">View all</Link>
            </div>
            <div className="project-list">
              {projects.slice(0, 2).map((project) => (
                <ProjectCard
                  assignment={assignments.find(
                    (item) => item.projectId === project.id,
                  )}
                  key={project.id}
                  project={project}
                />
              ))}
            </div>
          </section>
          <aside className="quality-card">
            <span className="eyebrow">Private quality profile</span>
            <div className="quality-score">
              <strong>4.8</strong>
              <span>out of 5</span>
            </div>
            {[
              ["Evidence quality", 96],
              ["Domain relevance", 94],
              ["Founder usefulness", 97],
              ["Completion reliability", 98],
            ].map(([label, score]) => (
              <div className="quality-row" key={label}>
                <div>
                  <span>{label}</span>
                  <small>{score}%</small>
                </div>
                <i>
                  <b style={{ width: `${score}%` }} />
                </i>
              </div>
            ))}
            <p>Demo quality logic · not recalculated from one test.</p>
          </aside>
        </div>
      </main>
    </TesterShell>
  );
}

export function ProjectsQueue() {
  const [activeIndex, setActiveIndex] = useState(0);
  const swipeStart = useRef<number | null>(null);
  const queriedProjects = useLiveQuery(() => playgroundDb.projects.toArray());
  const assignments =
    useLiveQuery(() => playgroundDb.assignments.toArray()) ?? [];
  const visible = useMemo(
    () => [...(queriedProjects ?? [])].sort((a, b) => b.matchScore - a.matchScore),
    [queriedProjects],
  );
  const activeProject = visible[activeIndex] ?? null;
  const activeAssignment = activeProject
    ? assignments.find((item) => item.projectId === activeProject.id)
    : undefined;

  useEffect(() => {
    if (activeIndex >= visible.length) setActiveIndex(0);
  }, [activeIndex, visible.length]);

  const moveProject = (direction: number) => {
    if (visible.length < 2) return;
    setActiveIndex((current) => (current + direction + visible.length) % visible.length);
  };

  const finishSwipe = (clientX: number) => {
    if (swipeStart.current === null) return;
    const distance = clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(distance) > 55) moveProject(distance < 0 ? 1 : -1);
  };

  return (
    <TesterShell>
      <main className="product-page project-discovery-page">
        <section className="project-discovery-heading">
          <div>
            <span className="eyebrow">Matched review queue</span>
            <h1>Choose a product worth testing.</h1>
            <p>
              Private projects matched to your HR technology and product-review experience.
            </p>
          </div>
          <div className="project-discovery-count">
            <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
            <span>/ {String(visible.length).padStart(2, "0")} matches</span>
          </div>
        </section>

        {activeProject ? (
          <article
            className={`project-swipe-card project-swipe-card--${activeProject.id}`}
            onPointerDown={(event) => {
              swipeStart.current = event.clientX;
            }}
            onPointerUp={(event) => finishSwipe(event.clientX)}
          >
            <section className="project-swipe-card__story">
              <div className="project-swipe-card__meta">
                <span>{activeProject.name}</span>
                <StatusBadge status={activeAssignment?.status ?? activeProject.status} />
              </div>
              <h2>
                {activeProject.id === "ingen"
                  ? "Help hiring teams trust the signal before the shortlist."
                  : "Make company knowledge easier to find, trust and act on."}
              </h2>
              <p className="project-swipe-card__summary">{activeProject.objective}</p>

              <div className="project-swipe-card__actions">
                <Link href={`/tester/projects/${activeProject.id}/workspace`}>
                  Open workspace <span aria-hidden="true">→</span>
                </Link>
                <button onClick={() => moveProject(1)} type="button">
                  Next match <span aria-hidden="true">→</span>
                </button>
              </div>

              <dl className="project-swipe-card__metrics">
                <div>
                  <dt>Reward</dt>
                  <dd>{money(activeProject.reward)}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{activeProject.estimatedMinutes} min</dd>
                </div>
                <div>
                  <dt>Match</dt>
                  <dd>{activeProject.matchScore}%</dd>
                </div>
              </dl>
            </section>

            <section className="project-swipe-card__identity">
              <div className="project-swipe-card__logo-wrap">
                {activeProject.id === "ingen" ? (
                  <Image
                    alt="Browser identity interface reference for the Ingen review"
                    className="project-swipe-card__media-image"
                    height={1080}
                    src="/browserbase-identity.webp"
                    width={1240}
                  />
                ) : (
                  <video
                    aria-label="Orchestra product walkthrough"
                    autoPlay
                    className="project-swipe-card__media-video"
                    controls
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    src="/orchestra-workspace.mp4"
                  />
                )}
              </div>
              <div className="project-swipe-card__details">
                <div>
                  <span>Product brief</span>
                  <strong>{activeProject.tagline}</strong>
                </div>
                <div>
                  <span>Review format</span>
                  <strong>{activeProject.testType}</strong>
                </div>
                <div>
                  <span>Your perspective</span>
                  <ul>
                    {activeProject.whyMatched.slice(0, 3).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <footer>
                <span>Swipe left or right</span>
                <strong>{activeProject.taskCount} guided tasks</strong>
              </footer>
            </section>
          </article>
        ) : (
          <div className="empty-product-state" role="status">
            <h2>Preparing your matched projects…</h2>
          </div>
        )}

        <nav className="project-swipe-controls" aria-label="Browse matched projects">
          <button aria-label="Previous project" onClick={() => moveProject(-1)} type="button">←</button>
          <div>
            {visible.map((project, index) => (
              <button
                aria-label={`Show ${project.name}`}
                aria-pressed={index === activeIndex}
                key={project.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
          <button aria-label="Next project" onClick={() => moveProject(1)} type="button">→</button>
        </nav>
      </main>
    </TesterShell>
  );
}

export function ProjectBrief({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useLiveQuery(
    () => playgroundDb.projects.get(projectId),
    [projectId],
    null,
  );
  const assignment = useLiveQuery(() =>
    playgroundDb.assignments.where("projectId").equals(projectId).first(),
  );
  const [error, setError] = useState<string | null>(null);

  if (project === null) {
    return (
      <TesterShell>
        <main className="product-page">
          <div className="empty-product-state" role="status">
            <h1>Loading project…</h1>
          </div>
        </main>
      </TesterShell>
    );
  }

  if (!project) {
    return (
      <TesterShell>
        <main className="product-page">
          <div className="empty-product-state">
            <h1>Project not found</h1>
            <Link href="/tester/projects">Return to projects</Link>
          </div>
        </main>
      </TesterShell>
    );
  }

  const tasks =
    project.id === "ingen"
      ? [
          "Blind exploration",
          "Create a job description",
          "Review candidate recommendations",
          "Pressure-test the product",
          "Final expert teardown",
        ]
      : [
          "Explore the workspace",
          "Coordinate one core workflow",
          "Identify team hand-off risks",
          "Final teardown",
        ];

  const accept = async () => {
    try {
      await acceptProject(project.id);
      router.push(`/tester/projects/${project.id}/mode`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "This project is unavailable.",
      );
    }
  };

  const decline = async () => {
    try {
      await declineProject(project.id);
      router.push("/tester/projects");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "This assignment could not be declined.",
      );
    }
  };

  return (
    <TesterShell>
      <main className="product-page brief-page">
        <Link className="back-link" href="/tester/projects">
          ← Back to projects
        </Link>
        <section className="brief-hero">
          <div className={`project-monogram project-monogram--${project.id}`}>
            {project.name[0]}
          </div>
          <div>
            <span className="eyebrow">{project.testType}</span>
            <h1>{project.name} prototype test</h1>
            <p>{project.tagline}</p>
          </div>
          <div className="brief-reward">
            <span>Reward</span>
            <strong>{money(project.reward)}</strong>
            <small>Pending after submission</small>
          </div>
        </section>
        {project.demoBriefOnly && (
          <div className="demo-warning">
            <strong>Demo brief only</strong>
            A live product URL has not been connected, so testing is disabled.
          </div>
        )}
        <div className="brief-grid">
          <section className="brief-content">
            <div>
              <span className="eyebrow">Test objective</span>
              <h2>What this assignment needs to answer</h2>
              <p>{project.objective}</p>
            </div>
            <div>
              <h3>What the founder wants to learn</h3>
              <ul className="check-list">
                {project.founderQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Testing tasks</h3>
              <ol className="task-preview">
                {tasks.map((task, index) => (
                  <li key={task}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{task}</strong>
                      <small>
                        {index === tasks.length - 1
                          ? "Completed after evidence review"
                          : "Guided product task"}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
          <aside className="brief-sidebar">
            <div>
              <span>Estimated time</span>
              <strong>{project.estimatedMinutes} minutes</strong>
            </div>
            <div>
              <span>Tasks</span>
              <strong>{project.taskCount}</strong>
            </div>
            <div>
              <span>Match</span>
              <strong>{project.matchScore}%</strong>
            </div>
            <hr />
            <h3>Expectations</h3>
            <ul>
              <li>Give honest, specific feedback.</li>
              <li>Explain why something matters.</li>
              <li>Separate professional judgement from preference.</li>
              <li>Blur sensitive information before submission.</li>
            </ul>
            {error && <p className="inline-error">{error}</p>}
            <button
              className="primary-action"
              disabled={project.demoBriefOnly}
              onClick={accept}
              type="button"
            >
              {assignment?.status === "accepted"
                ? "Continue to test setup"
                : "Accept project"}
            </button>
            <button
              className="text-action"
              onClick={() => void decline()}
              type="button"
            >
              Decline assignment
            </button>
          </aside>
        </div>
      </main>
    </TesterShell>
  );
}

export function ModeSelection({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useLiveQuery(() => playgroundDb.projects.get(projectId));
  const [busy, setBusy] = useState<TestMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (mode: TestMode) => {
    if (!project?.url) {
      setError("A live product URL has not been connected.");
      return;
    }
    setBusy(mode);
    try {
      const session = await createTestSession(project.id, mode);
      router.push(`/tester/sessions/${session.id}/${mode}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Session setup failed.",
      );
      setBusy(null);
    }
  };

  return (
    <TesterShell>
      <main className="product-page mode-page">
        <Link className="back-link" href={`/tester/projects/${projectId}`}>
          ← Back to project
        </Link>
        <section className="page-heading centered">
          <span className="eyebrow">Choose your testing environment</span>
          <h1>How would you like to test {project?.name ?? "this product"}?</h1>
          <p>
            Both modes use the same tasks, structured feedback, evidence, and
            review flow.
          </p>
        </section>
        <div className="mode-grid">
          <article className="mode-card mode-card--recommended">
            <div className="mode-card__badge">Fastest · Recommended</div>
            <div className="mode-icon">C</div>
            <h2>Test in Chrome</h2>
            <p>
              Open Ingen in your normal browser with the Playground development
              extension beside it.
            </p>
            <ul>
              <li>Native product experience</li>
              <li>Exact element and region selection</li>
              <li>Voice, screenshots and journey capture</li>
              <li>Compact Scout overlay</li>
            </ul>
            <div className="privacy-note">
              Access is limited to the active product tab during this session.
            </div>
            <button
              className="primary-action"
              disabled={busy !== null || !project}
              onClick={() => choose("chrome")}
              type="button"
            >
              {busy === "chrome" ? "Preparing…" : "Continue with Chrome"}
            </button>
          </article>
          <article className="mode-card">
            <div className="mode-card__badge neutral">No installation</div>
            <div className="mode-icon mode-icon--cloud">☁</div>
            <h2>Use secure cloud browser</h2>
            <p>
              Run Ingen inside Playground’s disposable, isolated product
              browser.
            </p>
            <ul>
              <li>No extension installation</li>
              <li>Complete task and feedback workflow</li>
              <li>Evidence and screen journey capture</li>
              <li>Isolated remote session</li>
            </ul>
            <div className="privacy-note">
              Cloud mode may feel slower while the first live frame connects.
            </div>
            <button
              className="secondary-action"
              disabled={busy !== null || !project}
              onClick={() => choose("cloud")}
              type="button"
            >
              {busy === "cloud"
                ? "Preparing…"
                : "Continue with cloud browser"}
            </button>
          </article>
        </div>
        {error && <p className="mode-error">{error}</p>}
      </main>
    </TesterShell>
  );
}

export function ReviewerProfile({ onboarding = false }: { onboarding?: boolean }) {
  const router = useRouter();
  const profile = useLiveQuery(() => playgroundDb.reviewers.get("alex-morgan"));
  const [form, setForm] = useState<ReviewerProfile>(DEMO_REVIEWER);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      const timer = window.setTimeout(() => setForm(profile), 0);
      return () => window.clearTimeout(timer);
    }
  }, [profile]);

  const updateArray = (
    field: "domains" | "skills" | "roles" | "testingPreferences",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    await playgroundDb.reviewers.put(form);
    setSaved(true);
    if (onboarding) {
      router.push("/tester");
    }
  };

  return (
    <TesterShell>
      <main className="product-page profile-page">
        <section className="page-heading">
          <span className="eyebrow">
            {onboarding ? "Reviewer onboarding" : "Matching profile"}
          </span>
          <h1>{onboarding ? "Tell Playground how you work" : "Reviewer profile"}</h1>
          <p>
            Matching keeps domain expertise, roles, practical skills, and
            testing preferences separate.
          </p>
        </section>
        <form className="profile-form" onSubmit={save}>
          <section>
            <div className="section-title-row">
              <div>
                <span className="eyebrow">Identity</span>
                <h2>Professional context</h2>
              </div>
              <div className="profile-avatar">AM</div>
            </div>
            <div className="form-grid">
              <label>
                Display name
                <input
                  onChange={(event) =>
                    setForm({ ...form, displayName: event.target.value })
                  }
                  value={form.displayName}
                />
              </label>
              <label>
                Professional headline
                <input
                  onChange={(event) =>
                    setForm({ ...form, headline: event.target.value })
                  }
                  value={form.headline}
                />
              </label>
              <label>
                Years of experience
                <input
                  min={0}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      yearsExperience: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={form.yearsExperience}
                />
              </label>
              <label>
                Payout currency
                <select value="AUD">
                  <option>AUD</option>
                </select>
              </label>
            </div>
            <label>
              Short biography
              <textarea
                onChange={(event) =>
                  setForm({ ...form, biography: event.target.value })
                }
                rows={4}
                value={form.biography}
              />
            </label>
          </section>
          <section>
            <span className="eyebrow">Matching signals</span>
            <h2>What should projects be matched against?</h2>
            {[
              ["roles", "Professional roles", form.roles],
              ["domains", "Domain expertise", form.domains],
              ["skills", "Technical and practical skills", form.skills],
              [
                "testingPreferences",
                "Testing preferences",
                form.testingPreferences,
              ],
            ].map(([field, label, values]) => (
              <label key={String(field)}>
                {String(label)}
                <textarea
                  onChange={(event) =>
                    updateArray(
                      field as
                        | "domains"
                        | "skills"
                        | "roles"
                        | "testingPreferences",
                      event.target.value,
                    )
                  }
                  rows={2}
                  value={(values as string[]).join(", ")}
                />
                <small>Separate entries with commas.</small>
              </label>
            ))}
          </section>
          <section>
            <span className="eyebrow">Privacy and consent</span>
            <h2>Your testing data</h2>
            <label className="consent-row">
              <input
                checked={form.privacyAcknowledged}
                onChange={(event) =>
                  setForm({
                    ...form,
                    privacyAcknowledged: event.target.checked,
                  })
                }
                type="checkbox"
              />
              I understand that captured evidence may be shared with the founder.
            </label>
            <label className="consent-row">
              <input
                checked={form.modelImprovementConsent}
                onChange={(event) =>
                  setForm({
                    ...form,
                    modelImprovementConsent: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Allow anonymised feedback to improve Playground’s testing models.
              This is off by default.
            </label>
          </section>
          <div className="profile-actions">
            {saved && <span>Profile saved locally.</span>}
            <button className="primary-action" type="submit">
              {onboarding ? "Complete onboarding" : "Save profile"}
            </button>
          </div>
        </form>
      </main>
    </TesterShell>
  );
}

export function ChromePreparation({ sessionId }: { sessionId: string }) {
  const session = useLiveQuery(() => playgroundDb.sessions.get(sessionId));
  const [extensionState, setExtensionState] = useState<
    "checking" | "installed" | "missing" | "simulated"
  >("checking");
  const [started, setStarted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => setExtensionState("missing"), 1200);
    const listener = (event: MessageEvent) => {
      if (
        event.source === window &&
        event.data?.type === "PLAYGROUND_EXTENSION_PONG" &&
        event.data?.requestId === requestId
      ) {
        window.clearTimeout(timeout);
        setExtensionState("installed");
      }
    };
    window.addEventListener("message", listener);
    window.postMessage({ type: "PLAYGROUND_EXTENSION_PING", requestId }, "*");
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", listener);
    };
  }, []);

  const connect = async () => {
    if (!session) {
      return;
    }
    if (extensionState === "simulated") {
      await playgroundDb.sessions.update(sessionId, { state: "testing" });
      await playgroundDb.assignments.update(session.assignmentId, {
        status: "in-progress",
      });
      window.open(
        `https://ingen-hrandstudent-5.vercel.app?playgroundSession=${encodeURIComponent(sessionId)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setStarted(true);
      return;
    }
    const handshake = {
      type: "PLAYGROUND_EXTENSION_START",
      sessionId,
      targetUrl: `https://ingen-hrandstudent-5.vercel.app?playgroundSession=${encodeURIComponent(sessionId)}`,
    };
    const onStarted = async (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.data?.type !== "PLAYGROUND_EXTENSION_STARTED"
      ) {
        return;
      }
      window.removeEventListener("message", onStarted);
      if (!event.data.ok) {
        setStartError(event.data.error ?? "The extension could not open Ingen.");
        return;
      }
      await playgroundDb.sessions.update(sessionId, { state: "testing" });
      await playgroundDb.assignments.update(session.assignmentId, {
        status: "in-progress",
      });
      setStarted(true);
      setStartError(null);
    };
    window.addEventListener("message", onStarted);
    window.postMessage(handshake, window.location.origin);
  };

  return (
    <TesterShell>
      <main className="product-page chrome-prep">
        <section className="page-heading centered">
          <span className="eyebrow">Chrome testing mode</span>
          <h1>Connect the Playground extension</h1>
          <p>
            The extension accesses only the Ingen tab during this active test.
          </p>
        </section>
        <div className="connection-card">
          <div className="extension-visual">P</div>
          <div>
            <span className="eyebrow">Extension status</span>
            <h2>
              {extensionState === "checking"
                ? "Checking Chrome…"
                : extensionState === "installed"
                  ? "Playground extension installed"
                  : extensionState === "simulated"
                    ? "Development connection simulated"
                    : "Extension not installed"}
            </h2>
            <p>
              {extensionState === "missing"
                ? "No published Chrome Web Store listing exists yet. Load the extension/ folder as an unpacked extension during development."
                : "Ingen can open with the compact task bar, feedback dock, Scout composer, and local evidence capture."}
            </p>
          </div>
          <StatusBadge
            status={
              extensionState === "installed" || extensionState === "simulated"
                ? "in-progress"
                : "unavailable"
            }
          />
        </div>
        <ol className="connection-steps">
          <li className="done">
            <span>1</span>
            <div>
              <strong>Assignment prepared</strong>
              <small>Tasks and local session created</small>
            </div>
          </li>
          <li
            className={
              extensionState === "installed" || extensionState === "simulated"
                ? "done"
                : ""
            }
          >
            <span>2</span>
            <div>
              <strong>Extension connected</strong>
              <small>Safe product-tab handshake</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Open Ingen</strong>
              <small>Optional host permission requested by Chrome</small>
            </div>
          </li>
        </ol>
        <div className="connection-actions">
          {process.env.NODE_ENV === "development" &&
            extensionState === "missing" && (
              <button
                className="secondary-action"
                onClick={() => setExtensionState("simulated")}
                type="button"
              >
                Simulate extension connected
              </button>
            )}
          <button
            className="primary-action"
            disabled={
              extensionState !== "installed" && extensionState !== "simulated"
            }
            onClick={connect}
            type="button"
          >
            {started ? "Ingen opened" : "Open Ingen and begin"}
          </button>
          {started && (
            <Link
              className="secondary-action"
              href={`/tester/sessions/${sessionId}/review`}
            >
              Review captured evidence
            </Link>
          )}
        </div>
        {startError && (
          <p className="inline-error" role="alert">
            {startError}
          </p>
        )}
      </main>
    </TesterShell>
  );
}

export function SessionReview({ sessionId }: { sessionId: string }) {
  const [extensionImport, setExtensionImport] = useState<string | null>(null);
  const session = useLiveQuery(() => playgroundDb.sessions.get(sessionId));
  const tasks =
    useLiveQuery(() =>
      playgroundDb.tasks.where("sessionId").equals(sessionId).sortBy("sequence"),
    ) ?? [];
  const feedback =
    useLiveQuery(() =>
      playgroundDb.feedback.where("sessionId").equals(sessionId).toArray(),
    ) ?? [];
  const visits =
    useLiveQuery(() =>
      playgroundDb.screenVisits.where("sessionId").equals(sessionId).toArray(),
    ) ?? [];
  const voices =
    useLiveQuery(() =>
      playgroundDb.voices.where("sessionId").equals(sessionId).toArray(),
    ) ?? [];
  const completedTaskCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const allTasksComplete =
    tasks.length > 0 && completedTaskCount === tasks.length;

  useEffect(() => {
    const onExtensionExport = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== window.location.origin ||
        event.data?.type !== "PLAYGROUND_EXTENSION_EXPORT" ||
        event.data?.sessionId !== sessionId ||
        !Array.isArray(event.data?.evidence)
      ) {
        return;
      }
      const evidence = event.data.evidence.filter(
        (item: unknown): item is ExtensionEvidenceInput =>
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "text" in item &&
          "category" in item &&
          typeof item.id === "string" &&
          typeof item.text === "string" &&
          typeof item.category === "string",
      );
      void importExtensionEvidence(sessionId, evidence).then((count) => {
        if (count > 0) {
          setExtensionImport(
            `${count} extension capture${count === 1 ? "" : "s"} imported.`,
          );
        }
      });
    };
    window.addEventListener("message", onExtensionExport);
    window.postMessage(
      { type: "PLAYGROUND_EXTENSION_REQUEST_EXPORT", sessionId },
      window.location.origin,
    );
    return () => window.removeEventListener("message", onExtensionExport);
  }, [sessionId]);

  const removeFeedback = async (feedbackId: string) => {
    await playgroundDb.transaction(
      "rw",
      [playgroundDb.feedback, playgroundDb.evidence],
      async () => {
        await playgroundDb.feedback.delete(feedbackId);
        await playgroundDb.evidence
          .where("feedbackId")
          .equals(feedbackId)
          .delete();
      },
    );
  };

  return (
    <TesterShell>
      <main className="product-page review-page">
        <section className="page-heading">
          <span className="eyebrow">Session review</span>
          <h1>Review your Ingen evidence</h1>
          <p>
            Clean up captured moments before giving your final professional
            verdict.
          </p>
          {extensionImport && (
            <span className="success-inline" role="status">
              {extensionImport}
            </span>
          )}
        </section>
        <section className="review-summary">
          {[
            ["Tasks complete", `${completedTaskCount}/${tasks.length}`],
            ["Feedback", feedback.length],
            ["Screens visited", visits.length],
            ["Voice notes", voices.length],
            [
              "Duration",
              `${Math.max(1, Math.round(((session?.endedAt ?? session?.startedAt ?? 0) - (session?.startedAt ?? 0)) / 60000))} min`,
            ],
          ].map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>
        <div className="review-grid">
          <section className="review-panel">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">Required work</span>
                <h2>Session tasks</h2>
              </div>
              <span>
                {allTasksComplete
                  ? "Ready for verdict"
                  : `${tasks.length - completedTaskCount} remaining`}
              </span>
            </div>
            <div className="review-task-list">
              {tasks.map((task) => (
                <article key={task.id}>
                  <span
                    className={
                      task.status === "completed" ? "complete" : "pending"
                    }
                  >
                    {task.status === "completed" ? "✓" : task.sequence}
                  </span>
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.outcome || "Outcome required"}</small>
                  </div>
                  <div className="review-task-actions">
                    <StatusBadge status={task.status} />
                    {task.status !== "completed" && (
                      <button
                        onClick={() =>
                          void completeSessionTask(sessionId, task.id)
                        }
                        type="button"
                      >
                        Mark complete
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="review-panel">
            <span className="eyebrow">Evidence capsules</span>
            <h2>Captured moments</h2>
            {feedback.length ? (
              <div className="moment-list">
                {feedback.map((item) => (
                  <article key={item.id}>
                    <StatusBadge status={item.category} />
                    <strong>{item.summary}</strong>
                    <small>
                      {new Date(item.createdAt).toLocaleTimeString("en-AU", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </small>
                    <button
                      onClick={() => void removeFeedback(item.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="review-empty">
                <span>◇</span>
                <h3>No captured moments yet</h3>
                <p>
                  Return to testing to capture feedback, screenshots, or voice
                  notes.
                </p>
              </div>
            )}
          </section>
        </div>
        {voices.length > 0 && (
          <section className="review-panel voice-review-panel">
            <span className="eyebrow">Voice evidence</span>
            <h2>{voices.length} recorded note{voices.length === 1 ? "" : "s"}</h2>
            <div className="moment-list">
              {voices.map((voice) => (
                <article key={voice.id}>
                  <StatusBadge status="voice" />
                  <strong>
                    {voice.editedTranscript ||
                      "Voice note without a manual transcript"}
                  </strong>
                  <small>
                    {Math.max(1, Math.round(voice.durationMs / 1000))} seconds
                  </small>
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(voice.audio);
                      const audio = new Audio(url);
                      audio.onended = () => URL.revokeObjectURL(url);
                      void audio.play();
                    }}
                    type="button"
                  >
                    Play
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="review-actions">
          <Link
            className="secondary-action"
            href={`/tester/sessions/${sessionId}/${session?.mode ?? "cloud"}`}
          >
            Return to testing
          </Link>
          {allTasksComplete ? (
            <Link
              className="primary-action"
              href={`/tester/sessions/${sessionId}/verdict`}
            >
              Continue to expert verdict
            </Link>
          ) : (
            <button
              className="primary-action"
              disabled
              title="Complete every required task first"
              type="button"
            >
              Complete tasks to continue
            </button>
          )}
        </div>
      </main>
    </TesterShell>
  );
}

export function VerdictForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const existing = useLiveQuery(() =>
    playgroundDb.verdicts.where("sessionId").equals(sessionId).first(),
  );
  const [form, setForm] = useState<ExpertVerdict>(() => ({
    id: `verdict-${sessionId}`,
    sessionId,
    useDecision: "maybe",
    confidence: "high",
    biggestStrength: "",
    biggestWeakness: "",
    mostImportantChange: "",
    founderMisunderstanding: "",
    adoptionBlocker: "",
    trustEvidence: "",
    bestCustomer: "",
    avoidCustomer: "",
    valuableButUnnecessary: "",
    finalMessage: "",
    professionalBasis: "Direct professional experience",
    createdAt: Date.now(),
  }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      const timer = window.setTimeout(() => setForm(existing), 0);
      return () => window.clearTimeout(timer);
    }
  }, [existing]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.biggestStrength.trim() ||
      !form.biggestWeakness.trim() ||
      !form.mostImportantChange.trim()
    ) {
      setError("Complete the strength, weakness, and most important change.");
      return;
    }
    await playgroundDb.verdicts.put(form);
    await playgroundDb.sessions.update(sessionId, { state: "verdict" });
    router.push(`/tester/sessions/${sessionId}/complete`);
  };

  const textFields: Array<[keyof ExpertVerdict, string]> = [
    ["biggestStrength", "What is the product’s biggest strength?"],
    ["biggestWeakness", "What is its biggest weakness?"],
    ["mostImportantChange", "What is the single most important change?"],
    ["founderMisunderstanding", "What has the founder misunderstood?"],
    ["adoptionBlocker", "What would prevent organisational adoption?"],
    ["trustEvidence", "What evidence would you need before trusting it?"],
    ["bestCustomer", "Who is the best target customer?"],
    ["avoidCustomer", "Which customer should the founder avoid initially?"],
    ["valuableButUnnecessary", "What appears valuable but unnecessary?"],
    ["finalMessage", "Any final message for the founder?"],
  ];

  return (
    <TesterShell>
      <main className="product-page verdict-page">
        <section className="page-heading">
          <span className="eyebrow">Final expert teardown</span>
          <h1>Your professional verdict on Ingen</h1>
          <p>
            This is stored separately from raw feedback and shared as strategic
            founder context.
          </p>
        </section>
        <form className="verdict-form" onSubmit={save}>
          <section className="verdict-choice-grid">
            <fieldset>
              <legend>Would you use Ingen in a real hiring process?</legend>
              {[
                ["yes", "Yes"],
                ["maybe", "Maybe, after changes"],
                ["no", "No"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    checked={form.useDecision === value}
                    name="decision"
                    onChange={() =>
                      setForm({
                        ...form,
                        useDecision: value as ExpertVerdict["useDecision"],
                      })
                    }
                    type="radio"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>How confident are you?</legend>
              {["low", "medium", "high"].map((value) => (
                <label key={value}>
                  <input
                    checked={form.confidence === value}
                    name="confidence"
                    onChange={() =>
                      setForm({
                        ...form,
                        confidence: value as ExpertVerdict["confidence"],
                      })
                    }
                    type="radio"
                  />
                  {value}
                </label>
              ))}
            </fieldset>
          </section>
          <section className="verdict-questions">
            {textFields.map(([field, label]) => (
              <label key={field}>
                {label}
                <textarea
                  onChange={(event) =>
                    setForm({ ...form, [field]: event.target.value })
                  }
                  rows={3}
                  value={String(form[field])}
                />
              </label>
            ))}
            <label>
              What is this judgement based on?
              <select
                onChange={(event) =>
                  setForm({ ...form, professionalBasis: event.target.value })
                }
                value={form.professionalBasis}
              >
                <option>Direct professional experience</option>
                <option>Experience with similar products</option>
                <option>Technical inference</option>
                <option>General judgement</option>
                <option>Personal preference</option>
              </select>
            </label>
          </section>
          {error && <p className="inline-error">{error}</p>}
          <div className="review-actions">
            <Link
              className="secondary-action"
              href={`/tester/sessions/${sessionId}/review`}
            >
              Back to review
            </Link>
            <button className="primary-action" type="submit">
              Save verdict
            </button>
          </div>
        </form>
      </main>
    </TesterShell>
  );
}

export function SubmissionReady({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const verdict = useLiveQuery(() =>
    playgroundDb.verdicts.where("sessionId").equals(sessionId).first(),
  );
  const tasks =
    useLiveQuery(() =>
      playgroundDb.tasks.where("sessionId").equals(sessionId).toArray(),
    ) ?? [];
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    try {
      await submitSession(sessionId);
      router.push(`/tester/sessions/${sessionId}/complete?submitted=1`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Submission could not finish.",
      );
    }
  };
  const submitted = useLiveQuery(() => playgroundDb.sessions.get(sessionId));

  if (submitted?.state === "submitted") {
    return (
      <TesterShell>
        <main className="product-page submitted-page">
          <div className="success-seal">✓</div>
          <span className="eyebrow">Submission complete</span>
          <h1>Test submitted</h1>
          <p>
            Your structured evidence and expert verdict are ready for founder
            review.
          </p>
          <div className="earned-card">
            <span>Reward earned</span>
            <strong>A$8</strong>
            <small>Pending review and approval · not yet paid</small>
          </div>
          <div className="submission-actions">
            <Link
              className="secondary-action"
              href={`/tester/submissions/${sessionId}`}
            >
              View submitted feedback
            </Link>
            <Link className="primary-action" href="/tester">
              Return to dashboard
            </Link>
            <Link className="text-action" href="/founder/projects/ingen/report">
              Open demo founder report →
            </Link>
          </div>
        </main>
      </TesterShell>
    );
  }

  const completed = tasks.filter((task) => task.status === "completed").length;
  return (
    <TesterShell>
      <main className="product-page submit-page">
        <section className="page-heading centered">
          <span className="eyebrow">Ready to submit</span>
          <h1>One final check</h1>
          <p>Submission creates a pending A$8 earning. No payment is transferred.</p>
        </section>
        <div className="submission-checklist">
          <div className={completed === tasks.length ? "done" : ""}>
            <span>{completed === tasks.length ? "✓" : "!"}</span>
            <div>
              <strong>Required tasks</strong>
              <small>
                {completed} of {tasks.length} complete
              </small>
            </div>
          </div>
          <div className={verdict ? "done" : ""}>
            <span>{verdict ? "✓" : "!"}</span>
            <div>
              <strong>Expert verdict</strong>
              <small>{verdict ? "Complete" : "Required"}</small>
            </div>
          </div>
          <div className="done">
            <span>✓</span>
            <div>
              <strong>Local media writes</strong>
              <small>Complete</small>
            </div>
          </div>
        </div>
        {error && <p className="mode-error">{error}</p>}
        <div className="submission-actions">
          <Link
            className="secondary-action"
            href={`/tester/sessions/${sessionId}/verdict`}
          >
            Edit verdict
          </Link>
          <button className="primary-action" onClick={submit} type="button">
            Submit test
          </button>
        </div>
      </main>
    </TesterShell>
  );
}

export function SubmittedDetail({ sessionId }: { sessionId: string }) {
  const [exportState, setExportState] = useState<
    "idle" | "exporting" | "error"
  >("idle");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const session = useLiveQuery(() => playgroundDb.sessions.get(sessionId));
  const feedback =
    useLiveQuery(() =>
      playgroundDb.feedback.where("sessionId").equals(sessionId).toArray(),
    ) ?? [];
  const verdict = useLiveQuery(() =>
    playgroundDb.verdicts.where("sessionId").equals(sessionId).first(),
  );
  return (
    <TesterShell>
      <main className="product-page review-page">
        <section className="page-heading">
          <span className="eyebrow">Submitted test</span>
          <h1>Ingen prototype teardown</h1>
          <p>
            Submitted{" "}
            {session?.submittedAt
              ? new Date(session.submittedAt).toLocaleDateString("en-AU")
              : "locally"}
            . Reward status: pending.
          </p>
          <button
            className="secondary-action"
            disabled={exportState === "exporting"}
            onClick={() => {
              setExportState("exporting");
              void exportSessionArchive(sessionId)
                .then(() => setExportState("idle"))
                .catch(() => setExportState("error"));
            }}
            type="button"
          >
            {exportState === "exporting"
              ? "Preparing archive…"
              : "Export session archive"}
          </button>
          {exportState === "error" && (
            <span className="inline-error" role="alert">
              The local archive could not be created.
            </span>
          )}
        </section>
        <section className="review-panel">
          <span className="eyebrow">Expert verdict</span>
          <h2>{verdict?.useDecision === "yes" ? "Would use" : "Maybe, after changes"}</h2>
          <p>{verdict?.mostImportantChange || "Verdict details unavailable."}</p>
        </section>
        <section className="review-panel">
          <span className="eyebrow">Evidence</span>
          <h2>{feedback.length} captured moments</h2>
          <div className="moment-list">
            {feedback.map((item) => (
              <article key={item.id}>
                <StatusBadge status={item.category} />
                <strong>{item.summary}</strong>
                <small>{item.severity} severity</small>
              </article>
            ))}
          </div>
        </section>
        <section className="submission-next-grid">
          <article className="review-panel">
            <span className="eyebrow">Next task</span>
            <h2>Bring one more HR voice into the review</h2>
            <p>Invite a recruiter, hiring manager, or HR operations teammate who can pressure-test the same workflow from their field.</p>
            <div className="submission-next-actions">
              <Link className="primary-action" href="/tester/projects/ingen/workspace">Review another project</Link>
              <Link className="secondary-action" href="/tester/earnings">View Pinch earnings</Link>
            </div>
          </article>
          <article className="review-panel referral-panel">
            <span className="eyebrow">Referral workspace</span>
            <h2>Invite a referred tester</h2>
            <form onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const value = inviteEmail.trim();
              if (!value || invitedEmails.includes(value)) return;
              setInvitedEmails((current) => [...current, value]);
              setInviteEmail("");
            }}>
              <input aria-label="Referred tester email" onChange={(event) => setInviteEmail(event.target.value)} placeholder="recruiter@company.com" type="email" value={inviteEmail} />
              <button className="primary-action" disabled={!inviteEmail.trim()} type="submit">Send invite</button>
            </form>
            {invitedEmails.length > 0 && <div className="referral-list">{invitedEmails.map((email) => <span key={email}>✓ {email}</span>)}</div>}
            <small>Invites are attached to this project and do not expose your private evidence.</small>
          </article>
        </section>
      </main>
    </TesterShell>
  );
}

export function FounderReport() {
  const findings =
    useLiveQuery(() =>
      playgroundDb.founderFindings
        .where("projectId")
        .equals("ingen")
        .sortBy("priority"),
    ) ?? [];
  const submitted =
    useLiveQuery(() =>
      playgroundDb.sessions
        .where("projectId")
        .equals("ingen")
        .filter((session) => session.state === "submitted")
        .count(),
    ) ?? 0;
  const evidence =
    useLiveQuery(() =>
      playgroundDb.evidence.where("projectId").equals("ingen").count(),
    ) ?? 0;
  return (
    <DemoGate>
      <main className="founder-report">
        <header className="founder-header">
          <Link className="product-logo" href="/tester">
            <span>P</span>
            <div>
              <strong>Playground</strong>
              <small>Founder report</small>
            </div>
          </Link>
          <div>
            <span className="demo-badge">Demo report</span>
            <Link href="/tester">Tester workspace →</Link>
          </div>
        </header>
        <section className="report-hero">
          <div>
            <span className="eyebrow">Ingen · Prototype teardown</span>
            <h1>What hiring professionals need before they trust Ingen</h1>
            <p>
              Prioritised findings combining four clearly seeded demo sessions
              with {submitted ? " Alex Morgan’s local submission" : " the pending local Alex session"}.
            </p>
          </div>
          <div className="report-score">
            <span>Overall signal</span>
            <strong>Promising</strong>
            <small>Trust and workflow clarity need work</small>
          </div>
        </section>
        <section className="report-metrics">
          <article>
            <span>Reviewers</span>
            <strong>{4 + submitted}</strong>
            <small>{submitted} live local · 4 seeded demo</small>
          </article>
          <article>
            <span>Evidence capsules</span>
            <strong>{12 + evidence}</strong>
            <small>Structured and reviewer-approved</small>
          </article>
          <article>
            <span>High-priority findings</span>
            <strong>2</strong>
            <small>Before launch</small>
          </article>
        </section>
        <div className="report-layout">
          <section className="finding-list">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">Ranked findings</span>
                <h2>What to address first</h2>
              </div>
              <span>Deterministic demo clustering</span>
            </div>
            {findings.map((finding) => (
              <article className="finding-card" key={finding.id}>
                <div className="finding-priority">0{finding.priority}</div>
                <div>
                  <div className="finding-card__meta">
                    <StatusBadge status={finding.severity} />
                    <span>{finding.affectedReviewerCount} reviewers affected</span>
                    {finding.demoSeeded && <span>Seeded demo evidence</span>}
                  </div>
                  <h3>{finding.title}</h3>
                  <p>{finding.summary}</p>
                  <div className="finding-evidence">
                    <div className="finding-placeholder">
                      <span>Annotated evidence preview</span>
                      <i />
                      <b>1</b>
                      <b>2</b>
                    </div>
                    <div>
                      <span>Why it matters</span>
                      <p>{finding.strategicRelevance}</p>
                      <span>Recommended fix</span>
                      <p>{finding.recommendedFix}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className="report-verdict">
            <span className="eyebrow">Expert signal</span>
            <h2>Strategic takeaways</h2>
            <blockquote>
              “The concept is valuable, but hiring teams need a transparent
              evidence trail before candidate ranking can shape a real decision.”
            </blockquote>
            <dl>
              <div>
                <dt>Best customer</dt>
                <dd>Occasional technical hiring teams</dd>
              </div>
              <div>
                <dt>Avoid initially</dt>
                <dd>Regulated, high-volume recruitment</dd>
              </div>
              <div>
                <dt>Biggest strength</dt>
                <dd>Workflow compression</dd>
              </div>
              <div>
                <dt>Adoption blocker</dt>
                <dd>Unexplained recommendation logic</dd>
              </div>
            </dl>
            <p>
              Demo strategic summary. It is not presented as production-grade AI
              clustering.
            </p>
          </aside>
        </div>
      </main>
    </DemoGate>
  );
}
