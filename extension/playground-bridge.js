window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === "PLAYGROUND_EXTENSION_PING") {
    chrome.runtime.sendMessage({ type: "PLAYGROUND_PING" }, (response) => {
      window.postMessage(
        {
          type: "PLAYGROUND_EXTENSION_PONG",
          requestId: event.data.requestId,
          connected: Boolean(response?.connected),
          version: response?.version,
        },
        window.location.origin,
      );
    });
  }

  if (event.data.type === "PLAYGROUND_EXTENSION_START") {
    chrome.runtime.sendMessage(
      {
        type: "PLAYGROUND_START_SESSION",
        sessionId: event.data.sessionId,
        targetUrl: event.data.targetUrl,
        playgroundOrigin: window.location.origin,
      },
      (response) => {
        window.postMessage(
          {
            type: "PLAYGROUND_EXTENSION_STARTED",
            ok: Boolean(response?.ok),
            error: response?.error,
          },
          window.location.origin,
        );
      },
    );
  }

  if (event.data.type === "PLAYGROUND_EXTENSION_REQUEST_EXPORT") {
    chrome.runtime.sendMessage(
      {
        type: "PLAYGROUND_GET_SESSION_DATA",
        sessionId: event.data.sessionId,
      },
      (response) => {
        window.postMessage(
          {
            type: "PLAYGROUND_EXTENSION_EXPORT",
            sessionId: event.data.sessionId,
            evidence: response?.evidence ?? [],
          },
          window.location.origin,
        );
      },
    );
  }
});
