import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">NovaMaturita</h1>
        <p className="text-xl text-slate-300">
          Precvič si ústnu maturitu s AI skúšajúcim. Slovenčina, angličtina
          a tvoje odborné predmety — všetko hlasom, ako na skutočnej maturite.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Začať zadarmo
          </Link>
          <Link
            href="/login"
            className="border border-slate-500 hover:border-slate-300 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Prihlásiť sa
          </Link>
        </div>
        <p className="text-slate-400 text-sm">10 kreditov zdarma pri registrácii · 1 skúšanie = 10 kreditov</p>
      </div>
    </main>
  );
}
