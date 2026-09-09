import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const score = (v: unknown) => Math.max(0, Math.min(100, Number.isFinite(Number(v)) ? Number(v) : 50));

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("growth_research").select("*").eq("app_user_id", appUserId).order("relevance_score", { ascending: false }).order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    const now = Date.now();
    return NextResponse.json({ research: (data ?? []).filter((row: any) => !row.expires_at || new Date(row.expires_at).getTime() > now) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load research";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const title = text(body.title, 300), topic = text(body.topic, 200), summary = text(body.summary, 5000);
    if (!title || !topic || !summary) return NextResponse.json({ error: "title, topic and summary are required" }, { status: 400 });
    const { data, error } = await supabase.from("growth_research").insert({ app_user_id: appUserId, title, topic, summary, source_type: text(body.source_type, 40) || "manual", source_url: text(body.source_url, 1000) || null, relevance_score: score(body.relevance_score), momentum_score: score(body.momentum_score), expires_at: body.expires_at || null }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ research: data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save research" }, { status: 400 }); }
}
