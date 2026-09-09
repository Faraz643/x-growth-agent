import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type StoredPost = {
  x_post_id: string;
  text: string;
  created_at: string;
  public_metrics: Record<string, number> | null;
};

const topicRules: Record<string, string[]> = {
  AI: ["ai", "artificial intelligence", "agent", "agents", "llm", "gpt", "claude", "model"],
  Development: ["code", "coding", "developer", "development", "javascript", "typescript", "react", "next.js", "api", "bug", "debug"],
  "Building products": ["build", "building", "product", "saas", "startup", "mvp", "ship", "launch", "feature"],
  "Vibe coding": ["vibe coding", "vibe code", "cursor", "windsurf", "copilot", "lovable", "bolt"],
  Monetization: ["monetize", "monetization", "revenue", "earning", "earn", "money", "pricing", "customers"],
};

function engagement(metrics: Record<string, number> | null) {
  if (!metrics) return 0;
  return (metrics.like_count ?? 0) + (metrics.reply_count ?? 0) + (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0);
}

function impressions(metrics: Record<string, number> | null) {
  return metrics?.impression_count ?? 0;
}

function detectTopics(posts: StoredPost[]) {
  return Object.entries(topicRules)
    .map(([topic, keywords]) => ({
      topic,
      count: posts.filter((post) => {
        const text = post.text.toLowerCase();
        return keywords.some((keyword) => text.includes(keyword));
      }).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function GET() {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: account, error: accountError } = await supabase
    .from("x_accounts")
    .select("x_user_id,username,followers_count,following_count,tweet_count,connected_at,updated_at")
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (accountError || !account) return NextResponse.json({ error: "X account not found" }, { status: 404 });

  const { data: posts, error: postsError } = await supabase
    .from("x_posts")
    .select("x_post_id,text,created_at,public_metrics")
    .eq("x_user_id", account.x_user_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 });

  const storedPosts = (posts ?? []) as StoredPost[];
  const totalEngagement = storedPosts.reduce((sum, post) => sum + engagement(post.public_metrics), 0);
  const totalImpressions = storedPosts.reduce((sum, post) => sum + impressions(post.public_metrics), 0);
  const postsWithMetrics = storedPosts.filter((post) => post.public_metrics && Object.keys(post.public_metrics).length);
  const averageEngagement = postsWithMetrics.length ? totalEngagement / postsWithMetrics.length : 0;
  const averageImpressions = postsWithMetrics.length ? totalImpressions / postsWithMetrics.length : 0;
  const topPost = [...storedPosts].sort((a, b) => engagement(b.public_metrics) - engagement(a.public_metrics))[0] ?? null;
  const topics = detectTopics(storedPosts);

  const dates = storedPosts.map((post) => new Date(post.created_at).getTime()).filter(Number.isFinite);
  const spanDays = dates.length > 1 ? Math.max((Math.max(...dates) - Math.min(...dates)) / 86_400_000, 1) : 0;

  return NextResponse.json({
    account: {
      username: account.username,
      followers: account.followers_count,
      following: account.following_count,
      totalPosts: account.tweet_count,
      connectedAt: account.connected_at,
      lastSyncedAt: account.updated_at,
    },
    posts: storedPosts,
    summary: {
      postsAnalyzed: storedPosts.length,
      averageEngagement: Number(averageEngagement.toFixed(1)),
      averageImpressions: Number(averageImpressions.toFixed(1)),
      engagementRate: totalImpressions ? Number(((totalEngagement / totalImpressions) * 100).toFixed(2)) : null,
      postingSpanDays: Number(spanDays.toFixed(1)),
      postsPerWeek: spanDays ? Number(((storedPosts.length / spanDays) * 7).toFixed(1)) : null,
    },
    topPost,
    topics,
  });
}
