"use client";

import { useState, useSyncExternalStore } from "react";

import { resetDemo } from "@/lib/campaign/store";

const subscribeToLocation = () => () => undefined;
const getServerSnapshot = () => false;
const getLocationSnapshot = () =>
  new URLSearchParams(window.location.search).get("demoControls") === "true";

export function DemoControls() {
  const visible = useSyncExternalStore(
    subscribeToLocation,
    getLocationSnapshot,
    getServerSnapshot,
  );
  const [resetting, setResetting] = useState(false);
  const developmentOnly = process.env.NODE_ENV !== "production";

  if (!developmentOnly || !visible) {
    return null;
  }

  const reset = async () => {
    if (
      !window.confirm(
        "Reset validation run cmp_001 to Draft and remove the live demo submission?",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await resetDemo();
      window.location.assign("/?demoControls=true");
    } catch (error) {
      console.error("Demo reset failed", error);
      setResetting(false);
    }
  };

  return (
    <aside className="demo-controls" aria-label="Development demo controls">
      <span>Development only</span>
      <button disabled={resetting} onClick={() => void reset()} type="button">
        {resetting ? "Resetting…" : "Reset demo"}
      </button>
    </aside>
  );
}
