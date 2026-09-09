import { NextResponse } from "next/server";
import { DEFAULT_GROWTH_PROFILE } from "@/lib/growth/profile";
import { requireAppUser } from "@/lib/growth/db";

const fields = "topics,audience,expertise,voice_notes,content_pillars,tone,avoid_topics,target_followers,created_at,updated_at";

function normalize(data: Record<string, unknown> | null) {
  if (!data) return DEFAULT_GROWTH_PROFILE;
  return {
    niche: typeof data.audience === "string" && data.audience ? data.audience : DEFAULT_GROWTH_PROFILE.niche,
    content_pillars: Array.isArray(data.content_pillars) && data.content_pillars.length ? data.content_pillars : DEFAULT_GROWTH_PROFILE.content_pillars,
    tone: Array.isArray(data.tone) && data.tone.length ? data.tone : DEFAULT_GROWTH_PROFILE.tone,
    avoid_topics: Array.isArray(data.avoid_topics) && data.avoid_topics.length ? data.avoid_topics : DEFAULT_GROWTH_PROFILE.avoid_topics,
    target_followers: Number(data.target_followers) || 1000,
  };
}

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("niche_profiles").select(fields).eq("app_user_id", appUserId).maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ profile: normalize(data as Record<string, unknown> | null) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "UNAUTHENTICATED" ? "Not connected" : "Could not load growth profile" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const list = (value: unknown, max: number) => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean).slice(0, max) : [];
    const profile = { topics: list(body.content_pillars, 20), audience: typeof body.niche === "string" ? body.niche.slice(0, 500) : DEFAULT_GROWTH_PROFILE.niche, expertise: list(body.content_pillars, 20), voice_notes: list(body.tone, 20).join(", "), content_pillars: list(body.content_pillars, 20), tone: list(body.tone, 20), avoid_topics: list(body.avoid_topics, 20), target_followers: Number.isInteger(body.target_followers) ? Math.max(1, Math.min(10_000_000, body.target_followers)) : 1000, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("niche_profiles").upsert({ app_user_id: appUserId, ...profile }, { onConflict: "app_user_id" }).select(fields).single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ profile: normalize(data as Record<string, unknown>) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save profile" }, { status: 400 });
  }
}
