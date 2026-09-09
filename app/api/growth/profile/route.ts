import { NextResponse } from "next/server";
import { DEFAULT_GROWTH_PROFILE } from "@/lib/growth/profile";
import { requireAppUser } from "@/lib/growth/db";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("growth_profiles").select("*").eq("app_user_id", appUserId).maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ profile: data ?? DEFAULT_GROWTH_PROFILE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "UNAUTHENTICATED" ? "Not connected" : "Could not load growth profile" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const list = (value: unknown, max: number) => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean).slice(0, max) : [];
    const niche = typeof body.niche === "string" ? body.niche.slice(0, 500) : DEFAULT_GROWTH_PROFILE.niche;
    const target = Number.isInteger(body.target_followers) ? Math.max(1, Math.min(10_000_000, body.target_followers)) : 1000;
    const { data, error } = await supabase.from("growth_profiles").upsert({ app_user_id: appUserId, niche, content_pillars: list(body.content_pillars, 20), tone: list(body.tone, 20), avoid_topics: list(body.avoid_topics, 20), target_followers: target, updated_at: new Date().toISOString() }, { onConflict: "app_user_id" }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save profile" }, { status: 400 });
  }
}
