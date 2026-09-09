import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { normalizeProfile, rankOpportunities } from "@/lib/growth/operating-system";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const [{ data, error }, { data: profileRow }] = await Promise.all([
      supabase.from("opportunities").select("*").eq("app_user_id", appUserId).in("status", ["open", "saved"]).limit(50),
      supabase.from("niche_profiles").select("topics,content_pillars,tone,avoid_topics,target_followers").eq("app_user_id", appUserId).maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    return NextResponse.json({ opportunities: rankOpportunities(data ?? [], normalizeProfile(profileRow), []).slice(0, 20) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load opportunities";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const author = typeof body.author_username === "string" ? body.author_username.replace(/^@/, "").slice(0, 100) : "manual";
    const topic = typeof body.topic === "string" ? body.topic.slice(0, 200).trim() : "";
    const content = typeof body.content === "string" ? body.content.slice(0, 5000).trim() : "";
    if (!topic || !content) return NextResponse.json({ error: "topic and content are required" }, { status: 400 });
    const bounded = (value: unknown, fallback: number) => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : fallback));
    const relevance = bounded(body.relevance_score, 60);
    const momentum = bounded(body.momentum_score, 50);
    const conversation = bounded(body.conversation_score, 60);
    const valueScore = bounded(body.value_score, 70);
    const score = Math.round(relevance * .3 + momentum * .2 + Math.min(100, relevance + 5) * .2 + conversation * .15 + valueScore * .15);
    const { data, error } = await supabase.from("opportunities").insert({ app_user_id: appUserId, author_username: author, author_name: String(body.author_name || "").slice(0, 200), topic, content, reason: String(body.reason || "").slice(0, 1000), suggested_angle: String(body.suggested_angle || "").slice(0, 1000), relevance_score: relevance, momentum_score: momentum, conversation_score: conversation, opportunity_score: score, source_type: "manual", source_url: typeof body.source_url === "string" ? body.source_url.slice(0, 1000) : null, data_source: "manual" }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ opportunity: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create opportunity" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    if (typeof body.id !== "string" || !["open", "ignored", "saved", "acted"].includes(body.status)) return NextResponse.json({ error: "id and valid status are required" }, { status: 400 });
    const { data, error } = await supabase.from("opportunities").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.id).eq("app_user_id", appUserId).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ opportunity: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update opportunity" }, { status: 400 });
  }
}
