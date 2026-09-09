import "server-only";

export type ContentContext = { title: string; angle: string; hook: string; niche: string; experience?: string; tone?: string[]; avoid?: string[] };
export type ReplyContext = { author: string; topic: string; post: string; niche: string; experience?: string };
export type AIProvider = {
  generateContent(context: ContentContext, format: string): Promise<string>;
  generateReply(context: ReplyContext): Promise<string>;
  analyzePost?(text: string): Promise<{ topics: string[]; format: string; hookType: string }>;
  scoreOpportunity?(context: { topic: string; post: string; niche: string }): Promise<number>;
  analyzePerformance?(rows: Array<{ text: string; engagements: number; impressions: number }>): Promise<string[]>;
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const local = () => new DeterministicAIProvider();

export class DeterministicAIProvider implements AIProvider {
  async generateContent(context: ContentContext, format: string) {
    const experience = context.experience ? clean(context.experience) : "my latest build";
    const hook = clean(context.hook || "I learned something useful while building this.");
    const angle = clean(context.angle || "Share the constraint, decision, and result.");
    if (format === "mini-thread") return `${hook}\n\n1/ What I learned from ${experience}.\n\n2/ ${angle}\n\n3/ The practical takeaway: share the constraint, the decision, and the result.\n\n4/ I’m still testing this, but this is what I’d do differently next time.`;
    if (format === "problem → solution") return `${hook}\n\nProblem: ${angle}\n\nWhat changed: I focused on the smallest useful fix, tested it, and kept the result measurable.\n\n${experience} reminded me that the boring constraint is often the real lesson.`;
    if (format === "opinion") return `${hook}\n\nMy current view: ${angle}\n\nI’m not treating this as universal advice. It comes from ${experience}, and I’m still testing where the idea breaks.`;
    return `${hook}\n\n${angle}\n\nThe useful part wasn't the shiny demo. It was learning what broke, why it broke, and what I changed. ${experience} gave me a much clearer view of the problem.\n\nStill testing. Will share the result.`;
  }

  async generateReply(context: ReplyContext) {
    const topic = clean(context.topic || "this topic");
    const experience = context.experience ? ` I’ve been working on ${clean(context.experience)} too.` : "";
    return `The interesting part of this is the trade-off behind ${topic}.${experience} In my experience, the constraint usually matters more than the tool itself. What are you seeing in practice?`;
  }

  async analyzePost(text: string) {
    const lower = text.toLowerCase();
    const topics = ["AI", "Development", "Building", "Vibe coding", "Product", "Monetization", "Build in public"].filter((x) => lower.includes(x.toLowerCase().split(" ")[0]));
    const format = /\d+\/|thread/i.test(text) ? "mini-thread" : /learned|lesson|mistake|debug/i.test(text) ? "technical lesson" : /built|building|shipped|shipping/i.test(text) ? "build update" : /how to|guide|steps/i.test(text) ? "how-to" : /i think|my view|opinion/i.test(text) ? "opinion" : "short insight";
    const hookType = /^(i |we |today |after |spent |built |learned |just )/i.test(text.trim()) ? "first-hand" : /\?|how|why/i.test(text.trim()) ? "question" : "statement";
    return { topics: topics.length ? topics : ["General"], format, hookType };
  }

  async scoreOpportunity(context: { topic: string; post: string; niche: string }) {
    const text = `${context.topic} ${context.post}`.toLowerCase();
    let score = 45;
    if (/ai|developer|coding|build|startup|product|agent|api/.test(text)) score += 30;
    if (/how|why|lesson|problem|tradeoff|experience|learned|question/.test(text)) score += 15;
    if (context.niche && text.includes(context.niche.toLowerCase().split(/\s+/)[0])) score += 5;
    return Math.min(100, score);
  }

  async analyzePerformance(rows: Array<{ text: string; engagements: number; impressions: number }>) {
    if (rows.length < 5) return ["Not enough data yet. Collect at least 5 real posts before drawing strong conclusions."];
    return ["Use the highest-performing posts as examples, then validate the pattern across another sample before changing strategy."];
  }
}

class OpenAICompatibleProvider implements AIProvider {
  private baseUrl: string;
  private key: string;
  private model: string;
  constructor(baseUrl: string, key: string, model: string) { this.baseUrl = baseUrl.replace(/\/$/, ""); this.key = key; this.model = model; }
  private async complete(system: string, user: string) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key}` }, body: JSON.stringify({ model: this.model, temperature: 0.7, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), cache: "no-store" });
    if (!response.ok) throw new Error(`AI provider error (${response.status})`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("AI provider returned no content");
    return content;
  }
  async generateContent(context: ContentContext, format: string) {
    try { return await this.complete("You are a human-first X content editor. Write original, specific, first-hand content. Never invent experiences, metrics or claims. Avoid engagement bait, fake controversy, corporate filler and excessive emojis. Keep the requested format.", JSON.stringify({ format, ...context })); }
    catch { return local().generateContent(context, format); }
  }
  async generateReply(context: ReplyContext) {
    try { return await this.complete("You write thoughtful X replies. Add information, experience or a useful question. Never use generic praise, spammy language or invented experience. Do not impersonate the user.", JSON.stringify(context)); }
    catch { return local().generateReply(context); }
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  const key = process.env.AI_API_KEY;
  if (provider && provider !== "local" && key && process.env.AI_BASE_URL && process.env.AI_MODEL) return new OpenAICompatibleProvider(process.env.AI_BASE_URL, key, process.env.AI_MODEL);
  return new DeterministicAIProvider();
}
