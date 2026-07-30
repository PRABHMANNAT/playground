import { SessionReview } from "@/components/product/TesterProduct";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SessionReview sessionId={sessionId} />;
}
