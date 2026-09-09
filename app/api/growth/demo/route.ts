import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

const opportunities = [
  ["@builder_signal", "Builder Signal", "AI coding agents", "The hard part of AI coding agents isn't generation. It's making the agent's actions reviewable and trustworthy.", 95, 82, 91, "Share what an approval-first workflow changed in your own product."],
  ["@devnotes", "Dev Notes", "Debugging", "Spent four hours debugging a feature that looked completely fine from the frontend.", 91, 76, 88, "Explain the debugging path, misleading signal, and fix."],
  ["@indiebuilds", "Indie Builds", "Product validation", "What is the best way to validate a SaaS idea before spending months building it?", 88, 73, 93, "Share a concrete validation experiment and what you learned."],
];
const ideas = [
  ["What I learned building my first X API integration", "Authentic technical experience with a clear developer audience fit.", "Explain the constraint, debugging path, and what you would do differently.", "I spent hours debugging an X API integration. The surprising part wasn't OAuth.", 91],
  ["The approval layer is becoming the real AI agent product", "Connects AI agents with your actual approval-first product work.", "Show why trustworthy actions matter more than a flashy demo.", "The hardest part of an AI agent may not be intelligence. It may be knowing when to stop.", 88],
  ["A small SaaS experiment I would run before writing more code", "Useful product-building content grounded in a concrete experiment.", "Describe the cheapest test that could invalidate the idea.", "Before I build another feature, I want one answer: will anyone actually use it?", 84],
];

export async function POST() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const oppRows = opportunities.map(([author_username, author_name, topic, content, relevance_score, momentum_score, conversation_score, suggested_angle]) => ({
      app_user_id: appUserId, author_username, author_name, topic, content, reason: "Demo data for development. Not live X data.", suggested_angle,
      relevance_score, momentum_score, conversation_score,
      opportunity_score: Math.round(Number(relevance_score) * .3 + Number(momentum_score) * .2 + Number(relevance_score) * .2 + Number(conversation_score) * .15 + 90 * .15), source_type: "demo", status: "open",
    }));
    const ideaRows = ideas.map(([title, reason, angle, hook, score]) => ({ app_user_id: appUserId, title, reason, angle, hook, score, source_type: "demo", status: "open" }));
    const relationshipRows = [{ app_user_id: appUserId, x_username: "ai_builder_demo", display_name: "AI Builder Demo", niche: "AI / agents", interaction_count: 3, relevance_score: 91, relationship_status: "RECURRING", topics: ["AI agents", "product building"], notes: "Demo relationship. Not a real interaction." }];
    const today = new Date();
    const metricRows = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today); date.setUTCDate(today.getUTCDate() - i);
      return { app_user_id: appUserId, measured_on: date.toISOString().slice(0, 10), followers: 5 + Math.max(0, 6 - i), following: 30 + i, post_count: 8 + (6 - i), profile_visits: 20 + (6 - i) * 3, impressions: 400 + (6 - i) * 80, likes: 18 + (6 - i) * 3, replies: 5 + (6 - i), reposts: 3 + Math.floor((6 - i) / 2), engagement_rate: 6.5 + (6 - i) * .3, data_source: "demo" };
    });
    const [oppResult, ideaResult, relResult, metricResult] = await Promise.all([
      supabase.from("opportunities").insert(oppRows), supabase.from("content_ideas").insert(ideaRows), supabase.from("relationships").upsert(relationshipRows, { onConflict: "app_user_id,x_username" }), supabase.from("growth_metrics").upsert(metricRows, { onConflict: "app_user_id,measured_on" }),
    ]);
    if (oppResult.error || ideaResult.error || relResult.error || metricResult.error) throw new Error(oppResult.error?.message || ideaResult.error?.message || relResult.error?.message || metricResult.error?.message || "Demo seed failed");
    return NextResponse.json({ seeded: true, message: "Demo opportunities, content ideas, relationship and isolated demo analytics added. This data is not live X data." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not seed demo data" }, { status: 400 });
  }
}
