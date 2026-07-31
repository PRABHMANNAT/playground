"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DEMO_CAMPAIGN_ID, getCampaign } from "@/lib/campaign/store";

import styles from "./role-navigation.module.css";

type Role = "founder" | "tester";

type RoleNavigationProps = {
  variant?: "floating" | "header" | "landing";
};

function readRole(): Role | null {
  const cookieRole = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("playground_role="))
    ?.split("=")[1];

  if (cookieRole === "founder" || cookieRole === "tester") {
    return cookieRole;
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem("playground-demo-entry") ?? "null",
    ) as { role?: string } | null;
    return stored?.role === "founder" || stored?.role === "tester"
      ? stored.role
      : null;
  } catch {
    return null;
  }
}

export function RoleNavigation({
  variant = "floating",
}: RoleNavigationProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [activeRun, setActiveRun] = useState(false);
  const [runDestination, setRunDestination] = useState(
    `/campaigns/${DEMO_CAMPAIGN_ID}/scout`,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentRole = readRole();
      setRole(currentRole);

      if (currentRole !== "founder") {
        setActiveRun(false);
        return;
      }

      void getCampaign(DEMO_CAMPAIGN_ID).then((run) => {
        const isActive = !!run && run.status !== "draft";
        setActiveRun(isActive);
        setRunDestination(
          run?.status === "results_ready"
            ? `/campaigns/${DEMO_CAMPAIGN_ID}/results`
            : `/campaigns/${DEMO_CAMPAIGN_ID}/scout`,
        );
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (
    variant === "floating" &&
    (pathname === "/" || pathname === "/start" || pathname === "/founder/new")
  ) {
    return null;
  }

  const primary =
    role === "tester"
      ? { label: "My earnings", href: "/tester" }
      : role === "founder" && activeRun
        ? { label: "My run", href: runDestination }
        : role === "founder"
          ? { label: "New validation", href: "/founder/new" }
          : { label: "Open Playground", href: "/start" };

  if (variant === "landing") {
    return (
      <div className={styles.landingActions}>
        <Link
          className="landing-btn landing-btn--primary landing-btn--nav"
          href="/start"
        >
          Open Playground
        </Link>
      </div>
    );
  }

  if (variant === "header") {
    return (
      <nav className={styles.header} aria-label="Workspace navigation">
        <Link className={styles.headerSwitch} href="/start">
          Switch role
        </Link>
        <Link className={styles.headerPrimary} href={primary.href}>
          {primary.label}
        </Link>
      </nav>
    );
  }

  return (
    <nav className={styles.floating} aria-label="Workspace navigation">
      <Link className={styles.switchLink} href="/start">
        Switch role
      </Link>
      <Link className={styles.primaryLink} href={primary.href}>
        {primary.label}
      </Link>
    </nav>
  );
}
