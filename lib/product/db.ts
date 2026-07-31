"use client";

import Dexie, { type EntityTable } from "dexie";

import type {
  Campaign,
  TesterSubmission,
} from "@/lib/campaign/types";
import {
  DEMO_EARNING,
  DEMO_PROJECTS,
  DEMO_REVIEWER,
  INGEN_TASKS,
  SEEDED_FINDINGS,
} from "@/lib/product/demo";
import type {
  Assignment,
  EarningRecord,
  EvidenceCapsule,
  ExpertVerdict,
  FeedbackItem,
  FixPreview,
  FounderFinding,
  PressureTest,
  Project,
  ReviewerProfile,
  ScreenVisit,
  ScreenshotRecord,
  SessionEvent,
  SessionTask,
  TestMode,
  TestSession,
  VoiceNote,
} from "@/lib/product/types";

interface FeedbackCaptureInput {
  sessionId: string;
  category: FeedbackItem["category"];
  text: string;
  pageUrl: string;
  viewport: "desktop" | "mobile";
}

export interface ExtensionEvidenceInput {
  id: string;
  category: FeedbackItem["category"];
  text: string;
  pageUrl: string;
  screenshotDataUrl?: string | null;
  createdAt: number;
  taskIndex: number;
}

export class PlaygroundDatabase extends Dexie {
  reviewers!: EntityTable<ReviewerProfile, "id">;
  projects!: EntityTable<Project, "id">;
  assignments!: EntityTable<Assignment, "id">;
  sessions!: EntityTable<TestSession, "id">;
  tasks!: EntityTable<SessionTask, "id">;
  feedback!: EntityTable<FeedbackItem, "id">;
  evidence!: EntityTable<EvidenceCapsule, "id">;
  screenshots!: EntityTable<ScreenshotRecord, "id">;
  voices!: EntityTable<VoiceNote, "id">;
  screenVisits!: EntityTable<ScreenVisit, "id">;
  events!: EntityTable<SessionEvent, "id">;
  verdicts!: EntityTable<ExpertVerdict, "id">;
  earnings!: EntityTable<EarningRecord, "id">;
  pressureTests!: EntityTable<PressureTest, "id">;
  fixPreviews!: EntityTable<FixPreview, "id">;
  founderFindings!: EntityTable<FounderFinding, "id">;
  campaigns!: EntityTable<Campaign, "id">;
  campaignSubmissions!: EntityTable<TesterSubmission, "id">;

  constructor() {
    super("playground-tester");
    this.version(1).stores({
      reviewers: "id",
      projects: "id, status, matchScore, reward",
      assignments: "id, reviewerId, projectId, status",
      sessions: "id, assignmentId, projectId, reviewerId, state, submittedAt",
      tasks: "id, sessionId, [sessionId+sequence], status",
      feedback: "id, sessionId, taskId, category, status, createdAt",
      evidence: "id, feedbackId, sessionId, projectId, taskId, createdAt",
      screenshots: "id, sessionId, createdAt",
      voices: "id, sessionId, taskId, createdAt",
      screenVisits: "id, sessionId, [sessionId+sequence], enteredAt",
      events: "id, sessionId, type, createdAt",
      verdicts: "id, sessionId",
      earnings: "id, sessionId, projectId, status",
      pressureTests: "id, sessionId, status",
      fixPreviews: "id, feedbackId",
      founderFindings: "id, projectId, priority",
    });
    // Founder-side validation campaigns. Additive upgrade: Dexie creates the
    // new table and leaves every version 1 table untouched.
    this.version(2).stores({
      campaigns: "id, status, createdAt",
    });
    this.version(3).stores({
      campaignSubmissions: "id, campaignId, qualityStatus, submittedAt",
    });
    this.version(4).stores({
      campaignSubmissions:
        "id, campaignId, sourceType, qualityStatus, rewardStatus, submittedAt",
    });
  }
}

export const playgroundDb = new PlaygroundDatabase();

export async function seedDemoData(): Promise<void> {
  await playgroundDb.transaction(
    "rw",
    [
      playgroundDb.reviewers,
      playgroundDb.projects,
      playgroundDb.assignments,
      playgroundDb.earnings,
      playgroundDb.founderFindings,
    ],
    async () => {
      if (!(await playgroundDb.reviewers.get(DEMO_REVIEWER.id))) {
        await playgroundDb.reviewers.add(DEMO_REVIEWER);
      }
      for (const project of DEMO_PROJECTS) {
        if (!(await playgroundDb.projects.get(project.id))) {
          await playgroundDb.projects.add(project);
        }
        const assignmentId = `assignment-${project.id}`;
        if (!(await playgroundDb.assignments.get(assignmentId))) {
          await playgroundDb.assignments.add({
            id: assignmentId,
            reviewerId: DEMO_REVIEWER.id,
            projectId: project.id,
            status: project.demoBriefOnly ? "unavailable" : "available",
            acceptedAt: null,
            submittedAt: null,
          });
        }
      }
      for (const finding of SEEDED_FINDINGS) {
        if (!(await playgroundDb.founderFindings.get(finding.id))) {
          await playgroundDb.founderFindings.add(finding);
        }
      }
      if (!(await playgroundDb.earnings.get(DEMO_EARNING.id))) {
        await playgroundDb.earnings.add(DEMO_EARNING);
      }
    },
  );
}

export async function resetDemoData(): Promise<void> {
  await playgroundDb.delete();
  await playgroundDb.open();
  localStorage.removeItem("playground.activeSessionId");
  await seedDemoData();
}

export async function acceptProject(projectId: string): Promise<Assignment> {
  const assignment = await playgroundDb.assignments
    .where("projectId")
    .equals(projectId)
    .first();
  if (!assignment || assignment.status === "unavailable") {
    throw new Error("This project is not available for live testing.");
  }
  const updated: Assignment = {
    ...assignment,
    status: "accepted",
    acceptedAt: Date.now(),
  };
  await playgroundDb.assignments.put(updated);
  return updated;
}

export async function declineProject(projectId: string): Promise<void> {
  const assignment = await playgroundDb.assignments
    .where("projectId")
    .equals(projectId)
    .first();
  if (!assignment || assignment.status === "unavailable") {
    throw new Error("This project is not available.");
  }
  await playgroundDb.assignments.update(assignment.id, {
    status: "cancelled",
  });
}

export async function createTestSession(
  projectId: string,
  mode: TestMode,
): Promise<TestSession> {
  const assignment = await playgroundDb.assignments
    .where("projectId")
    .equals(projectId)
    .first();
  if (!assignment || assignment.status === "unavailable") {
    throw new Error("Accept this project before starting a session.");
  }
  const existing = await playgroundDb.sessions
    .where("assignmentId")
    .equals(assignment.id)
    .filter((session) => session.submittedAt === null)
    .first();
  if (existing) {
    if (existing.mode !== mode) {
      await playgroundDb.sessions.update(existing.id, { mode });
      existing.mode = mode;
    }
    localStorage.setItem("playground.activeSessionId", existing.id);
    localStorage.setItem("playground.lastMode", mode);
    return existing;
  }

  const sessionId = `session-${projectId}-${Date.now()}`;
  const tasks: SessionTask[] = INGEN_TASKS.map((task, index) => ({
    id: `${sessionId}-task-${task.sequence}`,
    sessionId,
    sequence: task.sequence,
    title: task.title,
    instructions: task.instructions,
    required: task.required,
    status: index === 0 ? "ready" : "locked",
    difficulty: null,
    outcome: "",
    startedAt: null,
    completedAt: null,
  }));
  const session: TestSession = {
    id: sessionId,
    assignmentId: assignment.id,
    projectId,
    reviewerId: DEMO_REVIEWER.id,
    mode,
    state: "preparing",
    startedAt: Date.now(),
    endedAt: null,
    submittedAt: null,
    currentTaskId: tasks[0]!.id,
    browserSessionId: null,
  };
  await playgroundDb.transaction(
    "rw",
    [playgroundDb.sessions, playgroundDb.tasks, playgroundDb.assignments],
    async () => {
      await playgroundDb.sessions.add(session);
      await playgroundDb.tasks.bulkAdd(tasks);
      await playgroundDb.assignments.update(assignment.id, {
        status: "launching",
      });
    },
  );
  localStorage.setItem("playground.activeSessionId", sessionId);
  localStorage.setItem("playground.lastMode", mode);
  return session;
}

export async function completeAllTasks(sessionId: string): Promise<void> {
  const tasks = await playgroundDb.tasks
    .where("sessionId")
    .equals(sessionId)
    .toArray();
  await playgroundDb.tasks.bulkPut(
    tasks.map((task) => ({
      ...task,
      status: "completed",
      difficulty: task.difficulty ?? "moderate",
      outcome: task.outcome || "Completed during the guided demo session.",
      startedAt: task.startedAt ?? Date.now(),
      completedAt: task.completedAt ?? Date.now(),
    })),
  );
  await playgroundDb.sessions.update(sessionId, {
    state: "reviewing",
    endedAt: Date.now(),
  });
}

export async function completeSessionTask(
  sessionId: string,
  taskId: string,
): Promise<{ allComplete: boolean }> {
  const tasks = await playgroundDb.tasks
    .where("sessionId")
    .equals(sessionId)
    .sortBy("sequence");
  const currentIndex = tasks.findIndex((task) => task.id === taskId);
  if (currentIndex < 0) {
    throw new Error("The active task could not be found.");
  }

  const now = Date.now();
  const current = tasks[currentIndex]!;
  const next = tasks[currentIndex + 1] ?? null;
  await playgroundDb.transaction(
    "rw",
    [playgroundDb.tasks, playgroundDb.sessions],
    async () => {
      await playgroundDb.tasks.update(current.id, {
        status: "completed",
        difficulty: current.difficulty ?? "moderate",
        outcome: current.outcome || "Completed in the live product session.",
        startedAt: current.startedAt ?? now,
        completedAt: now,
      });
      if (next) {
        await playgroundDb.tasks.update(next.id, {
          status: "ready",
          startedAt: next.startedAt ?? now,
        });
        await playgroundDb.sessions.update(sessionId, {
          currentTaskId: next.id,
        });
      } else {
        await playgroundDb.sessions.update(sessionId, {
          state: "reviewing",
          endedAt: now,
        });
      }
    },
  );
  return { allComplete: next === null };
}

export async function saveFeedbackCapture({
  sessionId,
  category,
  text,
  pageUrl,
  viewport,
}: FeedbackCaptureInput): Promise<FeedbackItem> {
  const session = await playgroundDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("The testing session is no longer available.");
  }
  const task =
    (await playgroundDb.tasks.get(session.currentTaskId)) ??
    (await playgroundDb.tasks
      .where("sessionId")
      .equals(sessionId)
      .first());
  if (!task) {
    throw new Error("Start a task before saving feedback.");
  }
  const latestVisit = await playgroundDb.screenVisits
    .where("sessionId")
    .equals(sessionId)
    .last();
  const now = Date.now();
  const feedbackId = `feedback-${crypto.randomUUID()}`;
  const severity: FeedbackItem["severity"] =
    category === "broken"
      ? "high"
      : category === "frustrating" || category === "confusing"
        ? "medium"
        : "low";
  const scope: FeedbackItem["scope"] =
    category === "overall" ? "product" : "screen";
  const feedback: FeedbackItem = {
    id: feedbackId,
    sessionId,
    projectId: session.projectId,
    assignmentId: session.assignmentId,
    taskId: task.id,
    category,
    scope,
    originalText: text,
    summary: text,
    severity,
    screenshotIds: [],
    voiceNoteId: null,
    followUpAnswers: {},
    status: "saved",
    createdAt: now,
    updatedAt: now,
  };
  const capsule: EvidenceCapsule = {
    id: `evidence-${crypto.randomUUID()}`,
    feedbackId,
    sessionId,
    projectId: session.projectId,
    assignmentId: session.assignmentId,
    reviewerId: session.reviewerId,
    taskId: task.id,
    screenVisitId: latestVisit?.id ?? null,
    pageUrl,
    viewport,
    category,
    scope,
    originalText: text,
    reviewerApprovedSummary: text,
    severity,
    screenshotIds: [],
    voiceNoteId: null,
    professionalBasis: "Direct professional experience",
    createdAt: now,
    updatedAt: now,
  };
  await playgroundDb.transaction(
    "rw",
    [playgroundDb.feedback, playgroundDb.evidence],
    async () => {
      await playgroundDb.feedback.add(feedback);
      await playgroundDb.evidence.add(capsule);
    },
  );
  return feedback;
}

export async function saveScreenVisits(
  sessionId: string,
  screens: Array<{
    id: string;
    name: string;
    url: string;
    visitedAt: number;
  }>,
): Promise<void> {
  const existing = await playgroundDb.screenVisits
    .where("sessionId")
    .equals(sessionId)
    .toArray();
  const known = new Set(existing.map((visit) => visit.id));
  const additions: ScreenVisit[] = screens
    .filter((screen) => !known.has(`${sessionId}-${screen.id}`))
    .map((screen, index) => {
      let route = screen.url;
      try {
        route = new URL(screen.url).pathname || "/";
      } catch {
        // Browserbase may briefly return a browser-internal URL.
      }
      return {
        id: `${sessionId}-${screen.id}`,
        sessionId,
        sequence: existing.length + index + 1,
        url: screen.url,
        route,
        title: screen.name,
        enteredAt: screen.visitedAt,
        exitedAt: null,
        timeSpentMs: 0,
        feedbackCount: 0,
      };
    });
  if (additions.length > 0) {
    await playgroundDb.screenVisits.bulkAdd(additions);
  }
}

export async function importExtensionEvidence(
  sessionId: string,
  entries: ExtensionEvidenceInput[],
): Promise<number> {
  const session = await playgroundDb.sessions.get(sessionId);
  if (!session) {
    return 0;
  }
  const tasks = await playgroundDb.tasks
    .where("sessionId")
    .equals(sessionId)
    .sortBy("sequence");
  let imported = 0;
  for (const entry of entries) {
    const feedbackId = `extension-${entry.id}`;
    if (await playgroundDb.feedback.get(feedbackId)) {
      continue;
    }
    const task = tasks[Math.min(entry.taskIndex, tasks.length - 1)] ?? tasks[0];
    if (!task) {
      continue;
    }
    const screenshotIds: string[] = [];
    if (entry.screenshotDataUrl?.startsWith("data:image/")) {
      const screenshotId = `extension-shot-${entry.id}`;
      const blob = await fetch(entry.screenshotDataUrl).then((response) =>
        response.blob(),
      );
      await playgroundDb.screenshots.put({
        id: screenshotId,
        sessionId,
        blob,
        mimeType: blob.type || "image/png",
        width: 0,
        height: 0,
        createdAt: entry.createdAt,
      });
      screenshotIds.push(screenshotId);
    }
    const severity: FeedbackItem["severity"] =
      entry.category === "broken"
        ? "high"
        : entry.category === "confusing" ||
            entry.category === "frustrating"
          ? "medium"
          : "low";
    const feedback: FeedbackItem = {
      id: feedbackId,
      sessionId,
      projectId: session.projectId,
      assignmentId: session.assignmentId,
      taskId: task.id,
      category: entry.category,
      scope: entry.category === "overall" ? "product" : "screen",
      originalText: entry.text,
      summary: entry.text,
      severity,
      screenshotIds,
      voiceNoteId: null,
      followUpAnswers: {},
      status: "saved",
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
    };
    await playgroundDb.transaction(
      "rw",
      [playgroundDb.feedback, playgroundDb.evidence],
      async () => {
        await playgroundDb.feedback.add(feedback);
        await playgroundDb.evidence.add({
          id: `extension-evidence-${entry.id}`,
          feedbackId,
          sessionId,
          projectId: session.projectId,
          assignmentId: session.assignmentId,
          reviewerId: session.reviewerId,
          taskId: task.id,
          screenVisitId: null,
          pageUrl: entry.pageUrl,
          viewport: "desktop",
          category: entry.category,
          scope: feedback.scope,
          originalText: entry.text,
          reviewerApprovedSummary: entry.text,
          severity,
          screenshotIds,
          voiceNoteId: null,
          professionalBasis: "Direct professional experience",
          createdAt: entry.createdAt,
          updatedAt: entry.createdAt,
        });
      },
    );
    imported += 1;
  }
  return imported;
}

export async function saveVoiceNote(
  sessionId: string,
  audio: Blob,
  durationMs: number,
  transcript: string,
): Promise<VoiceNote> {
  const session = await playgroundDb.sessions.get(sessionId);
  const task = session
    ? await playgroundDb.tasks.get(session.currentTaskId)
    : undefined;
  if (!session || !task) {
    throw new Error("The active task could not be found.");
  }
  const note: VoiceNote = {
    id: `voice-${crypto.randomUUID()}`,
    sessionId,
    taskId: task.id,
    audio,
    durationMs,
    rawTranscript: transcript,
    editedTranscript: transcript,
    transcriptionStatus: transcript ? "manual" : "unsupported",
    createdAt: Date.now(),
  };
  await playgroundDb.voices.add(note);
  return note;
}

export async function submitSession(sessionId: string): Promise<void> {
  const session = await playgroundDb.sessions.get(sessionId);
  const verdict = await playgroundDb.verdicts
    .where("sessionId")
    .equals(sessionId)
    .first();
  if (!session || !verdict) {
    throw new Error("Complete the expert verdict before submission.");
  }
  const tasks = await playgroundDb.tasks
    .where("sessionId")
    .equals(sessionId)
    .toArray();
  if (tasks.some((task) => task.required && task.status !== "completed")) {
    throw new Error("Complete every required task before submission.");
  }
  const now = Date.now();
  await playgroundDb.transaction(
    "rw",
    [
      playgroundDb.sessions,
      playgroundDb.assignments,
      playgroundDb.earnings,
      playgroundDb.reviewers,
    ],
    async () => {
      await playgroundDb.sessions.update(sessionId, {
        state: "submitted",
        endedAt: session.endedAt ?? now,
        submittedAt: now,
      });
      await playgroundDb.assignments.update(session.assignmentId, {
        status: "submitted",
        submittedAt: now,
      });
      await playgroundDb.earnings.put({
        id: `earning-${sessionId}`,
        sessionId,
        projectId: session.projectId,
        amount: 8,
        currency: "AUD",
        status: "pending",
        description: "Ingen prototype teardown",
        submittedAt: now,
        approvedAt: null,
        paidAt: null,
      });
      const reviewer = await playgroundDb.reviewers.get(session.reviewerId);
      if (reviewer) {
        await playgroundDb.reviewers.put({
          ...reviewer,
          completedTests: Math.max(13, reviewer.completedTests + 1),
        });
      }
    },
  );
  localStorage.removeItem("playground.activeSessionId");
}
