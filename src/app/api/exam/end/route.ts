import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateEvaluation, type ConversationMessage, type ExamContext } from "@/lib/claude-examiner";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, history, durationSeconds } = await request.json() as {
    sessionId: string;
    history: ConversationMessage[];
    durationSeconds: number;
  };

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("*, subjects(name, language), topics(title, content)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const ctx: ExamContext = {
    subjectName: (session.subjects as any).name,
    topicTitle: (session.topics as any).title,
    topicContent: (session.topics as any).content,
    language: (session.subjects as any).language as "sk" | "en",
  };

  const evaluation = await generateEvaluation(ctx, history);

  await supabase
    .from("exam_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      evaluation,
    })
    .eq("id", sessionId);

  return NextResponse.json({ evaluation });
}
