import { createClient } from "@/lib/supabase/server";
import BillingClient from "./BillingClient";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const { success, cancelled } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user!.id).single(),
    supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <BillingClient
      credits={profile?.credits ?? 0}
      transactions={transactions ?? []}
      success={!!success}
      cancelled={!!cancelled}
    />
  );
}
