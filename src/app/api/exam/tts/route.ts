import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, language } = await request.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: language === "en" ? "alloy" : "nova",
    input: text.slice(0, 4096),
    speed: 0.95,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
    },
  });
}
