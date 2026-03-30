import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AddSubjectForm from "./AddSubjectForm";

export default async function SubjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*, topics(count)")
    .eq("user_id", user!.id)
    .order("is_builtin", { ascending: false })
    .order("created_at");

  const builtins = subjects?.filter((s) => s.is_builtin) ?? [];
  const custom = subjects?.filter((s) => !s.is_builtin) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Predmety</h1>
        <p className="text-slate-400 mt-1">Vyber predmet a začni skúšanie, alebo pridaj vlastný</p>
      </div>

      {/* Builtin subjects */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-slate-300">Vstavané predmety</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builtins.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </div>

      {/* Custom subjects */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-slate-300">Vlastné predmety</h2>
        {custom.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {custom.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} deletable />
            ))}
          </div>
        )}
        <AddSubjectForm userId={user!.id} />
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  deletable = false,
}: {
  subject: any;
  deletable?: boolean;
}) {
  const topicCount = subject.topics?.[0]?.count ?? 0;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white">{subject.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 shrink-0">
            {subject.language.toUpperCase()}
          </span>
        </div>
        {subject.description && (
          <p className="text-slate-400 text-sm mt-1">{subject.description}</p>
        )}
        <p className="text-slate-500 text-xs mt-2">{topicCount} okruhov</p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/exam/new?subject=${subject.id}`}
          className="flex-1 text-center bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Začať skúšanie
        </Link>
        <Link
          href={`/subjects/${subject.id}`}
          className="flex-1 text-center bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm transition-colors"
        >
          Okruhy
        </Link>
        {deletable && (
          <form action={`/api/subjects/${subject.id}/delete`} method="POST">
            <button className="bg-red-900/50 hover:bg-red-800/50 px-3 py-2 rounded-lg text-sm text-red-400 transition-colors">
              Zmazať
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
