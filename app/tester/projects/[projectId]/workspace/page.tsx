import { TesterLiveWorkspace } from "@/components/tester/TesterLiveWorkspace";

export default async function TesterProjectWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const runId = projectId === "ingen" ? "RUN_CMP_001" : `RUN_${projectId.toUpperCase()}`;
  return <TesterLiveWorkspace prefilled={query.demo === "1"} runId={runId} />;
}
