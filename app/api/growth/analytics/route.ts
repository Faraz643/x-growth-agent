import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { classifyPost, learningSummary } from "@/lib/growth/intelligence";
import { performanceScore } from "@/lib/growth/operating-system";

function metrics(post: { public_metrics: Record<string, number> | null }) {
  const m = post.public_metrics ?? {};
  const impressions = m.impression_count ?? 0;
  const engagements = (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0) + (m.quote_count ?? 0);
  return { impressions, engagements, rate: impressions ? (engagements / impressions) * 100 : null };
}
function summarize(rows: Array<{ public_metrics: Record<string, number> | null }>) {
  const scored = rows.map(metrics);
  const impressions = scored.reduce((s, p) => s + p.impressions, 0);
  const engagements = scored.reduce((s, p) => s + p.engagements, 0);
  return { impressions, engagements, engagementRate: impressions ? Number(((engagements / impressions) * 100).toFixed(2)) : null };
}
function groupAverage(rows: Array<{ key: string; engagements: number }>) {
  const groups = new Map<string, number[]>();
  for (const row of rows) groups.set(row.key, [...(groups.get(row.key) ?? []), row.engagements]);
  return [...groups.entries()].map(([key, values]) => ({ key, posts: values.length, avgEngagements: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) })).sort((a, b) => b.avgEngagements - a.avgEngagements);
}

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data: account, error: accountError } = await supabase.from("x_accounts").select("x_user_id,followers_count,following_count,tweet_count,last_successful_sync_at,sync_status,sync_error_code,updated_at").eq("app_user_id", appUserId).maybeSingle();
    if (accountError) throw new Error(accountError.message);
    const [{ data: posts, error: postsError }, { data: history, error: historyError }] = await Promise.all([
      supabase.from("x_posts").select("x_post_id,text,created_at,public_metrics,data_source").eq("x_user_id", account?.x_user_id || "").order("created_at", { ascending: false }).limit(200),
      supabase.from("growth_metrics").select("*").eq("app_user_id", appUserId).order("measured_on", { ascending: false }).limit(90),
    ]);
    if (postsError || historyError) throw new Error(postsError?.message || historyError?.message || "Analytics query failed");
    const stored = posts ?? [];
    const realPosts = stored.filter((p) => p.data_source !== "demo");
    const demoPosts = stored.filter((p) => p.data_source === "demo");
    const scored = realPosts.map((post) => ({ ...post, ...metrics(post), performanceScore: performanceScore({ text: post.text, ...metrics(post) }) })).sort((a, b) => b.engagements - a.engagements);
    const realMetrics = (history ?? []).filter((m) => m.data_source !== "demo");
    const demoMetrics = (history ?? []).filter((m) => m.data_source === "demo");
    const signals = scored.map((p) => ({ ...classifyPost(p.text), engagements: p.engagements, impressions: p.impressions, rate: p.rate, created_at: p.created_at }));
    const learning = learningSummary(realPosts.map((p) => ({ text: p.text, engagements: metrics(p).engagements, impressions: metrics(p).impressions })));
    const topics: any[] = [];
    const formats: any[] = [];
    const hooks: any[] = [];
    for (const p of signals) {
      for (const topic of p.topics) topics.push({ key: topic, engagements: p.engagements });
      formats.push({ key: p.format, engagements: p.engagements });
      hooks.push({ key: p.hookType, engagements: p.engagements });
    }
    const days = signals.map((p) => ({ key: new Date(p.created_at).toLocaleDateString("en-US", { weekday: "long" }), engagements: p.engagements }));
    const hours = signals.map((p) => ({ key: String(new Date(p.created_at).getHours()).padStart(2, "0") + ":00", engagements: p.engagements }));
    const followerSnapshots = realMetrics.filter((m) => m.followers != null).slice().sort((a, b) => String(a.measured_on).localeCompare(String(b.measured_on)));
    const followerGrowth = followerSnapshots.length >= 2 ? Number(followerSnapshots[followerSnapshots.length - 1].followers) - Number(followerSnapshots[0].followers) : null;
    const profileVisits = realMetrics.reduce((s, m) => s + Number(m.profile_visits || 0), 0);
    return NextResponse.json({
      dataStatus: account ? (account.sync_status === "limited" ? "limited" : "available") : "unavailable",
      account, postsAnalyzed: realPosts.length, history: realMetrics,
      summary: summarize(realPosts), bestPosts: scored.slice(0, 5),
      topics: groupAverage(topics).map((x) => ({ topic: x.key, posts: x.posts, avgEngagements: x.avgEngagements })),
      formats: groupAverage(formats).map((x) => ({ format: x.key, posts: x.posts, avgEngagements: x.avgEngagements })),
      hooks: groupAverage(hooks).map((x) => ({ hookType: x.key, posts: x.posts, avgEngagements: x.avgEngagements })),
      bestDays: groupAverage(days).map((x) => ({ day: x.key, posts: x.posts, avgEngagements: x.avgEngagements })),
      bestTimes: groupAverage(hours).map((x) => ({ time: x.key, posts: x.posts, avgEngagements: x.avgEngagements })),
      followerGrowth, profileVisits, followerConversionRate: profileVisits > 0 && followerGrowth != null ? Number(((followerGrowth / profileVisits) * 100).toFixed(2)) : null,
      signals, learning,
      demo: { metrics: demoMetrics, postsAnalyzed: demoPosts.length, summary: summarize(demoPosts) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load analytics";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
