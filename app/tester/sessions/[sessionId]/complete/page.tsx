import { SubmissionReady } from "@/components/product/TesterProduct";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SubmissionReady sessionId={sessionId} />;
}
