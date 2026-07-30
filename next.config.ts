import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright loads this manifest dynamically at runtime. Vercel's file tracer
  // cannot infer that access from the externalised package, so include it in the
  // Browserbase session function explicitly.
  outputFileTracingIncludes: {
    "/api/browser/session": [
      "./node_modules/playwright-core/browsers.json",
    ],
  },
};

export default nextConfig;
