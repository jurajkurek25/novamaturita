import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ExamRoom from "../ExamRoom";

export default async function NewExamPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: subjectId } = await searchParams;
  if (!subjectId) redirect("/subjects");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: subject }, { data: profile }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, language")
      .eq("id", subjectId)
      .eq("user_id", user!.id)
      .single(),
    supabase.from("profiles").select("credits").eq("id", user!.id).single(),
  ]);

  if (!subject) redirect("/subjects");

  return (
    <ExamRoom
      subjectId={subject.id}
      subjectName={subject.name}
      language={subject.language as "sk" | "en"}
      credits={profile?.credits ?? 0}
    />
  );
}
