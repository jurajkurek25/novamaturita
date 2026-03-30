"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Topic {
  title: string;
  content: string;
}

export default function AddSubjectForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("sk");
  const [topics, setTopics] = useState<Topic[]>([{ title: "", content: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTopic() {
    setTopics((prev) => [...prev, { title: "", content: "" }]);
  }

  function removeTopic(idx: number) {
    setTopics((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTopic(idx: number, field: keyof Topic, value: string) {
    setTopics((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (topics.some((t) => !t.title || !t.content)) {
      setError("Vyplň názov aj obsah každého okruhu.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, language, topics }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Chyba pri ukladaní.");
    } else {
      setOpen(false);
      setName(""); setDescription(""); setTopics([{ title: "", content: "" }]);
      router.refresh();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-5 w-full text-slate-400 hover:text-blue-400 transition-colors text-sm font-medium"
      >
        + Pridať vlastný predmet
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Nový predmet</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm">
          Zrušiť
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">Názov predmetu</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="napr. Grafika a dizajn"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Popis (voliteľný)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Krátky popis predmetu"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Jazyk skúšky</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sk">Slovenčina</option>
            <option value="en">Angličtina</option>
          </select>
        </div>
      </div>

      {/* Topics */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">Okruhy (témy)</label>
          <button
            type="button"
            onClick={addTopic}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            + Pridať okruh
          </button>
        </div>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {topics.map((topic, idx) => (
            <div key={idx} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs w-5 text-center">{idx + 1}.</span>
                <input
                  value={topic.title}
                  onChange={(e) => updateTopic(idx, "title", e.target.value)}
                  placeholder="Názov okruhu"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {topics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTopic(idx)}
                    className="text-slate-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <textarea
                value={topic.content}
                onChange={(e) => updateTopic(idx, "content", e.target.value)}
                placeholder="Obsah okruhu – čo by mal žiak vedieť, kľúčové pojmy, fakty..."
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 rounded-lg font-semibold text-white text-sm transition-colors"
      >
        {loading ? "Ukladám..." : "Uložiť predmet"}
      </button>
    </form>
  );
}
