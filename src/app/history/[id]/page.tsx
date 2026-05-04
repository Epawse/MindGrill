import { notFound, redirect } from "next/navigation";

import { getServerUser } from "@/lib/auth/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSessionById } from "@/lib/supabase/sessions";
import { GrillSessionSchema } from "@/lib/schemas/grill";
import type { GrillQuestion, GrillSession, Revision } from "@/lib/schemas/grill";

import { HistoryHydrator } from "./history-hydrator";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoryDetailPage({ params }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/history");
  const user = await getServerUser();
  if (!user) {
    const { id } = await params;
    redirect(`/auth/sign-in?next=/history/${id}`);
  }

  const { id } = await params;
  const row = await getSessionById(id);
  if (!row) notFound();

  const sessionParse = GrillSessionSchema.safeParse(row.tree_snapshot);
  if (!sessionParse.success) notFound();
  const session: GrillSession = sessionParse.data;

  const lastQuestion = pickLastQuestion(session);
  const revision = (row.revision ?? null) as Revision | null;
  const revisedDraft = row.revised_draft;

  return (
    <HistoryHydrator
      scenario={session.scenario}
      session={session}
      lastQuestion={lastQuestion}
      revision={revision}
      revisedDraft={revisedDraft}
      status={row.status}
      redirectTo={`/grill/${session.scenario}`}
    />
  );
}

function pickLastQuestion(session: GrillSession): GrillQuestion | null {
  if (!session.activeNodeId) return null;
  const node = session.nodes[session.activeNodeId];
  return node?.question ?? null;
}
