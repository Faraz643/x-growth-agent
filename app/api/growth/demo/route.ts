import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

const opportunities = [
  ["@builder_signal", "Builder Signal", "AI coding agents", "The hard part of AI coding agents isn't generation. It's making the agent's actions reviewable and trustworthy.", 95, 82, 91, "Share what an approval-first workflow changed in your own product."],
  ["@devnotes", "Dev Notes", "Debugging", "Spent four hours debugging a feature that looked completely fine from the frontend.", 91, 76, 88, "Explain the debugging path, misleading signal, and fix."],
  ["@indiebuilds", "Indie Builds", "Product validation", "What is the best way to validate a SaaS idea before spending months building it?", 88, 73, 93, "Share a concrete validation experiment and what you learned."],
];

export async function POST() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const rows = opportunities.map(([author_username, author_name, topic, content, relevance_score, momentum_score, conversation_score, suggested_angle]) => ({
      app_user_id: appUserId, author_username, author_name, topic, content,
      reason: "Demo data for development. Not live X data.", suggested_angle,
      relevance_score, momentum_score, conversation_score,
      opportunity_score: Math.round(Number(relevance_score) * 0.3 + Number(momentum_score) * 0.2 + Number(relevance_score) * 0.2 + Number(conversation_score) * 0.15 + 90 * 0.15),
      source_type: "demo", status: "open",
    }));
    const { error } = await supabase.from("opportunities").insert(rows);
    if (error) throw new Error(error.message);
    return NextResponse.json({ seeded: true, message: "Demo opportunities added. This data is clearly marked as demo data." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not seed demo data" }, { status: 400 });
  }
}
