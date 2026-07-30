import { VerdictForm } from "@/components/product/TesterProduct";

export default async function VerdictPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <VerdictForm sessionId={sessionId} />;
}
