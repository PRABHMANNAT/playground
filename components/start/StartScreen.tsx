"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./start.module.css";

type Role = "founder" | "tester";

const ROLE_DETAILS = {
  founder: {
    eyebrow: "FOUNDER",
    heading: "I'm a founder",
    subheading: "Validate a product before you launch",
    terminal: "> initialising founder workspace",
    destination: "/founder/new",
    cta: "Start a validation",
  },
  tester: {
    eyebrow: "TESTER",
    heading: "I'm a tester",
    subheading: "Get paid to test real products",
    terminal: "> loading available validation runs",
    destination: "/tester/projects",
    cta: "Find work",
  },
} as const;

export function StartScreen() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [typedLine, setTypedLine] = useState("");
  const [typingComplete, setTypingComplete] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const dismissEntry = () => {
    setActiveRole(null);
    setTypedLine("");
    setTypingComplete(false);
  };

  const chooseRole = (role: Role) => {
    setName("");
    setEmail("");
    setTypedLine("");
    setTypingComplete(false);
    setActiveRole(role);
  };

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get(
      "role",
    );
    if (requestedRole === "founder" || requestedRole === "tester") {
      const timer = window.setTimeout(() => setActiveRole(requestedRole), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!activeRole) {
      return;
    }

    const line = ROLE_DETAILS[activeRole].terminal;
    let position = 0;

    const timer = window.setInterval(() => {
      position += 1;
      setTypedLine(line.slice(0, position));

      if (position >= line.length) {
        window.clearInterval(timer);
        setTypingComplete(true);
      }
    }, 16);

    return () => window.clearInterval(timer);
  }, [activeRole]);

  useEffect(() => {
    if (!activeRole) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissEntry();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeRole]);

  useEffect(() => {
    if (typingComplete) {
      nameInputRef.current?.focus();
    }
  }, [typingComplete]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeRole || !name.trim() || !email.trim()) {
      return;
    }

    const entry = {
      role: activeRole,
      name: name.trim(),
      email: email.trim(),
    };

    try {
      window.localStorage.setItem("playground-demo-entry", JSON.stringify(entry));
    } catch {
      // Demo entry still proceeds if browser storage is unavailable.
    }
    document.cookie = `playground_role=${activeRole}; Path=/; Max-Age=2592000; SameSite=Lax`;

    router.push(ROLE_DETAILS[activeRole].destination);
  };

  return (
    <main className={styles.screen}>
      <div
        className={`${styles.fork}${activeRole ? ` ${styles.forkBlurred}` : ""}`}
        aria-hidden={activeRole ? "true" : undefined}
      >
        {(Object.keys(ROLE_DETAILS) as Role[]).map((role) => {
          const detail = ROLE_DETAILS[role];

          return (
            <button
              className={styles.rolePanel}
              key={role}
              onClick={() => {
                if (role === "tester") {
                  router.push(detail.destination);
                  return;
                }
                chooseRole(role);
              }}
              tabIndex={activeRole ? -1 : 0}
              type="button"
            >
              <span className={styles.panelContent}>
                <span className={styles.eyebrow}>{detail.eyebrow}</span>
                <span className={styles.heading}>{detail.heading}</span>
                <span className={styles.subheading}>{detail.subheading}</span>
                <span className={styles.continue}>
                  {detail.cta}
                  <span aria-hidden="true">›</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {activeRole ? (
        <div
          className={styles.entryLayer}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              dismissEntry();
            }
          }}
          role="presentation"
        >
          <section
            className={styles.entryPanel}
            aria-labelledby="entry-title"
            role="dialog"
            aria-modal="true"
          >
            <p className={styles.entryEyebrow} id="entry-title">
              <span aria-hidden="true" />
              PLAYGROUND · {activeRole.toUpperCase()}
            </p>

            <p className={styles.terminalLine} aria-live="polite">
              {typedLine}
              <span className={styles.cursor} aria-hidden="true" />
            </p>

            {typingComplete ? (
              <form className={styles.form} onSubmit={handleSubmit}>
                <label>
                  <span>Name</span>
                  <input
                    autoComplete="name"
                    className={styles.blurredInput}
                    onChange={(event) => setName(event.target.value)}
                    ref={nameInputRef}
                    required
                    type="text"
                    value={name}
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    className={styles.blurredInput}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </label>

                <button type="submit">Enter workspace →</button>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
