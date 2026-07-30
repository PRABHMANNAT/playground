import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_BROWSER_URL_LENGTH,
  validatePublicHttpsUrl,
} from "../lib/browser/url-validation.ts";

const accepted = [
  "https://example.com",
  "https://subdomain.example.com/path?query=1",
];

const rejected = [
  "",
  "not a url",
  "http://example.com",
  "javascript:alert(1)",
  "data:text/html,<h1>test</h1>",
  "file:///etc/passwd",
  "https://localhost",
  "https://127.0.0.1",
  "https://0.0.0.0",
  "https://169.254.169.254",
  "https://user:password@example.com",
  "https://10.0.0.1",
  "https://172.16.0.1",
  "https://172.31.255.255",
  "https://192.168.1.1",
  `https://example.com/${"a".repeat(MAX_BROWSER_URL_LENGTH)}`,
];

for (const url of accepted) {
  test(`accepts ${url}`, () => {
    const result = validatePublicHttpsUrl(url);
    assert.equal(result.success, true);
  });
}

for (const url of rejected) {
  test(`rejects ${url.slice(0, 80) || "an empty string"}`, () => {
    const result = validatePublicHttpsUrl(url);
    assert.equal(result.success, false);
  });
}
