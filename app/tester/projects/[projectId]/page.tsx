import { ProjectBrief } from "@/components/product/TesterProduct";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectBrief projectId={projectId} />;
}
