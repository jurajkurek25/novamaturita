"use client";

import { useState } from "react";
import { CREDIT_PACKAGES, CREDITS_PER_SESSION, type CreditTransaction } from "@/types/database";
import { useRouter } from "next/navigation";

export default function BillingClient({
  credits,
  transactions,
  success,
  cancelled,
}: {
  credits: number;
  transactions: CreditTransaction[];
  success: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function purchase(packageId: string) {
    setLoading(packageId);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Kredity</h1>
        <p className="text-slate-400 mt-1">
          Aktuálny zostatok:{" "}
          <span className="text-yellow-400 font-bold text-xl">{credits}</span> kreditov
          <span className="text-slate-500 ml-2">= {Math.floor(credits / CREDITS_PER_SESSION)} skúšaní</span>
        </p>
      </div>

      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-green-400 text-sm">
          Platba prebehla úspešne! Kredity boli pripísané na váš účet.
        </div>
      )}
      {cancelled && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-yellow-400 text-sm">
          Platba bola zrušená.
        </div>
      )}

      {/* Packages */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Kúpiť kredity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-slate-800 rounded-xl p-6 border flex flex-col gap-4 ${
                pkg.popular ? "border-blue-500" : "border-slate-700"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  Najpopulárnejší
                </span>
              )}
              <div>
                <h3 className="font-bold text-lg">{pkg.name}</h3>
                <p className="text-3xl font-bold text-white mt-1">
                  {(pkg.price / 100).toFixed(2)} €
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {pkg.credits} kreditov · {Math.floor(pkg.credits / CREDITS_PER_SESSION)} skúšaní
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {((pkg.price / 100) / (pkg.credits / CREDITS_PER_SESSION)).toFixed(2)} € / skúšanie
                </p>
              </div>
              <button
                onClick={() => purchase(pkg.id)}
                disabled={loading === pkg.id}
                className={`py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                  pkg.popular
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                }`}
              >
                {loading === pkg.id ? "Presmerovávam..." : "Kúpiť"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">História transakcií</h2>
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Popis</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Kredity</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Dátum</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-700/50 last:border-0">
                    <td className="px-4 py-3 text-slate-300">{t.description}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        t.amount > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {new Date(t.created_at).toLocaleDateString("sk-SK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
