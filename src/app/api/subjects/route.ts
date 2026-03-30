import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, language, topics } = body;

  if (!name || !topics || !Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json({ error: "Chýbajú povinné polia." }, { status: 400 });
  }

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .insert({ user_id: user.id, name, description, language: language ?? "sk", is_builtin: false })
    .select()
    .single();

  if (subjectError) {
    return NextResponse.json({ error: subjectError.message }, { status: 500 });
  }

  const topicRows = topics.map((t: { title: string; content: string }, idx: number) => ({
    subject_id: subject.id,
    title: t.title,
    content: t.content,
    order_index: idx,
  }));

  const { error: topicsError } = await supabase.from("topics").insert(topicRows);
  if (topicsError) {
    await supabase.from("subjects").delete().eq("id", subject.id);
    return NextResponse.json({ error: topicsError.message }, { status: 500 });
  }

  return NextResponse.json({ id: subject.id });
}
