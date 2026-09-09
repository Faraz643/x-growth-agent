import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { requireAppUser } from "@/lib/growth/db";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("reply_suggestions").select("*").eq("app_user_id", appUserId).neq("status", "rejected").order("created_at", { ascending: false }).limit(30);
    if (error) throw new Error(error.message);
    return NextResponse.json({ replies: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load replies";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const author = String(body.author_username || "").replace(/^@/, "").slice(0, 100);
    const topic = String(body.topic || "").slice(0, 200);
    const sourceContent = String(body.source_content || "").slice(0, 5000);
    if (!author || !topic || !sourceContent) return NextResponse.json({ error: "author_username, topic and source_content are required" }, { status: 400 });
    const { data: projects } = await supabase.from("growth_projects").select("name,description,lessons,technologies").eq("app_user_id", appUserId).eq("active", true).limit(10);
    const experience = (projects ?? []).map((p: any) => `${p.name}: ${p.description}. Lessons: ${(p.lessons ?? []).join(", ")}.`).join(" ").slice(0, 4000);
    const provider = getAIProvider();
    const reply = await provider.generateReply({ author, topic, post: sourceContent, niche: String(body.niche || "development and AI"), experience });
    if (!reply.trim() || /^(great post|absolutely|so true|this is so true)[!.\s]*$/i.test(reply.trim())) return NextResponse.json({ error: "Generated reply failed the quality guardrail; try again with more context." }, { status: 422 });
    const { data, error } = await supabase.from("reply_suggestions").insert({ app_user_id: appUserId, opportunity_id: typeof body.opportunity_id === "string" ? body.opportunity_id : null, author_username: author, source_content: sourceContent, reply }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ reply: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate reply" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    if (typeof body.id !== "string" || !["pending", "approved", "rejected", "saved"].includes(body.status)) return NextResponse.json({ error: "id and valid status are required" }, { status: 400 });
    const update: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() };
    if (typeof body.reply === "string") update.reply = body.reply.slice(0, 5000);
    const { data, error } = await supabase.from("reply_suggestions").update(update).eq("id", body.id).eq("app_user_id", appUserId).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ reply: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update reply" }, { status: 400 });
  }
}
