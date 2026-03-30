import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-lg text-white">
              NovaMaturita
            </Link>
            <Link href="/dashboard" className="text-slate-300 hover:text-white text-sm transition-colors">
              Prehľad
            </Link>
            <Link href="/subjects" className="text-slate-300 hover:text-white text-sm transition-colors">
              Predmety
            </Link>
            <Link href="/billing" className="text-slate-300 hover:text-white text-sm transition-colors">
              Kredity
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              <span className="text-yellow-400 font-semibold">{profile?.credits ?? 0}</span> kreditov
            </span>
            <span className="text-slate-400 text-sm">{profile?.full_name ?? user.email}</span>
            <form action="/api/auth/signout" method="POST">
              <button className="text-slate-400 hover:text-white text-sm transition-colors">
                Odhlásiť
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
