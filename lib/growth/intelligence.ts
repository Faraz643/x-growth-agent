export type GrowthProfile = {
  niche: string;
  content_pillars: string[];
  tone: string[];
  avoid_topics: string[];
  target_followers: number;
};

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "into", "about", "have", "what", "when", "while", "just", "than", "then"]);

const words = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9+#-]+/).filter((x) => x.length > 2 && !STOP.has(x)));

function overlap(a: string, b: string) {
  const aa = words(a); const bb = words(b);
  if (!aa.size || !bb.size) return 0;
  let hits = 0; aa.forEach((x) => { if (bb.has(x)) hits += 1; });
  return Math.min(100, Math.round((hits / Math.max(aa.size, bb.size)) * 100));
}

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

export function scoreContentOpportunity(input: { title: string; reason?: string; angle?: string; hook?: string }, profile: GrowthProfile) {
  const source = `${input.title} ${input.reason ?? ""} ${input.angle ?? ""} ${input.hook ?? ""}`;
  const niche = overlap(source, `${profile.niche} ${profile.content_pillars.join(" ")}`);
  const firstHand = /(build|built|learn|learned|debug|debugging|experiment|ship|shipping|project|product|implemented|tested|measured|my)/i.test(source) ? 95 : 50;
  const discussion = /(why|how|lesson|tradeoff|problem|mistake|result|decision|opinion|question)/i.test(source) ? 90 : 60;
  const usefulness = /(how|lesson|fix|solution|guide|learn|result|example|step)/i.test(source) ? 90 : 62;
  const originality = firstHand >= 90 ? 94 : 65;
  const credibility = firstHand >= 90 ? 92 : 60;
  return clamp(niche * .25 + originality * .18 + usefulness * .18 + firstHand * .16 + discussion * .1 + credibility * .08 + Math.min(100, niche + 10) * .05);
}

export function scoreOpportunity(input: { topic: string; content: string; momentum?: number; relevance?: number; conversation?: number; valueAbility?: number }, profile: GrowthProfile) {
  const relevance = input.relevance ?? overlap(`${input.topic} ${input.content}`, `${profile.niche} ${profile.content_pillars.join(" ")}`);
  const momentum = input.momentum ?? 50;
  const conversation = input.conversation ?? (/\?|tradeoff|lesson|problem|experience|how|why/i.test(input.content) ? 85 : 60);
  const audienceFit = Math.min(100, relevance + 5);
  const valueAbility = input.valueAbility ?? (/build|built|project|product|developer|code|agent|AI|API/i.test(input.content) ? 92 : 60);
  return clamp(relevance * .25 + momentum * .2 + audienceFit * .2 + conversation * .2 + valueAbility * .15);
}

export type PostSignal = { text: string; engagements: number; impressions: number; topics?: string[]; format?: string; hookType?: string };

export function classifyPost(text: string) {
  const lower = text.toLowerCase();
  const topics = ["AI", "Development", "Building", "Vibe coding", "Product", "Monetization", "Build in public"].filter((x) => lower.includes(x.toLowerCase().split(" ")[0]));
  const format = /\d+\/|\bthread\b/i.test(text) ? "mini-thread" : /how to|steps|guide/i.test(text) ? "how-to" : /learned|lesson|mistake|debug/i.test(text) ? "technical lesson" : /built|building|shipped|shipping/i.test(text) ? "build update" : /i think|my view|opinion/i.test(text) ? "opinion" : "short insight";
  const hookType = /^(i |we |today |after |spent |built |learned |just )/i.test(text.trim()) ? "first-hand" : /\?|how|why/i.test(text.trim()) ? "question" : "statement";
  return { topics: topics.length ? topics : ["General"], format, hookType };
}

export function learningSummary(rows: PostSignal[]) {
  if (rows.length < 5) return { sufficient: false, message: "Not enough data yet. Collect at least 5 real posts before drawing account-level conclusions.", insights: [], winners: {} };
  const average = rows.reduce((s, x) => s + x.engagements, 0) / rows.length;
  const withRate = rows.map((x) => ({ ...x, rate: x.impressions > 0 ? x.engagements / x.impressions : 0, ...classifyPost(x.text) }));
  const insights: string[] = [];
  const winners: Record<string, unknown> = {};

  for (const dimension of ["topics", "format", "hookType"] as const) {
    const groups = new Map<string, PostSignal[]>();
    for (const row of withRate) {
      const values = dimension === "topics" ? row.topics : [row[dimension]];
      for (const value of values) if (value) groups.set(value, [...(groups.get(value) ?? []), row]);
    }
    const candidates = [...groups.entries()].filter(([, group]) => group.length >= 2).map(([key, group]) => ({ key, count: group.length, avg: group.reduce((s, x) => s + x.engagements, 0) / group.length })).sort((a, b) => b.avg - a.avg);
    if (candidates.length >= 2) {
      const best = candidates[0];
      const lift = average ? best.avg / average : 0;
      winners[dimension] = best;
      if (lift >= 1.25) insights.push(`${best.key} is currently ${lift.toFixed(1)}× above your overall average (${best.count} posts).`);
    }
  }

  const bestPosts = [...withRate].sort((a, b) => b.engagements - a.engagements).slice(0, Math.max(1, Math.ceil(rows.length * .2)));
  const bestLift = average ? bestPosts.reduce((s, x) => s + x.engagements, 0) / bestPosts.length / average : 0;
  if (bestLift > 1) insights.unshift(`Your top ${bestPosts.length} posts average ${bestLift.toFixed(1)}× the engagement of the full sample.`);
  if (!insights.length) insights.push("Early signals are mixed. Keep collecting posts before changing strategy.");
  return { sufficient: true, message: "Early account-level signals are available. Treat them as directional until the sample grows.", insights, winners };
}
