import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { scoreOpportunity } from "@/lib/growth/profile";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("opportunities").select("*").eq("app_user_id", appUserId).eq("status", "open").order("opportunity_score", { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    return NextResponse.json({ opportunities: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load opportunities" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const author = typeof body.author_username === "string" ? body.author_username.slice(0, 100) : "manual";
    const topic = typeof body.topic === "string" ? body.topic.slice(0, 200) : "";
    const content = typeof body.content === "string" ? body.content.slice(0, 5000) : "";
    if (!topic || !content) return NextResponse.json({ error: "topic and content are required" }, { status: 400 });
    const relevance = Math.max(0, Math.min(100, Number(body.relevance_score) || 50));
    const momentum = Math.max(0, Math.min(100, Number(body.momentum_score) || 50));
    const conversation = Math.max(0, Math.min(100, Number(body.conversation_score) || 50));
    const opportunity_score = scoreOpportunity({ relevance, momentum, audienceFit: relevance, conversation, valueAdd: Math.max(0, Math.min(100, Number(body.value_score) || 50)) });
    const { data, error } = await supabase.from("opportunities").insert({ app_user_id: appUserId, author_username: author, author_name: String(body.author_name || "").slice(0, 200), topic, content, reason: String(body.reason || "").slice(0, 1000), suggested_angle: String(body.suggested_angle || "").slice(0, 1000), relevance_score: relevance, momentum_score: momentum, conversation_score: conversation, opportunity_score, source_type: "manual", source_url: typeof body.source_url === "string" ? body.source_url.slice(0, 1000) : null }).select("*").single();
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
