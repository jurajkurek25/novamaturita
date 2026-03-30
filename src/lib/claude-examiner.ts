import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ExamContext {
  subjectName: string;
  topicTitle: string;
  topicContent: string;
  language: "sk" | "en";
  durationMinutes?: number;
}

function buildSystemPrompt(ctx: ExamContext): string {
  const isSk = ctx.language === "sk";

  if (isSk) {
    return `Si skúšajúci učiteľ na ústnej maturitnej skúške zo predmetu "${ctx.subjectName}".

Žiak si vylosoval tému: "${ctx.topicTitle}"

Obsah témy na ktorej sa zakladá skúška:
${ctx.topicContent}

POKYNY:
- Správaj sa presne ako skutočný maturitný skúšajúci – prísne ale spravodlivo
- Začni tým, že privítaš žiaka a oznámiš mu tému
- Nechaj žiaka rozprávať, aktívne počúvaj, potom kladie doplňujúce otázky
- Kladie konkrétne, vecné otázky v duchu témy
- Ak žiak odpovie nesprávne alebo povrchne, jemne ho usmer, pýtaj sa ďalej
- Skúška trvá cca 20-25 minút – hovor stručne, nech žiak rozpráva viac
- Na konci (keď žiak alebo ty signalizuješ ukončenie) daj záverečné hodnotenie vo formáte:
  HODNOTENIE: [1-5] - [slovný komentár]
- Komunikuj výhradne po slovensky
- Nepoužívaj markdown, odpovede majú byť prirodzená hovorená reč`;
  } else {
    return `You are an examiner conducting an oral matura (final high school exam) in the subject "${ctx.subjectName}".

The student drew the topic: "${ctx.topicTitle}"

Topic content for this exam:
${ctx.topicContent}

INSTRUCTIONS:
- Act exactly like a real matura examiner – strict but fair
- Start by welcoming the student and announcing the topic
- Let the student speak, listen actively, then ask follow-up questions
- Ask specific, content-focused questions based on the topic
- If the student answers incorrectly or superficially, gently guide them and continue questioning
- The exam lasts about 20-25 minutes – be concise, let the student speak more
- At the end (when student or you signal completion) give a final evaluation in this format:
  EVALUATION: [1-5] - [verbal comment]
- Communicate exclusively in English
- No markdown – responses should be natural spoken language`;
  }
}

export async function streamExaminerResponse(
  ctx: ExamContext,
  history: ConversationMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ctx);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  let fullText = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
      fullText += event.delta.text;
    }
  }
  return fullText;
}

export async function generateEvaluation(
  ctx: ExamContext,
  history: ConversationMessage[]
): Promise<{ grade: number; comment: string; strengths: string[]; weaknesses: string[] }> {
  const isSk = ctx.language === "sk";

  const prompt = isSk
    ? `Na základe celého priebehu ústnej maturitnej skúšky zo "${ctx.subjectName}" (téma: "${ctx.topicTitle}") vypracuj záverečné hodnotenie v JSON formáte:
{
  "grade": <číslo 1-5 kde 1=výborný, 5=nedostatočný>,
  "comment": "<celkový slovný komentár>",
  "strengths": ["<silná stránka 1>", "<silná stránka 2>"],
  "weaknesses": ["<slabá stránka 1>", "<slabá stránka 2>"]
}`
    : `Based on the entire oral matura exam in "${ctx.subjectName}" (topic: "${ctx.topicTitle}") produce a final evaluation in JSON format:
{
  "grade": <number 1-5 where 1=excellent, 5=fail>,
  "comment": "<overall verbal comment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"]
}`;

  const systemPrompt = buildSystemPrompt(ctx);
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: prompt },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { grade: 3, comment: text, strengths: [], weaknesses: [] };

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { grade: 3, comment: text, strengths: [], weaknesses: [] };
  }
}
