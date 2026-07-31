import type { Metadata } from "next";

import { StartScreen } from "@/components/start/StartScreen";

export const metadata: Metadata = {
  title: "Choose your workspace",
  description:
    "Choose a founder or tester workspace and continue with a quick test-mode entry.",
};

export default function StartPage() {
  return <StartScreen />;
}
