import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) return NextResponse.json({ profile: null });
  const { data, error } = await getSupabaseAdmin().from("niche_profiles").select("topics,audience,expertise,voice_notes").eq("app_user_id", appUserId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(request: Request) {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) return NextResponse.json({ error: "Session not ready" }, { status: 401 });
  const body: Record<string, unknown> = await request.json();
  const topics = Array.isArray(body.topics) ? body.topics.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim()).filter(Boolean).slice(0, 20) : [];
  const expertise = Array.isArray(body.expertise) ? body.expertise.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim()).filter(Boolean).slice(0, 20) : [];
  const audience = typeof body.audience === "string" ? body.audience.slice(0, 500) : "";
  const voiceNotes = typeof body.voice_notes === "string" ? body.voice_notes.slice(0, 1000) : typeof body.voiceNotes === "string" ? body.voiceNotes.slice(0, 1000) : "";
  const { data, error } = await getSupabaseAdmin().from("niche_profiles").upsert({ app_user_id: appUserId, topics, audience, expertise, voice_notes: voiceNotes, updated_at: new Date().toISOString() }, { onConflict: "app_user_id" }).select("topics,audience,expertise,voice_notes").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
