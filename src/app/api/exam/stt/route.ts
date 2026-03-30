import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const audio = formData.get("audio") as File;
  const language = (formData.get("language") as string) ?? "sk";

  if (!audio) return NextResponse.json({ error: "audio required" }, { status: 400 });

  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    language: language === "en" ? "en" : "sk",
  });

  return NextResponse.json({ text: transcription.text });
}
