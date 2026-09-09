import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { requireAppUser } from "@/lib/growth/db";

const TYPES = ["shorter", "expanded", "technical", "opinion", "thread"] as const;

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    if (typeof body.draft_id !== "string") return NextResponse.json({ error: "draft_id is required" }, { status: 400 });
    const { data: draft, error: draftError } = await supabase.from("content_drafts").select("id,body,format,source_context").eq("id", body.draft_id).eq("app_user_id", appUserId).maybeSingle();
    if (draftError) throw new Error(draftError.message);
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    const type = TYPES.includes(body.variant_type) ? body.variant_type : "shorter";
    const provider = getAIProvider();
    const base = String(draft.body);
    const context = { title: String(draft.source_context?.title || "My build"), angle: String(draft.source_context?.angle || base), hook: String(draft.source_context?.hook || base.slice(0, 120)), niche: String(draft.source_context?.niche || "development and AI"), experience: String(draft.source_context?.experience || "my current project") };
    let generated = await provider.generateContent(context, type === "thread" ? "mini-thread" : type === "opinion" ? "opinion" : type === "technical" ? "problem → solution" : "short insight");
    if (type === "shorter") generated = generated.split("\n").filter(Boolean).slice(0, 4).join("\n\n").slice(0, 500);
    if (type === "expanded") generated = `${generated}\n\nWhat I would test next: measure the result before assuming the approach generalizes.`.slice(0, 10000);
    const { data, error } = await supabase.from("content_variants").insert({ app_user_id: appUserId, draft_id: draft.id, variant_type: type, body: generated }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ variant: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate variant" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const draftId = new URL(request.url).searchParams.get("draft_id");
    let query = supabase.from("content_variants").select("*").eq("app_user_id", appUserId).order("created_at", { ascending: false }).limit(50);
    if (draftId) query = query.eq("draft_id", draftId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ variants: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load variants" }, { status: 400 });
  }
}
