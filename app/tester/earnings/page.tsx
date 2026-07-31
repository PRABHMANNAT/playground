import type { Metadata } from "next";

import { TesterEarningsScreen } from "@/components/product/TesterEarningsScreen";

export const metadata: Metadata = {
  title: "Tester earning",
  description: "Track tester credits, completed tasks, referrals, and Pinch-managed payments.",
};

export default function TesterEarningsPage() {
  return <TesterEarningsScreen />;
}
