import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { DEFAULT_GROWTH_PROFILE } from "@/lib/growth/profile";
import { classifyPost, learningSummary, scoreContentOpportunity, scoreOpportunity, type GrowthProfile } from "@/lib/growth/intelligence";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const [{ data: account }, { data: profileRow }, { data: opportunities }, { data: ideas }, { data: relationships }, { data: posts }, { data: metrics }] = await Promise.all([
      supabase.from("x_accounts").select("x_user_id,username,name,followers_count,following_count,tweet_count,last_successful_sync_at,sync_status,sync_error_code,updated_at").eq("app_user_id", appUserId).maybeSingle(),
      supabase.from("niche_profiles").select("topics,audience,expertise,voice_notes,content_pillars,tone,avoid_topics,target_followers").eq("app_user_id", appUserId).maybeSingle(),
      supabase.from("opportunities").select("*").eq("app_user_id", appUserId).eq("status", "open").order("opportunity_score", { ascending: false }).limit(10),
      supabase.from("content_ideas").select("*").eq("app_user_id", appUserId).eq("status", "open").order("score", { ascending: false }).limit(10),
      supabase.from("relationships").select("*").eq("app_user_id", appUserId).order("relevance_score", { ascending: false }).limit(10),
      supabase.from("x_posts").select("text,public_metrics,created_at,data_source").eq("x_user_id", account?.x_user_id ?? "").order("created_at", { ascending: false }).limit(100),
      supabase.from("growth_metrics").select("measured_on,followers,following,post_count,profile_visits,impressions,likes,replies,reposts,engagement_rate,data_source").eq("app_user_id", appUserId).order("measured_on", { ascending: false }).limit(30),
    ]);

    const profile: GrowthProfile = {
      niche: profileRow?.topics?.join(", ") || DEFAULT_GROWTH_PROFILE.niche,
      content_pillars: profileRow?.content_pillars ?? DEFAULT_GROWTH_PROFILE.content_pillars,
      tone: profileRow?.tone ?? DEFAULT_GROWTH_PROFILE.tone,
      avoid_topics: profileRow?.avoid_topics ?? DEFAULT_GROWTH_PROFILE.avoid_topics,
      target_followers: profileRow?.target_followers ?? DEFAULT_GROWTH_PROFILE.target_followers,
    };
    const rankedOpportunities = (opportunities ?? []).map((o) => ({ ...o, opportunity_score: scoreOpportunity({ topic: o.topic, content: o.content, momentum: o.momentum_score, relevance: o.relevance_score, conversation: o.conversation_score }, profile) })).sort((a, b) => b.opportunity_score - a.opportunity_score);
    const rankedIdeas = (ideas ?? []).map((i) => ({ ...i, score: scoreContentOpportunity(i, profile) })).sort((a, b) => b.score - a.score);
    const realPosts = (posts ?? []).filter((p) => p.data_source !== "demo").map((p) => { const m = (p.public_metrics ?? {}) as Record<string, number>; return { text: p.text, engagements: (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0) + (m.quote_count ?? 0), impressions: m.impression_count ?? 0 }; });
    const learning = learningSummary(realPosts);
    const topPerson = (relationships ?? [])[0];
    const actions = [
      rankedOpportunities[0] && { type: "opportunity", priority: rankedOpportunities[0].opportunity_score, title: `Join the conversation about ${rankedOpportunities[0].topic}`, reason: rankedOpportunities[0].reason || "Strong niche and conversation fit.", referenceId: rankedOpportunities[0].id },
      rankedIdeas[0] && { type: "content", priority: rankedIdeas[0].score, title: `Draft: ${rankedIdeas[0].title}`, reason: rankedIdeas[0].reason || "Strong first-hand content potential.", referenceId: rankedIdeas[0].id },
      topPerson && { type: "relationship", priority: topPerson.relevance_score, title: `Continue the relationship with @${topPerson.x_username}`, reason: `${topPerson.interaction_count} recorded interactions and ${topPerson.relevance_score}/100 relevance.`, referenceId: topPerson.id },
    ].filter(Boolean).sort((a, b) => Number((b as { priority: number }).priority) - Number((a as { priority: number }).priority)).slice(0, 5);
    const latestMetric = metrics?.[0];
    const followerCount = account?.followers_count ?? latestMetric?.followers ?? 0;
    return NextResponse.json({ account, goal: profile.target_followers, progress: { followers: followerCount, remaining: Math.max(0, profile.target_followers - followerCount), percent: Math.min(100, Number(((followerCount / Math.max(1, profile.target_followers)) * 100).toFixed(2))) }, actions, opportunities: rankedOpportunities, content: rankedIdeas, relationships: relationships ?? [], learning, dataStatus: { x: account?.sync_status ?? "unavailable", realPosts: realPosts.length, demoAvailable: true, lastSuccessfulSyncAt: account?.last_successful_sync_at ?? null }, metrics: metrics ?? [], postSignals: realPosts.map((p) => ({ ...classifyPost(p.text), engagements: p.engagements, impressions: p.impressions })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build growth command center";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
