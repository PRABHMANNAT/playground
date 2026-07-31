import { TesterLiveWorkspace } from "@/components/tester/TesterLiveWorkspace";

export default async function TesterWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const [{ runId }, query] = await Promise.all([params, searchParams]);
  return <TesterLiveWorkspace prefilled={query.demo === "1"} runId={runId} />;
}
