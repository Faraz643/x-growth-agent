import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { relationshipPriority } from "@/lib/growth/operating-system";

function statusFor(count: number) { if (count >= 6) return "VALUABLE CONNECTION"; if (count >= 3) return "RECURRING"; if (count >= 1) return "ENGAGED"; return "NEW"; }
function nextAction(count: number, lastInteraction: string | null, topics: string[]) { if (!lastInteraction) return "Start a genuine conversation around a relevant topic."; const days = Math.floor((Date.now() - new Date(lastInteraction).getTime()) / 86400000); if (days >= 14) return topics[0] ? `Reconnect around ${topics[0]}.` : "Reconnect with a useful question or update."; if (days >= 7) return topics[0] ? `Continue the conversation around ${topics[0]}.` : "Continue the conversation with something useful."; return "Keep the relationship natural; respond when you have something useful to add."; }
const stringList = (value: unknown) => Array.isArray(value) ? value.filter((v: unknown): v is string => typeof v === "string").map((v: string) => v.trim()).filter(Boolean).slice(0, 20) : [];

export async function GET() {
  try { const { appUserId, supabase } = await requireAppUser(); const { data, error } = await supabase.from("relationships").select("*").eq("app_user_id", appUserId).order("relevance_score", { ascending: false }).limit(50); if (error) throw new Error(error.message); return NextResponse.json({ relationships: (data ?? []).sort((a: any, b: any) => relationshipPriority(b) - relationshipPriority(a)) }); }
  catch (error) { const message = error instanceof Error ? error.message : "Could not load relationships"; return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 }); }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser(); const body = await request.json();
    const username = String(body.x_username || "").replace(/^@/, "").trim().slice(0, 100); if (!username) return NextResponse.json({ error: "x_username is required" }, { status: 400 });
    const interactions = Math.max(0, Number(body.interaction_count) || 0); const topics = stringList(body.topics); const last = body.last_interaction_at || null;
    const { data, error } = await supabase.from("relationships").upsert({ app_user_id: appUserId, x_username: username, display_name: String(body.display_name || "").slice(0, 200), niche: String(body.niche || "").slice(0, 300), interaction_count: interactions, last_interaction_at: last, topics, relevance_score: Math.max(0, Math.min(100, Number(body.relevance_score) || 50)), relationship_status: statusFor(interactions), notes: String(body.notes || "").slice(0, 2000), last_topic: topics[0] || "", next_action: nextAction(interactions, last, topics), updated_at: new Date().toISOString() }, { onConflict: "app_user_id,x_username" }).select("*").single();
    if (error) throw new Error(error.message); return NextResponse.json({ relationship: data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save relationship" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser(); const body = await request.json(); if (typeof body.id !== "string") return NextResponse.json({ error: "id is required" }, { status: 400 });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }; if (typeof body.notes === "string") update.notes = body.notes.slice(0, 2000); if (typeof body.niche === "string") update.niche = body.niche.slice(0, 300); if (typeof body.display_name === "string") update.display_name = body.display_name.slice(0, 200); if (Array.isArray(body.topics)) update.topics = stringList(body.topics); if (typeof body.last_interaction_at === "string") update.last_interaction_at = body.last_interaction_at;
    if (Number.isInteger(body.interaction_count)) { update.interaction_count = Math.max(0, body.interaction_count); update.relationship_status = statusFor(Math.max(0, body.interaction_count)); }
    const current = await supabase.from("relationships").select("interaction_count,last_interaction_at,topics").eq("id", body.id).eq("app_user_id", appUserId).maybeSingle(); const count = Number(update.interaction_count ?? current.data?.interaction_count ?? 0); const last = String(update.last_interaction_at ?? current.data?.last_interaction_at ?? "") || null; const topics = Array.isArray(update.topics) ? update.topics as string[] : (current.data?.topics ?? []); update.last_topic = topics[0] || ""; update.next_action = nextAction(count, last, topics);
    const { data, error } = await supabase.from("relationships").update(update).eq("id", body.id).eq("app_user_id", appUserId).select("*").single(); if (error) throw new Error(error.message); return NextResponse.json({ relationship: data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update relationship" }, { status: 400 }); }
}
