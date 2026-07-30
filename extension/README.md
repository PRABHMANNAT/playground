# Playground Tester Chrome extension

This unpacked Manifest V3 extension is the real-page testing mode for the demo.
It is intentionally restricted to the Playground deployment, local development,
and the Ingen demo product.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `extension` directory.
4. Open the Playground Chrome-mode preparation page.
5. The page detects the extension and can open Ingen with the tester overlay.

The overlay stores feedback in `chrome.storage.local`, captures screenshots only
after an explicit click, and returns evidence to the Playground review page
through the content-script bridge. No credentials or input values are collected.
