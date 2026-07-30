import { ModeSelection } from "@/components/product/TesterProduct";

export default async function ProjectModePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ModeSelection projectId={projectId} />;
}
