import { SubmittedDetail } from "@/components/product/TesterProduct";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SubmittedDetail sessionId={sessionId} />;
}
