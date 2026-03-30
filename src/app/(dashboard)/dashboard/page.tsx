import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CREDITS_PER_SESSION } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: subjects }, { data: recentSessions }] = await Promise.all([
    supabase.from("profiles").select("credits, full_name").eq("id", user!.id).single(),
    supabase.from("subjects").select("id, name, is_builtin, language").eq("user_id", user!.id),
    supabase
      .from("exam_sessions")
      .select("id, status, started_at, ended_at, evaluation, subjects(name), topics(title)")
      .eq("user_id", user!.id)
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const credits = profile?.credits ?? 0;
  const canExam = credits >= CREDITS_PER_SESSION;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dobrý deň, {profile?.full_name?.split(" ")[0] ?? "študent"}</h1>
        <p className="text-slate-400 mt-1">Priprav sa na maturitu s AI skúšajúcim</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <p className="text-slate-400 text-sm">Kredity</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{credits}</p>
          <p className="text-slate-500 text-xs mt-1">= {Math.floor(credits / CREDITS_PER_SESSION)} skúšaní</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <p className="text-slate-400 text-sm">Predmety</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{subjects?.length ?? 0}</p>
          <p className="text-slate-500 text-xs mt-1">{subjects?.filter(s => s.is_builtin).length} vstavané</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <p className="text-slate-400 text-sm">Skúšania celkom</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{recentSessions?.length ?? 0}</p>
          <p className="text-slate-500 text-xs mt-1">posledných 5 zobrazených</p>
        </div>
      </div>

      {/* Start exam CTA */}
      <div className="bg-gradient-to-r from-blue-900/50 to-slate-800 rounded-xl p-6 border border-blue-700/50">
        <h2 className="text-xl font-semibold">Začať skúšanie</h2>
        <p className="text-slate-300 mt-2 mb-4">
          Vyber predmet, AI vylosuje tému a začne ústna skúška (~20-25 minút). Všetko hlasom.
        </p>
        {canExam ? (
          <Link
            href="/subjects"
            className="inline-block bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg font-semibold transition-colors"
          >
            Vybrať predmet
          </Link>
        ) : (
          <div className="flex items-center gap-4">
            <Link
              href="/billing"
              className="inline-block bg-yellow-600 hover:bg-yellow-500 px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Kúpiť kredity
            </Link>
            <p className="text-slate-400 text-sm">Potrebuješ min. 10 kreditov na skúšanie</p>
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Posledné skúšania</h2>
          <div className="space-y-2">
            {recentSessions.map((session: any) => (
              <div
                key={session.id}
                className="bg-slate-800 rounded-lg px-4 py-3 border border-slate-700 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{session.subjects?.name}</p>
                  <p className="text-slate-400 text-xs">{session.topics?.title}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      session.status === "completed"
                        ? "bg-green-900/50 text-green-400"
                        : session.status === "active"
                        ? "bg-blue-900/50 text-blue-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {session.status === "completed" ? "Dokončené" : session.status === "active" ? "Prebieha" : "Zrušené"}
                  </span>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(session.started_at).toLocaleDateString("sk-SK")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
