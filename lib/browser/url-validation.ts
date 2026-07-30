import { z } from "zod";

export const MAX_BROWSER_URL_LENGTH = 2_048;

const BLOCKED_HOSTNAMES = new Set([
  "0.0.0.0",
  "localhost",
  "localhost.localdomain",
  "instance-data",
  "instance-data.ec2.internal",
  "metadata",
  "metadata.aws.internal",
  "metadata.google.internal",
]);

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return null;
  }

  const octets = parts.map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

function isNonPublicIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isNonPublicIpv6(hostname: string): boolean {
  const value = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (value === "::" || value === "::1") {
    return true;
  }

  if (/^(fc|fd)/.test(value) || /^fe[89ab]/.test(value)) {
    return true;
  }

  const mappedIpv4 = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (!mappedIpv4) {
    return false;
  }

  const octets = parseIpv4(mappedIpv4);
  return octets ? isNonPublicIpv4(octets) : false;
}

function hostnameError(hostname: string): string | null {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".home") ||
    normalized.endsWith(".lan")
  ) {
    return "Local and internal network addresses are not supported.";
  }

  const ipv4 = parseIpv4(normalized);
  if (ipv4 && isNonPublicIpv4(ipv4)) {
    return "Private, reserved, and link-local IP addresses are not supported.";
  }

  if (normalized.includes(":") && isNonPublicIpv6(normalized)) {
    return "Private, reserved, and link-local IP addresses are not supported.";
  }

  return null;
}

export function validatePublicHttpsUrl(
  input: string,
): { success: true; url: URL } | { success: false; message: string } {
  const value = input.trim();

  if (!value) {
    return { success: false, message: "Enter a product URL." };
  }

  if (value.length > MAX_BROWSER_URL_LENGTH) {
    return {
      success: false,
      message: `URL must be ${MAX_BROWSER_URL_LENGTH} characters or fewer.`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      success: false,
      message: "Enter a complete, valid URL beginning with https://.",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      success: false,
      message: "Only public HTTPS URLs are supported in this prototype.",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      success: false,
      message: "URLs containing usernames or passwords are not supported.",
    };
  }

  const blockedReason = hostnameError(parsed.hostname);
  if (blockedReason) {
    return { success: false, message: blockedReason };
  }

  return { success: true, url: parsed };
}

export const browserUrlSchema = z
  .string()
  .transform((value, context) => {
    const result = validatePublicHttpsUrl(value);
    if (!result.success) {
      context.addIssue({
        code: "custom",
        message: result.message,
      });
      return z.NEVER;
    }
    return result.url.toString();
  });

export const createSessionRequestSchema = z.object({
  url: browserUrlSchema,
  viewport: z.enum(["desktop", "mobile"]).default("desktop"),
});

export const stopSessionRequestSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(1, "Session ID is required.")
    .max(200, "Session ID is too long.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Session ID contains unsupported characters.",
    ),
});
