export type GrowthProfile = {
  niche: string;
  content_pillars: string[];
  tone: string[];
  avoid_topics: string[];
  target_followers: number;
};

const words = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9+#-]+/).filter(Boolean));

function overlap(a: string, b: string) {
  const aa = words(a); const bb = words(b);
  if (!aa.size || !bb.size) return 0;
  let hits = 0; aa.forEach((x) => { if (bb.has(x)) hits += 1; });
  return Math.min(100, Math.round((hits / Math.max(aa.size, bb.size)) * 100));
}

export function scoreContentOpportunity(input: { title: string; reason?: string; angle?: string; hook?: string }, profile: GrowthProfile) {
  const source = `${input.title} ${input.reason ?? ""} ${input.angle ?? ""}`;
  const niche = overlap(source, `${profile.niche} ${profile.content_pillars.join(" ")}`);
  const firstHand = /(build|built|learn|learned|debug|debugging|experiment|ship|shipping|project|product|implemented|tested)/i.test(source) ? 95 : 55;
  const discussion = /(why|how|lesson|tradeoff|problem|mistake|result|decision|opinion)/i.test(source) ? 88 : 60;
  const usefulness = /(how|lesson|fix|solution|guide|learn|result|example)/i.test(source) ? 90 : 65;
  const originality = firstHand >= 90 ? 92 : 68;
  return Math.round(niche * .25 + originality * .2 + usefulness * .2 + firstHand * .15 + discussion * .1 + Math.min(100, niche + 10) * .1);
}

export function scoreOpportunity(input: { topic: string; content: string; momentum?: number; relevance?: number; conversation?: number }, profile: GrowthProfile) {
  const relevance = input.relevance ?? overlap(`${input.topic} ${input.content}`, `${profile.niche} ${profile.content_pillars.join(" ")}`);
  const momentum = input.momentum ?? 50;
  const conversation = input.conversation ?? (/\?|tradeoff|lesson|problem|experience|how/i.test(input.content) ? 85 : 60);
  const audienceFit = Math.min(100, relevance + 5);
  const valueAbility = /build|built|project|product|developer|code|agent|AI|API/i.test(input.content) ? 92 : 65;
  return Math.round(relevance * .25 + momentum * .2 + audienceFit * .2 + conversation * .2 + valueAbility * .15);
}

export function learningSummary(rows: Array<{ text: string; engagements: number; impressions: number }>) {
  if (rows.length < 5) return { sufficient: false, message: "Not enough data yet. Collect at least 5 real posts before drawing account-level conclusions.", insights: [] as string[] };
  const average = rows.reduce((s, x) => s + x.engagements, 0) / rows.length;
  const best = [...rows].sort((a, b) => b.engagements - a.engagements).slice(0, Math.max(1, Math.ceil(rows.length * .25)));
  const ratio = average ? best.reduce((s, x) => s + x.engagements, 0) / best.length / average : 0;
  return { sufficient: true, message: "Early account-level signal is available. Keep collecting data before making strong strategic claims.", insights: [`Top-performing posts average ${ratio.toFixed(1)}× the engagement of the full sample.`] };
}
