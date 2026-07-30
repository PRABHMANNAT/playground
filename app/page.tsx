import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Get your first useful users",
  description:
    "Paste your product. Fund a validation campaign. Matched users test it. Get three fixes and a launch decision.",
};

export default function Home() {
  return <LandingPage />;
}
