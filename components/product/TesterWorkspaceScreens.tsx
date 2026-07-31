"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { acceptProject, playgroundDb } from "@/lib/product/db";
import { TesterShell } from "@/components/product/TesterProduct";

function money(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TesterProjectWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useLiveQuery(() => playgroundDb.projects.get(projectId), [projectId]);
  const assignment = useLiveQuery(
    () => playgroundDb.assignments.where("projectId").equals(projectId).first(),
    [projectId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (project === undefined) {
    return <TesterShell><main className="product-page"><div className="empty-product-state"><h1>Opening workspace…</h1></div></main></TesterShell>;
  }

  if (!project) {
    return <TesterShell><main className="product-page"><div className="empty-product-state"><h1>Project not found</h1><Link href="/tester/projects">Return to projects</Link></div></main></TesterShell>;
  }

  const openWorkspace = async () => {
    setBusy(true);
    setError(null);
    try {
      if (assignment?.status !== "accepted" && assignment?.status !== "launching" && assignment?.status !== "in-progress") {
        await acceptProject(project.id);
      }
      router.push(`/tester/projects/${project.id}/mode`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This workspace could not be opened.");
      setBusy(false);
    }
  };

  return (
    <TesterShell>
      <main className="product-page workspace-page">
        <div className="workspace-breadcrumb">
          <Link href="/tester/projects">Projects</Link><span>→</span><strong>{project.name} workspace</strong>
        </div>
        <section className="workspace-heading">
          <div>
            <span className="eyebrow">HR technology · matched workspace</span>
            <h1>{project.name} review workspace</h1>
            <p>{project.tagline}. Everything needed for this review is collected here before the secure browser opens.</p>
          </div>
          <div className="workspace-heading__reward"><span>Tester payout</span><strong>{money(30)}</strong><small>Paid by Pinch on approval</small></div>
        </section>

        <section className="workspace-layout">
          <div className="workspace-browser">
            <div className="workspace-browser__bar"><span className="browser-dots"><i /><i /><i /></span><code>{project.url ?? "ingenworkspace.com"}</code><span className="browser-secure">Authorised preview</span></div>
            <div className="workspace-browser__content">
              <div className="workspace-product-nav"><strong>INGEN</strong><span>Product</span><span>How it works</span><span>For recruiters</span><button type="button">Request a demo</button></div>
              <div className="workspace-product-hero"><span className="eyebrow">Proof-first hiring</span><h2>See what candidates can do before you decide.</h2><p>Review the product as an HR professional. Look for evidence, clarity, and the handoff into a real hiring workflow.</p><div><span className="workspace-pill">Candidate signal</span><span className="workspace-pill">Evidence trail</span></div></div>
              <div className="workspace-browser__footer"><span>Product browser preview</span><strong>Launch a secure session to interact</strong></div>
            </div>
          </div>

          <aside className="workspace-rail">
            <div className="workspace-rail__top"><span className="eyebrow">01 · Workspace tools</span><span className="workspace-status">Ready</span></div>
            <h2>Review this product like an HR buyer</h2>
            <p className="workspace-rail__intro">Your field match is strongest on recruitment workflows, technical hiring, and SaaS adoption.</p>
            <div className="workspace-resource-list">
              <Link href={`/tester/projects/${project.id}`}><span>↗</span><div><strong>Project brief</strong><small>Objective, founder questions, and scope</small></div></Link>
              <Link href="#task-plan"><span>✓</span><div><strong>Task plan</strong><small>{project.taskCount} guided tasks · {project.estimatedMinutes} minutes</small></div></Link>
              <Link href="#evidence-rubric"><span>◎</span><div><strong>Evidence rubric</strong><small>Specific, professional, actionable notes</small></div></Link>
            </div>
            {error && <p className="inline-error">{error}</p>}
            <button className="primary-action workspace-launch" disabled={busy} onClick={() => void openWorkspace()} type="button">{busy ? "Opening secure browser…" : "Open review workspace →"}</button>
            <small className="workspace-privacy">Private session · your notes stay attached to this assignment</small>
          </aside>
        </section>

        <section id="task-plan" className="workspace-section-grid">
          <article className="workspace-panel"><span className="eyebrow">02 · Task plan</span><h2>What you will answer</h2><ol className="workspace-task-list"><li><span>01</span><div><strong>Understand the product promise</strong><small>Can an HR buyer explain Ingen in one sentence?</small></div></li><li><span>02</span><div><strong>Create a senior engineering role</strong><small>Does the workflow feel natural and trustworthy?</small></div></li><li><span>03</span><div><strong>Review a candidate recommendation</strong><small>Is there enough evidence behind the ranking?</small></div></li><li><span>04</span><div><strong>Pressure-test the handoff</strong><small>What should change before an HR team pilots it?</small></div></li></ol></article>
          <article id="evidence-rubric" className="workspace-panel workspace-panel--dark"><span className="eyebrow">03 · Evidence rubric</span><h2>Useful notes are specific</h2><div className="rubric-row"><strong>Confusing</strong><span>What did you expect instead?</span></div><div className="rubric-row"><strong>Trust</strong><span>What proof would make the decision safer?</span></div><div className="rubric-row"><strong>Broken</strong><span>What blocked the task or next action?</span></div><Link className="workspace-text-link" href={`/tester/projects/${project.id}/mode`}>View testing modes →</Link></article>
        </section>
      </main>
    </TesterShell>
  );
}
