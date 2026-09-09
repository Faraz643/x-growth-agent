import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { requireAppUser } from "@/lib/growth/db";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const [ideas, drafts] = await Promise.all([
      supabase.from("content_ideas").select("*").eq("app_user_id", appUserId).neq("status", "rejected").order("score", { ascending: false }).limit(20),
      supabase.from("content_drafts").select("*").eq("app_user_id", appUserId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (ideas.error) throw new Error(ideas.error.message);
    if (drafts.error) throw new Error(drafts.error.message);
    return NextResponse.json({ ideas: ideas.data ?? [], drafts: drafts.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load content" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const action = body.action;
    if (action === "idea") {
      const title = String(body.title || "").slice(0, 300);
      if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
      const { data, error } = await supabase.from("content_ideas").insert({ app_user_id: appUserId, title, reason: String(body.reason || "").slice(0, 1000), angle: String(body.angle || "").slice(0, 1000), hook: String(body.hook || "").slice(0, 500), score: Math.max(0, Math.min(100, Number(body.score) || 50)), source_type: body.source_type === "manual" ? "manual" : "generated" }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ idea: data }, { status: 201 });
    }
    if (action === "generate") {
      const idea = body.idea || {};
      const provider = getAIProvider();
      const bodyText = await provider.generateContent({ title: String(idea.title || "Build update"), angle: String(idea.angle || "Share a specific decision and lesson from a real build."), hook: String(idea.hook || "I learned something useful while building this."), niche: String(body.niche || "development and AI"), experience: String(body.experience || "my current project") }, String(body.format || "short insight"));
      const { data, error } = await supabase.from("content_drafts").insert({ app_user_id: appUserId, idea_id: typeof idea.id === "string" ? idea.id : null, format: String(body.format || "short insight").slice(0, 50), body: bodyText }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ draft: data }, { status: 201 });
    }
    if (action === "draft") {
      const { data, error } = await supabase.from("content_drafts").insert({ app_user_id: appUserId, idea_id: typeof body.idea_id === "string" ? body.idea_id : null, format: String(body.format || "short insight").slice(0, 50), body: String(body.body || "").slice(0, 10000) }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ draft: data }, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown content action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process content" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "id is required" }, { status: 400 });
    const allowed = ["draft", "approved", "rejected", "published", "saved"];
    if (body.status && !allowed.includes(body.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.body === "string") update.body = body.body.slice(0, 10000);
    if (typeof body.status === "string") update.status = body.status;
    if (body.status === "published") update.published_at = new Date().toISOString();
    const { data, error } = await supabase.from("content_drafts").update(update).eq("id", body.id).eq("app_user_id", appUserId).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ draft: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update draft" }, { status: 400 });
  }
}
