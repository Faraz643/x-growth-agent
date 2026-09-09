import "server-only";

export const DEFAULT_GROWTH_PROFILE = {
  niche: "Development + AI + Product Building + Vibe Coding",
  content_pillars: ["Building", "AI", "Development", "Problem solving", "Vibe coding", "Monetization", "Build in public", "Personal lessons"],
  tone: ["authentic", "curious", "practical", "honest", "builder-oriented", "occasionally opinionated"],
  avoid_topics: ["corporate language", "generic motivational content", "fake guru language", "excessive emojis", "engagement bait", "forced slang", "fake controversy"],
  target_followers: 1000,
};

export function scoreOpportunity(input: { relevance: number; momentum: number; audienceFit: number; conversation: number; valueAdd: number }) {
  return Math.round((input.relevance * 0.3) + (input.momentum * 0.2) + (input.audienceFit * 0.2) + (input.conversation * 0.15) + (input.valueAdd * 0.15));
}

export function accountHealth(followers: number, target: number) {
  return Math.min(100, Math.round((followers / Math.max(target, 1)) * 100));
}
