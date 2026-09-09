import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { requireAppUser } from "@/lib/growth/db";
import { normalizeProfile, rankContent } from "@/lib/growth/operating-system";

const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const formats = ["short insight", "build update", "problem → solution", "technical lesson", "AI experiment", "product-building story", "opinion", "mini-thread", "case study", "monetization experiment"];

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const [{ data: ideas, error: ideasError }, { data: drafts, error: draftsError }, { data: profileRow }, { data: projects }] = await Promise.all([
      supabase.from("content_ideas").select("*").eq("app_user_id", appUserId).in("status", ["open", "saved"]).limit(50),
      supabase.from("content_drafts").select("*").eq("app_user_id", appUserId).order("created_at", { ascending: false }).limit(30),
      supabase.from("niche_profiles").select("topics,content_pillars,tone,avoid_topics,target_followers").eq("app_user_id", appUserId).maybeSingle(),
      supabase.from("growth_projects").select("id,name,description,stage,lessons,technologies,urls,active").eq("app_user_id", appUserId).eq("active", true).order("updated_at", { ascending: false }).limit(20),
    ]);
    if (ideasError) throw new Error(ideasError.message);
    if (draftsError) throw new Error(draftsError.message);
    return NextResponse.json({ ideas: rankContent(ideas ?? [], normalizeProfile(profileRow), projects ?? []), drafts: drafts ?? [], formats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load content";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const action = text(body.action, 40);
    if (action === "idea") {
      const title = text(body.title, 300);
      if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
      const { data: profileRow } = await supabase.from("niche_profiles").select("topics,content_pillars,tone,avoid_topics,target_followers").eq("app_user_id", appUserId).maybeSingle();
      const { data: projects } = await supabase.from("growth_projects").select("name,description,lessons,technologies,active").eq("app_user_id", appUserId).eq("active", true).limit(20);
      const profile = normalizeProfile(profileRow);
      const projectContext = (projects ?? []).map((p: any) => `${p.name} ${p.description} ${(p.lessons ?? []).join(" ")}`).join(" ");
      const score = Math.max(0, Math.min(100, Number(body.score) || Math.round(60 + (/build|debug|lesson|experiment|problem/i.test(`${title} ${projectContext}`) ? 25 : 0))));
      const { data, error } = await supabase.from("content_ideas").insert({ app_user_id: appUserId, title, reason: text(body.reason, 1000) || "Fits the current growth profile and can be made specific with first-hand context.", angle: text(body.angle, 1000), hook: text(body.hook, 500), score, source_type: body.source_type === "manual" ? "manual" : "generated", data_source: body.source_type === "manual" ? "manual" : "generated" }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ idea: data, profile, projectContext }, { status: 201 });
    }
    if (action === "generate") {
      const idea = body.idea || {};
      const format = formats.includes(body.format) ? body.format : "short insight";
      const provider = getAIProvider();
      const bodyText = await provider.generateContent({ title: text(idea.title, 300) || "Build update", angle: text(idea.angle, 1000) || "Share one specific decision, constraint, result and lesson.", hook: text(idea.hook, 500) || "I learned something useful while building this.", niche: text(body.niche, 500) || "development and AI", experience: text(body.experience, 2000) || "my current project", tone: Array.isArray(body.tone) ? body.tone.map(String) : [], avoid: Array.isArray(body.avoid) ? body.avoid.map(String) : [] }, format);
      const context = { title: idea.title, angle: idea.angle, hook: idea.hook, niche: body.niche, experience: body.experience, format };
      const { data, error } = await supabase.from("content_drafts").insert({ app_user_id: appUserId, idea_id: typeof idea.id === "string" ? idea.id : null, format, body: bodyText, source_context: context }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ draft: data }, { status: 201 });
    }
    if (action === "draft") {
      const bodyText = text(body.body, 10000);
      if (!bodyText) return NextResponse.json({ error: "body is required" }, { status: 400 });
      const { data, error } = await supabase.from("content_drafts").insert({ app_user_id: appUserId, idea_id: typeof body.idea_id === "string" ? body.idea_id : null, format: text(body.format, 50) || "short insight", body: bodyText, source_context: body.source_context && typeof body.source_context === "object" ? body.source_context : {} }).select("*").single();
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
