import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { streamExaminerResponse, type ConversationMessage, type ExamContext } from "@/lib/claude-examiner";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, history } = await request.json() as {
    sessionId: string;
    history: ConversationMessage[];
  };

  // Verify session
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("*, subjects(name, language), topics(title, content)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "Session not found or not active" }, { status: 404 });
  }

  const ctx: ExamContext = {
    subjectName: (session.subjects as any).name,
    topicTitle: (session.topics as any).title,
    topicContent: (session.topics as any).content,
    language: (session.subjects as any).language as "sk" | "en",
  };

  // Stream response back
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamExaminerResponse(ctx, history, (chunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "AI chyba" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
