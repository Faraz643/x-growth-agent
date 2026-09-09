import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { buildStrategy } from "@/lib/growth/operating-system";

async function load(appUserId: string, supabase: any) {
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
    const strategy = buildStrategy(await load(appUserId, supabase));
    return NextResponse.json({ ...strategy, goal: strategy.progress.target, dataStatus: { x: strategy.dataStatus.xStatus, realPosts: strategy.dataStatus.realPosts, demoPosts: strategy.dataStatus.demoPosts, realMetrics: strategy.dataStatus.realMetrics, demoMetrics: strategy.dataStatus.demoMetrics, demoAvailable: true, lastSuccessfulSyncAt: strategy.dataStatus.lastSuccessfulSyncAt } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build growth command center";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
