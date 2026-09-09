import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

const list = (value: unknown, max = 20) => Array.isArray(value) ? value.map(String).map((x) => x.trim()).filter(Boolean).slice(0, max) : [];
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("growth_projects").select("*").eq("app_user_id", appUserId).order("active", { ascending: false }).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ projects: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load projects";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const name = text(body.name, 120);
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const { data, error } = await supabase.from("growth_projects").insert({ app_user_id: appUserId, name, description: text(body.description, 2000), stage: text(body.stage, 40) || "building", lessons: list(body.lessons), technologies: list(body.technologies), urls: list(body.urls, 10), active: body.active !== false }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create project" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "id is required" }, { status: 400 });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ["name", "description", "stage"]) if (body[key] !== undefined) update[key] = text(body[key], key === "description" ? 2000 : 120);
    for (const key of ["lessons", "technologies", "urls"]) if (body[key] !== undefined) update[key] = list(body[key], key === "urls" ? 10 : 20);
    if (body.active !== undefined) update.active = Boolean(body.active);
    const { data, error } = await supabase.from("growth_projects").update(update).eq("id", body.id).eq("app_user_id", appUserId).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ project: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update project" }, { status: 400 });
  }
}
