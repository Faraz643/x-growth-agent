import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { buildStrategy } from "@/lib/growth/operating-system";

async function loadData(appUserId: string, supabase: any) {
  const [{ data: account, error: accountError }, { data: profileRow }, { data: opportunities }, { data: ideas }, { data: relationships }, { data: drafts }, { data: posts }, { data: metrics }, { data: projects }, { data: research }] = await Promise.all([
    supabase.from("x_accounts").select("x_user_id,username,name,description,profile_image_url,followers_count,following_count,tweet_count,last_successful_sync_at,sync_status,sync_error_code,updated_at").eq("app_user_id", appUserId).maybeSingle(),
    supabase.from("niche_profiles").select("topics,audience,expertise,voice_notes,content_pillars,tone,avoid_topics,target_followers").eq("app_user_id", appUserId).maybeSingle(),
    supabase.from("opportunities").select("*").eq("app_user_id", appUserId).in("status", ["open", "saved"]).order("opportunity_score", { ascending: false }).limit(30),
    supabase.from("content_ideas").select("*").eq("app_user_id", appUserId).in("status", ["open", "saved"]).order("score", { ascending: false }).limit(30),
    supabase.from("relationships").select("*").eq("app_user_id", appUserId).order("relevance_score", { ascending: false }).limit(30),
    supabase.from("content_drafts").select("*").eq("app_user_id", appUserId).order("created_at", { ascending: false }).limit(30),
    supabase.from("x_posts").select("text,public_metrics,created_at,data_source").eq("x_user_id", account?.x_user_id ?? "").order("created_at", { ascending: false }).limit(100),
    supabase.from("growth_metrics").select("measured_on,followers,following,post_count,profile_visits,impressions,likes,replies,reposts,engagement_rate,data_source").eq("app_user_id", appUserId).order("measured_on", { ascending: false }).limit(60),
    supabase.from("growth_projects").select("*").eq("app_user_id", appUserId).eq("active", true).order("updated_at", { ascending: false }).limit(20),
    supabase.from("growth_research").select("*").eq("app_user_id", appUserId).or("expires_at.is.null,expires_at.gt.now()").order("relevance_score", { ascending: false }).limit(30),
  ]);
  if (accountError) throw new Error(accountError.message);
  return { account, profileRow, opportunities: opportunities ?? [], ideas: ideas ?? [], relationships: relationships ?? [], drafts: drafts ?? [], posts: posts ?? [], metrics: metrics ?? [], projects: projects ?? [], research: research ?? [] };
}

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const strategy = buildStrategy(await loadData(appUserId, supabase));
    return NextResponse.json(strategy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build growth strategy";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const action = String(body.action || "");
    if (!["complete", "save", "reject"].includes(action) || typeof body.title !== "string") return NextResponse.json({ error: "action and title are required" }, { status: 400 });
    const status = action === "complete" ? "completed" : action === "save" ? "saved" : "rejected";
    const { data, error } = await supabase.from("growth_recommendations").insert({ app_user_id: appUserId, recommendation_type: String(body.type || "analytics"), title: body.title.slice(0, 300), reason: String(body.reason || "").slice(0, 1000), score: Math.max(0, Math.min(100, Number(body.score) || 0)), reference_id: typeof body.reference_id === "string" ? body.reference_id : null, status, evidence: typeof body.evidence === "object" && body.evidence ? body.evidence : {} }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ recommendation: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record recommendation" }, { status: 400 });
  }
}
