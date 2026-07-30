(() => {
  if (document.querySelector("playground-tester-overlay")) return;

  const sessionId = new URLSearchParams(window.location.search).get(
    "playgroundSession",
  );
  if (!sessionId) return;

  const host = document.createElement("playground-tester-overlay");
  const shadow = host.attachShadow({ mode: "open" });
  const tasks = [
    "Understand the product promise",
    "Create a Senior Backend Engineer job description",
    "Review the generated questions",
    "Evaluate the final shortlist workflow",
  ];
  let taskIndex = 0;
  let activeCategory = null;

  shadow.innerHTML = `
    <style>
      :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #24211d; }
      .task { pointer-events: auto; position: fixed; top: 14px; left: 50%; transform: translateX(-50%); width: min(720px, calc(100vw - 40px)); box-sizing: border-box; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px; padding: 10px 12px; background: #fbf8f2; border: 1px solid #d8d0c4; border-radius: 12px; box-shadow: 0 8px 28px rgba(43,36,28,.12); }
      .task span { color: #766e64; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
      .task strong { display: block; font-size: 13px; }
      button { font: inherit; }
      .complete { border: 0; border-radius: 8px; background: #27231f; color: white; padding: 9px 12px; cursor: pointer; }
      .dock { pointer-events: auto; position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; gap: 6px; padding: 7px; background: #fbf8f2; border: 1px solid #d8d0c4; border-radius: 14px; box-shadow: 0 10px 34px rgba(43,36,28,.16); }
      .dock button { min-width: 45px; border: 1px solid transparent; border-radius: 9px; background: transparent; padding: 8px 10px; color: #4b463f; cursor: pointer; }
      .dock button:hover, .dock button.active { border-color: #f47a45; background: #fff3ea; color: #9b421d; }
      .dock kbd { display: block; font-size: 9px; color: #91887d; }
      .composer { pointer-events: auto; position: fixed; right: 20px; bottom: 92px; width: min(360px, calc(100vw - 40px)); box-sizing: border-box; padding: 14px; background: #fbf8f2; border: 1px solid #d8d0c4; border-radius: 14px; box-shadow: 0 12px 38px rgba(43,36,28,.18); display: none; }
      .composer.open { display: block; }
      .composer textarea { width: 100%; box-sizing: border-box; min-height: 88px; resize: vertical; border: 1px solid #d8d0c4; border-radius: 9px; padding: 10px; background: white; color: #24211d; }
      .composer footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 9px; }
      .secondary { border: 1px solid #d8d0c4; background: white; border-radius: 8px; padding: 8px 10px; cursor: pointer; }
      .save { border: 0; background: #f47a45; color: #2b211b; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 700; }
      .notice { position: fixed; right: 20px; top: 20px; padding: 10px 12px; background: #e9f3e8; border: 1px solid #b9cfb6; border-radius: 9px; font-size: 12px; opacity: 0; transition: opacity .15s; }
      .notice.show { opacity: 1; }
    </style>
    <div class="task"><span id="step"></span><strong id="task"></strong><button class="complete">Complete task</button></div>
    <div class="dock">
      ${[
        ["confusing", "Confusing", "C"],
        ["broken", "Broken", "B"],
        ["frustrating", "Frustrating", "F"],
        ["suggestion", "Suggestion", "S"],
        ["works-well", "Good", "G"],
      ]
        .map(
          ([value, label, key]) =>
            `<button data-kind="${value}">${label}<kbd>${key}</kbd></button>`,
        )
        .join("")}
      <button data-kind="overall">Overall<kbd>O</kbd></button>
    </div>
    <section class="composer">
      <strong id="category"></strong>
      <p>Describe what happened and what you expected.</p>
      <textarea aria-label="Feedback note"></textarea>
      <footer><button class="secondary capture">Screenshot</button><button class="save">Save feedback</button></footer>
    </section>
    <div class="notice" role="status">Feedback saved for review.</div>
  `;
  document.documentElement.appendChild(host);

  const step = shadow.querySelector("#step");
  const task = shadow.querySelector("#task");
  const composer = shadow.querySelector(".composer");
  const textarea = shadow.querySelector("textarea");
  const notice = shadow.querySelector(".notice");
  let screenshotDataUrl = null;

  const renderTask = () => {
    step.textContent = `Task ${Math.min(taskIndex + 1, tasks.length)} of ${tasks.length}`;
    task.textContent = tasks[Math.min(taskIndex, tasks.length - 1)];
  };
  const openComposer = (kind) => {
    activeCategory = kind;
    shadow
      .querySelectorAll("[data-kind]")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.kind === kind),
      );
    shadow.querySelector("#category").textContent =
      kind === "works-well" ? "Good" : kind[0].toUpperCase() + kind.slice(1);
    composer.classList.add("open");
    textarea.focus();
  };

  shadow.querySelectorAll("[data-kind]").forEach((button) => {
    button.addEventListener("click", () => openComposer(button.dataset.kind));
  });
  shadow.querySelector(".complete").addEventListener("click", () => {
    taskIndex = Math.min(tasks.length, taskIndex + 1);
    if (taskIndex === tasks.length) {
      task.textContent = "All tasks complete — return to Playground to review.";
      step.textContent = "Ready for review";
      return;
    }
    renderTask();
  });
  shadow.querySelector(".capture").addEventListener("click", () => {
    chrome.runtime.sendMessage(
      { type: "PLAYGROUND_CAPTURE_SCREENSHOT" },
      (response) => {
        screenshotDataUrl = response?.dataUrl ?? null;
        shadow.querySelector(".capture").textContent = screenshotDataUrl
          ? "Screenshot attached"
          : "Capture failed";
      },
    );
  });
  shadow.querySelector(".save").addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!activeCategory || !text) return;
    chrome.runtime.sendMessage(
      {
        type: "PLAYGROUND_SAVE_FEEDBACK",
        sessionId,
        feedback: {
          id: crypto.randomUUID(),
          category: activeCategory,
          text,
          pageUrl: window.location.href,
          pageTitle: document.title,
          screenshotDataUrl,
          createdAt: Date.now(),
          taskIndex,
        },
      },
      (response) => {
        if (!response?.ok) return;
        textarea.value = "";
        screenshotDataUrl = null;
        composer.classList.remove("open");
        notice.classList.add("show");
        setTimeout(() => notice.classList.remove("show"), 1800);
      },
    );
  });
  window.addEventListener("keydown", (event) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)
    )
      return;
    const match = {
      c: "confusing",
      b: "broken",
      f: "frustrating",
      s: "suggestion",
      g: "works-well",
      o: "overall",
    }[event.key.toLowerCase()];
    if (match) openComposer(match);
  });
  renderTask();
})();
