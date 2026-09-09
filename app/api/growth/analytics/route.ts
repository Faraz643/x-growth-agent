import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

function metrics(post: { public_metrics: Record<string, number> | null }) {
  const m = post.public_metrics ?? {};
  const impressions = m.impression_count ?? 0;
  const engagements = (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0) + (m.quote_count ?? 0);
  return { impressions, engagements, rate: impressions ? (engagements / impressions) * 100 : null };
}

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const [{ data: account, error: accountError }, { data: posts, error: postsError }, { data: history, error: historyError }] = await Promise.all([
      supabase.from("x_accounts").select("followers_count,following_count,tweet_count,last_successful_sync_at,sync_status,sync_error_code,updated_at").eq("app_user_id", appUserId).maybeSingle(),
      supabase.from("x_posts").select("x_post_id,text,created_at,public_metrics").eq("x_user_id", (await supabase.from("x_accounts").select("x_user_id").eq("app_user_id", appUserId).maybeSingle()).data?.x_user_id || "").order("created_at", { ascending: false }).limit(100),
      supabase.from("growth_metrics").select("*").eq("app_user_id", appUserId).order("measured_on", { ascending: false }).limit(30),
    ]);
    if (accountError || postsError || historyError) throw new Error(accountError?.message || postsError?.message || historyError?.message || "Analytics query failed");
    const stored = posts ?? [];
    const scored = stored.map((post) => ({ ...post, ...metrics(post as { public_metrics: Record<string, number> | null }) })).sort((a, b) => b.engagements - a.engagements);
    const totalImpressions = scored.reduce((s, p) => s + p.impressions, 0);
    const totalEngagements = scored.reduce((s, p) => s + p.engagements, 0);
    const topics = ["AI", "Development", "Building products", "Vibe coding", "Monetization"].map((topic) => ({ topic, posts: scored.filter((p) => p.text.toLowerCase().includes(topic.toLowerCase().split(" ")[0])).length })).filter((x) => x.posts > 0).sort((a, b) => b.posts - a.posts);
    return NextResponse.json({ dataStatus: account ? (account.sync_status === "limited" ? "limited" : "available") : "unavailable", account, postsAnalyzed: stored.length, history: history ?? [], summary: { impressions: totalImpressions, engagements: totalEngagements, engagementRate: totalImpressions ? Number(((totalEngagements / totalImpressions) * 100).toFixed(2)) : null }, bestPosts: scored.slice(0, 5), topics });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load analytics" }, { status: 401 });
  }
}
