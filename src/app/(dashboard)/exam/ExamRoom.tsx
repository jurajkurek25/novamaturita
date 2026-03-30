"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CREDITS_PER_SESSION } from "@/types/database";

type Phase = "ready" | "active" | "ended";
type RecordState = "idle" | "recording" | "processing";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExamInfo {
  sessionId: string;
  topicTitle: string;
}

interface Evaluation {
  grade: number;
  comment: string;
  strengths: string[];
  weaknesses: string[];
}

export default function ExamRoom({
  subjectId,
  subjectName,
  language,
  credits,
}: {
  subjectId: string;
  subjectName: string;
  language: "sk" | "en";
  credits: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("ready");
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canStart = credits >= CREDITS_PER_SESSION;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function speakText(text: string) {
    setAiSpeaking(true);
    try {
      const res = await fetch("/api/exam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play();
      });
      URL.revokeObjectURL(url);
    } finally {
      setAiSpeaking(false);
    }
  }

  async function sendToAI(history: Message[]) {
    if (!examInfo) return;
    const res = await fetch("/api/exam/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: examInfo.sessionId, history }),
    });
    if (!res.ok) { setError("Chyba komunikácie s AI."); return; }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const { text } = JSON.parse(data);
          if (text) fullText += text;
        } catch {}
      }
    }

    const newMessages: Message[] = [...history, { role: "assistant", content: fullText }];
    setMessages(newMessages);
    await speakText(fullText);
    return newMessages;
  }

  async function startExam() {
    setError(null);
    const res = await fetch("/api/exam/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }

    setExamInfo({ sessionId: data.sessionId, topicTitle: data.topic.title });
    setPhase("active");
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // First AI message (greeting + topic)
    await sendToAI([]);
  }

  async function startRecording() {
    if (aiSpeaking) { audioRef.current?.pause(); setAiSpeaking(false); }
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecordState("recording");
  }

  async function stopRecording() {
    setRecordState("processing");
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    mr.stream.getTracks().forEach((t) => t.stop());

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "audio.webm");
    formData.append("language", language);

    const sttRes = await fetch("/api/exam/stt", { method: "POST", body: formData });
    const { text } = await sttRes.json();
    setRecordState("idle");

    if (!text?.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    await sendToAI(newMessages);
  }

  async function endExam() {
    if (!examInfo) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const res = await fetch("/api/exam/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: examInfo.sessionId,
        history: messages,
        durationSeconds: elapsedSeconds,
      }),
    });
    const data = await res.json();
    setEvaluation(data.evaluation);
    setPhase("ended");
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const gradeLabel = (g: number) =>
    ["", "Výborný (1)", "Chválitebný (2)", "Dobrý (3)", "Dostatočný (4)", "Nedostatočný (5)"][g] ?? g;

  // READY phase
  if (phase === "ready") {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 py-12">
        <h1 className="text-2xl font-bold">{subjectName}</h1>
        <p className="text-slate-400">
          AI vylosuje tému a bude hrať úlohu maturitného skúšajúceho. Skúška trvá cca 20–25 minút.
          Odpovedáš hlasom.
        </p>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 text-left space-y-2 text-sm text-slate-300">
          <p>Cena: <span className="text-yellow-400 font-semibold">10 kreditov</span></p>
          <p>Tvoje kredity: <span className="text-white font-semibold">{credits}</span></p>
          <p>Potrebuješ mikrofón (povolíš v prehliadači)</p>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {canStart ? (
          <button
            onClick={startExam}
            className="bg-blue-600 hover:bg-blue-500 px-10 py-3 rounded-xl font-semibold text-lg transition-colors"
          >
            Začať skúšanie
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-red-400 text-sm">Nedostatok kreditov</p>
            <a href="/billing" className="inline-block bg-yellow-600 hover:bg-yellow-500 px-8 py-2.5 rounded-lg font-semibold transition-colors">
              Kúpiť kredity
            </a>
          </div>
        )}
      </div>
    );
  }

  // ENDED phase
  if (phase === "ended" && evaluation) {
    const gradeColor = evaluation.grade <= 2 ? "text-green-400" : evaluation.grade === 3 ? "text-yellow-400" : "text-red-400";
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Výsledok skúšania</h1>
          <p className="text-slate-400 mt-1">{subjectName} — {examInfo?.topicTitle}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm mb-1">Hodnotenie</p>
          <p className={`text-4xl font-bold ${gradeColor}`}>{gradeLabel(evaluation.grade)}</p>
          <p className="text-slate-300 mt-3 text-sm">{evaluation.comment}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {evaluation.strengths.length > 0 && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
              <h3 className="text-green-400 font-semibold text-sm mb-2">Silné stránky</h3>
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => <li key={i} className="text-slate-300 text-sm">• {s}</li>)}
              </ul>
            </div>
          )}
          {evaluation.weaknesses.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
              <h3 className="text-red-400 font-semibold text-sm mb-2">Na zlepšenie</h3>
              <ul className="space-y-1">
                {evaluation.weaknesses.map((w, i) => <li key={i} className="text-slate-300 text-sm">• {w}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <a href={`/exam/new?subject=${subjectId}`} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg font-semibold transition-colors">
            Skúšať znova
          </a>
          <a href="/dashboard" className="bg-slate-700 hover:bg-slate-600 px-6 py-2.5 rounded-lg transition-colors">
            Na prehľad
          </a>
        </div>
      </div>
    );
  }

  // ACTIVE phase
  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="font-bold text-lg">{subjectName}</h1>
          {examInfo && <p className="text-slate-400 text-sm">{examInfo.topicTitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm font-mono">{formatTime(elapsedSeconds)}</span>
          <button
            onClick={endExam}
            className="bg-red-800/60 hover:bg-red-700/60 px-4 py-1.5 rounded-lg text-sm text-red-300 transition-colors"
          >
            Ukončiť
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-700 text-slate-100"
              }`}
            >
              {msg.role === "assistant" && (
                <p className="text-xs text-slate-400 mb-1 font-medium">Skúšajúci</p>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="shrink-0 flex flex-col items-center gap-3 pb-2">
        {aiSpeaking && (
          <p className="text-slate-400 text-sm animate-pulse">Skúšajúci hovorí...</p>
        )}
        {recordState === "processing" && (
          <p className="text-slate-400 text-sm animate-pulse">Spracovávam odpoveď...</p>
        )}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={aiSpeaking || recordState === "processing"}
          className={`w-20 h-20 rounded-full font-semibold text-sm transition-all select-none ${
            recordState === "recording"
              ? "bg-red-600 scale-110 shadow-lg shadow-red-900"
              : "bg-slate-700 hover:bg-slate-600 disabled:opacity-40"
          }`}
        >
          {recordState === "recording" ? "●" : "Drž\na hovor"}
        </button>
        <p className="text-slate-500 text-xs">Drž tlačidlo a hovor. Pusti pre odoslanie.</p>
      </div>
    </div>
  );
}
