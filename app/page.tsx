import type { Metadata } from "next";

import { LandingPageTwo } from "@/components/landing/LandingPageTwo";

export const metadata: Metadata = {
  title: "Get your first useful users",
  description:
    "Paste your product. Fund a validation run. Matched users test it. Get three fixes and a launch decision.",
};

export default function Home() {
  return <LandingPageTwo />;
}
