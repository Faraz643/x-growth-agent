import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("content_calendar").select("*").eq("app_user_id", appUserId).order("planned_date", { ascending: true }).limit(60);
    if (error) throw new Error(error.message);
    return NextResponse.json({ calendar: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load calendar" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.planned_date || "")) || !body.pillar || !body.format) return NextResponse.json({ error: "planned_date, pillar and format are required" }, { status: 400 });
    const { data, error } = await supabase.from("content_calendar").upsert({ app_user_id: appUserId, planned_date: body.planned_date, pillar: String(body.pillar).slice(0, 200), format: String(body.format).slice(0, 100), draft_id: typeof body.draft_id === "string" ? body.draft_id : null, notes: String(body.notes || "").slice(0, 1000), status: "planned", updated_at: new Date().toISOString() }, { onConflict: "app_user_id,planned_date" }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ calendarItem: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save calendar item" }, { status: 400 });
  }
}
