import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

function statusFor(count: number) {
  if (count >= 6) return "VALUABLE CONNECTION";
  if (count >= 3) return "RECURRING";
  if (count >= 1) return "ENGAGED";
  return "NEW";
}

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("relationships").select("*").eq("app_user_id", appUserId).order("relevance_score", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return NextResponse.json({ relationships: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load relationships" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const username = String(body.x_username || "").replace(/^@/, "").slice(0, 100);
    if (!username) return NextResponse.json({ error: "x_username is required" }, { status: 400 });
    const interactions = Math.max(0, Number(body.interaction_count) || 0);
    const { data, error } = await supabase.from("relationships").upsert({ app_user_id: appUserId, x_username: username, display_name: String(body.display_name || "").slice(0, 200), niche: String(body.niche || "").slice(0, 300), interaction_count: interactions, last_interaction_at: body.last_interaction_at || null, topics: Array.isArray(body.topics) ? body.topics.filter((v: unknown): v is string => typeof v === "string").slice(0, 20) : [], relevance_score: Math.max(0, Math.min(100, Number(body.relevance_score) || 50)), relationship_status: statusFor(interactions), notes: String(body.notes || "").slice(0, 2000), updated_at: new Date().toISOString() }, { onConflict: "app_user_id,x_username" }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ relationship: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save relationship" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "id is required" }, { status: 400 });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.notes === "string") update.notes = body.notes.slice(0, 2000);
    if (Array.isArray(body.topics)) update.topics = body.topics.filter((v: unknown): v is string => typeof v === "string").slice(0, 20);
    if (Number.isInteger(body.interaction_count)) { update.interaction_count = Math.max(0, body.interaction_count); update.relationship_status = statusFor(Math.max(0, body.interaction_count)); }
    const { data, error } = await supabase.from("relationships").update(update).eq("id", body.id).eq("app_user_id", appUserId).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ relationship: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update relationship" }, { status: 400 });
  }
}
