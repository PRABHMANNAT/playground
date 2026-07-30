import "server-only";

import Browserbase from "@browserbasehq/sdk";

let client: Browserbase | null = null;

export function isBrowserbaseConfigured(): boolean {
  return Boolean(process.env.BROWSERBASE_API_KEY?.trim());
}

export function getBrowserbaseClient(): Browserbase {
  const apiKey = process.env.BROWSERBASE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("BROWSERBASE_NOT_CONFIGURED");
  }

  client ??= new Browserbase({
    apiKey,
    timeout: 20_000,
    maxRetries: 1,
  });

  return client;
}
