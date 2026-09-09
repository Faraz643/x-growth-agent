import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { classifyPost, learningSummary } from "@/lib/growth/intelligence";

function metrics(post: { public_metrics: Record<string, number> | null }) {
  const m = post.public_metrics ?? {};
  const impressions = m.impression_count ?? 0;
  const engagements = (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0) + (m.quote_count ?? 0);
  return { impressions, engagements, rate: impressions ? (engagements / impressions) * 100 : null };
}

function summarize(rows: Array<{ public_metrics: Record<string, number> | null }>) {
  const scored = rows.map((post) => metrics(post));
  const impressions = scored.reduce((s, p) => s + p.impressions, 0);
  const engagements = scored.reduce((s, p) => s + p.engagements, 0);
  return { impressions, engagements, engagementRate: impressions ? Number(((engagements / impressions) * 100).toFixed(2)) : null };
}

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data: account, error: accountError } = await supabase.from("x_accounts").select("x_user_id,followers_count,following_count,tweet_count,last_successful_sync_at,sync_status,sync_error_code,updated_at").eq("app_user_id", appUserId).maybeSingle();
    if (accountError) throw new Error(accountError.message);
    const [{ data: posts, error: postsError }, { data: history, error: historyError }] = await Promise.all([
      supabase.from("x_posts").select("x_post_id,text,created_at,public_metrics,data_source").eq("x_user_id", account?.x_user_id || "").order("created_at", { ascending: false }).limit(100),
      supabase.from("growth_metrics").select("*").eq("app_user_id", appUserId).order("measured_on", { ascending: false }).limit(60),
    ]);
    if (postsError || historyError) throw new Error(postsError?.message || historyError?.message || "Analytics query failed");
    const stored = posts ?? [];
    const realPosts = stored.filter((p) => p.data_source !== "demo");
    const demoPosts = stored.filter((p) => p.data_source === "demo");
    const scored = realPosts.map((post) => ({ ...post, ...metrics(post) })).sort((a, b) => b.engagements - a.engagements);
    const realMetrics = (history ?? []).filter((m) => m.data_source !== "demo");
    const demoMetrics = (history ?? []).filter((m) => m.data_source === "demo");
    const signals = scored.map((p) => ({ ...classifyPost(p.text), engagements: p.engagements, impressions: p.impressions, rate: p.rate }));
    const learning = learningSummary(realPosts.map((p) => ({ text: p.text, engagements: metrics(p).engagements, impressions: metrics(p).impressions })));
    const topics = ["AI", "Development", "Building", "Vibe coding", "Product", "Monetization"].map((topic) => {
      const rows = signals.filter((p) => p.topics.includes(topic));
      return rows.length ? { topic, posts: rows.length, avgEngagements: Number((rows.reduce((s, p) => s + p.engagements, 0) / rows.length).toFixed(1)) } : null;
    }).filter(Boolean).sort((a, b) => Number((b as { avgEngagements: number }).avgEngagements) - Number((a as { avgEngagements: number }).avgEngagements));
    const formats = ["short insight", "build update", "technical lesson", "how-to", "opinion", "mini-thread"].map((format) => {
      const rows = signals.filter((p) => p.format === format);
      return rows.length ? { format, posts: rows.length, avgEngagements: Number((rows.reduce((s, p) => s + p.engagements, 0) / rows.length).toFixed(1)) } : null;
    }).filter(Boolean).sort((a, b) => Number((b as { avgEngagements: number }).avgEngagements) - Number((a as { avgEngagements: number }).avgEngagements));
    return NextResponse.json({
      dataStatus: account ? (account.sync_status === "limited" ? "limited" : "available") : "unavailable",
      account, postsAnalyzed: realPosts.length, history: realMetrics,
      summary: summarize(realPosts), bestPosts: scored.slice(0, 5), topics, formats, signals, learning,
      demo: { metrics: demoMetrics, postsAnalyzed: demoPosts.length, summary: summarize(demoPosts) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load analytics";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
