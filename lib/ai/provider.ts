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

function clean(value: string) { return value.replace(/\s+/g, " ").trim(); }

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
    const topics = ["AI", "Development", "Building", "Vibe coding", "Product", "Monetization"].filter((x) => lower.includes(x.toLowerCase().split(" ")[0]));
    const format = /\d+\/|thread/i.test(text) ? "mini-thread" : /learned|lesson|mistake|debug/i.test(text) ? "technical lesson" : "short insight";
    const hookType = /^(i |we |today |after |spent |built |learned )/i.test(text.trim()) ? "first-hand" : "statement";
    return { topics: topics.length ? topics : ["General"], format, hookType };
  }

  async scoreOpportunity(context: { topic: string; post: string; niche: string }) {
    const text = `${context.topic} ${context.post}`.toLowerCase();
    let score = 50;
    if (/ai|developer|coding|build|startup|product|agent|api/.test(text)) score += 30;
    if (/how|why|lesson|problem|tradeoff|experience|learned/.test(text)) score += 15;
    if (text.includes(context.niche.toLowerCase().split(" ")[0])) score += 5;
    return Math.min(100, score);
  }

  async analyzePerformance(rows: Array<{ text: string; engagements: number; impressions: number }>) {
    if (rows.length < 5) return ["Not enough data yet. Collect at least 5 real posts before drawing strong conclusions."];
    return ["Use the highest-performing posts as examples, then validate the pattern across another sample before changing strategy."];
  }
}

export function getAIProvider(): AIProvider { return new DeterministicAIProvider(); }
