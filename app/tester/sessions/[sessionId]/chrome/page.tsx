import { ChromePreparation } from "@/components/product/TesterProduct";

export default async function ChromeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ChromePreparation sessionId={sessionId} />;
}
