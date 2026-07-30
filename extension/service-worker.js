const sessions = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PLAYGROUND_PING") {
    sendResponse({ connected: true, version: chrome.runtime.getManifest().version });
    return;
  }

  if (message?.type === "PLAYGROUND_START_SESSION") {
    const targetUrl = message.targetUrl;
    if (typeof targetUrl !== "string" || !targetUrl.startsWith("https://")) {
      sendResponse({ ok: false, error: "A public HTTPS target is required." });
      return;
    }
    void chrome.tabs.create({ url: targetUrl, active: true }).then((tab) => {
      if (tab.id) {
        sessions.set(message.sessionId, {
          sessionId: message.sessionId,
          tabId: tab.id,
          playgroundOrigin: message.playgroundOrigin,
          feedback: [],
        });
        void chrome.storage.local.set({
          [`session:${message.sessionId}`]: sessions.get(message.sessionId),
        });
      }
      sendResponse({ ok: true, tabId: tab.id });
    });
    return true;
  }

  if (message?.type === "PLAYGROUND_CAPTURE_SCREENSHOT" && sender.tab?.windowId) {
    void chrome.tabs
      .captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch(() =>
        sendResponse({ ok: false, error: "Screenshot capture failed." }),
      );
    return true;
  }

  if (message?.type === "PLAYGROUND_SAVE_FEEDBACK") {
    const key = `evidence:${message.sessionId}`;
    void chrome.storage.local.get(key).then((stored) => {
      const current = Array.isArray(stored[key]) ? stored[key] : [];
      return chrome.storage.local
        .set({ [key]: [...current, message.feedback] })
        .then(() => sendResponse({ ok: true }));
    });
    return true;
  }

  if (message?.type === "PLAYGROUND_GET_SESSION_DATA") {
    const key = `evidence:${message.sessionId}`;
    void chrome.storage.local.get(key).then((stored) => {
      sendResponse({
        ok: true,
        evidence: Array.isArray(stored[key]) ? stored[key] : [],
      });
    });
    return true;
  }
});
