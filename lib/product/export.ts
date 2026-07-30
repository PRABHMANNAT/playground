"use client";

import JSZip from "jszip";

import { playgroundDb } from "@/lib/product/db";

export async function exportSessionArchive(sessionId: string): Promise<void> {
  const [
    session,
    tasks,
    feedback,
    evidence,
    visits,
    verdict,
    screenshots,
    voices,
  ] = await Promise.all([
    playgroundDb.sessions.get(sessionId),
    playgroundDb.tasks.where("sessionId").equals(sessionId).toArray(),
    playgroundDb.feedback.where("sessionId").equals(sessionId).toArray(),
    playgroundDb.evidence.where("sessionId").equals(sessionId).toArray(),
    playgroundDb.screenVisits.where("sessionId").equals(sessionId).toArray(),
    playgroundDb.verdicts.where("sessionId").equals(sessionId).first(),
    playgroundDb.screenshots.where("sessionId").equals(sessionId).toArray(),
    playgroundDb.voices.where("sessionId").equals(sessionId).toArray(),
  ]);
  if (!session) {
    throw new Error("This session is no longer stored on this device.");
  }

  const zip = new JSZip();
  zip.file(
    "session.json",
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        session,
        tasks,
        feedback,
        evidence,
        screenVisits: visits,
        verdict,
        screenshots: screenshots.map((record) => ({
          id: record.id,
          sessionId: record.sessionId,
          mimeType: record.mimeType,
          width: record.width,
          height: record.height,
          createdAt: record.createdAt,
        })),
        voiceNotes: voices.map((record) => ({
          id: record.id,
          sessionId: record.sessionId,
          taskId: record.taskId,
          durationMs: record.durationMs,
          rawTranscript: record.rawTranscript,
          editedTranscript: record.editedTranscript,
          transcriptionStatus: record.transcriptionStatus,
          createdAt: record.createdAt,
        })),
      },
      null,
      2,
    ),
  );
  for (const screenshot of screenshots) {
    zip.file(
      `screenshots/${screenshot.id}.${screenshot.mimeType.includes("jpeg") ? "jpg" : "png"}`,
      screenshot.blob,
    );
  }
  for (const voice of voices) {
    zip.file(`voice/${voice.id}.webm`, voice.audio);
  }

  const archive = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(archive);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `playground-${session.projectId}-${session.id}.zip`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
