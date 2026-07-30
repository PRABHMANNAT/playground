import type { Metadata } from "next";

import { FoundingUsersClient } from "@/components/campaigns/FoundingUsersClient";

export const metadata: Metadata = {
  title: "Founding-user activation",
  description:
    "A prototype activation ledger for rewarding verified product adoption.",
};

export default async function FoundingUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FoundingUsersClient campaignId={id} />;
}
