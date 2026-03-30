import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CREDITS_PER_SESSION } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subjectId } = await request.json();
  if (!subjectId) return NextResponse.json({ error: "subjectId required" }, { status: 400 });

  // Verify subject belongs to user
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, language")
    .eq("id", subjectId)
    .eq("user_id", user.id)
    .single();
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // Pick a random topic
  const { data: topics } = await supabase
    .from("topics")
    .select("id, title, content")
    .eq("subject_id", subjectId);
  if (!topics || topics.length === 0) {
    return NextResponse.json({ error: "Predmet nemá žiadne okruhy." }, { status: 400 });
  }
  const topic = topics[Math.floor(Math.random() * topics.length)];

  // Deduct credits atomically
  const { data: ok } = await supabase.rpc("deduct_credits", {
    p_user_id: user.id,
    p_amount: CREDITS_PER_SESSION,
    p_description: `Skúšanie: ${subject.name} – ${topic.title}`,
  });
  if (!ok) {
    return NextResponse.json({ error: "Nedostatok kreditov." }, { status: 402 });
  }

  // Create session record
  const { data: session, error } = await supabase
    .from("exam_sessions")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      topic_id: topic.id,
      status: "active",
      credits_used: CREDITS_PER_SESSION,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    sessionId: session.id,
    subject: { id: subject.id, name: subject.name, language: subject.language },
    topic: { id: topic.id, title: topic.title, content: topic.content },
  });
}
