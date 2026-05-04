"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGrillStore } from "@/stores/grill-store";
import type {
  GrillQuestion,
  GrillSession,
  Revision,
  ScenarioId,
} from "@/lib/schemas/grill";

interface HydrateProps {
  scenario: ScenarioId;
  session: GrillSession;
  lastQuestion: GrillQuestion | null;
  revision: Revision | null;
  revisedDraft: string | null;
  status: "grilling" | "complete";
  redirectTo: string;
}

/**
 * Server-rendered history detail pages re-hydrate the Zustand store from the
 * persisted row, then redirect into the live grill page so the user can resume
 * mid-flow or review the completed run.
 */
export function HistoryHydrator({
  scenario,
  session,
  lastQuestion,
  revision,
  revisedDraft,
  status,
  redirectTo,
}: HydrateProps) {
  const router = useRouter();
  const store = useGrillStore();

  useEffect(() => {
    if (status === "complete" && revision && revisedDraft) {
      store.completeWith({
        session,
        revision,
        revisedDraft,
      });
    } else if (lastQuestion) {
      store.startSession({ scenario, session, question: lastQuestion });
    } else {
      store.setSession(session);
    }
    router.replace(redirectTo);
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center text-[var(--color-fg-muted)] font-sans text-sm">
      正在恢复你的会话…
    </main>
  );
}
