import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

const str = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const integer = (v: unknown) => Math.max(0, Math.floor(Number.isFinite(Number(v)) ? Number(v) : 0));

export async function POST(request: Request) {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const body = await request.json();
    const type = str(body.type, 40);
    if (type === "metric") {
      const measuredOn = str(body.measured_on, 10) || new Date().toISOString().slice(0, 10);
      const impressions = integer(body.impressions), likes = integer(body.likes), replies = integer(body.replies), reposts = integer(body.reposts);
      const engagements = likes + replies + reposts + integer(body.quotes);
      const { data, error } = await supabase.from("growth_metrics").upsert({ app_user_id: appUserId, measured_on: measuredOn, followers: integer(body.followers), following: integer(body.following), post_count: integer(body.post_count), profile_visits: integer(body.profile_visits), impressions, likes, replies, reposts, engagement_rate: impressions ? engagements / impressions : null, data_source: "manual" }, { onConflict: "app_user_id,measured_on,data_source" }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ metric: data }, { status: 201 });
    }
    if (type === "post") {
      const xUserId = str(body.x_user_id, 200);
      const text = str(body.text, 10000);
      const postId = str(body.x_post_id, 200) || `manual-${crypto.randomUUID()}`;
      if (!xUserId || !text) return NextResponse.json({ error: "x_user_id and text are required" }, { status: 400 });
      const public_metrics = { impression_count: integer(body.impressions), like_count: integer(body.likes), reply_count: integer(body.replies), retweet_count: integer(body.reposts), quote_count: integer(body.quotes) };
      const { data, error } = await supabase.from("x_posts").upsert({ x_post_id: postId, x_user_id: xUserId, text, created_at: body.created_at || new Date().toISOString(), public_metrics, synced_at: new Date().toISOString(), data_source: "manual" }, { onConflict: "x_post_id" }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ post: data }, { status: 201 });
    }
    if (type === "research") {
      const title = str(body.title, 300), topic = str(body.topic, 200), summary = str(body.summary, 5000);
      if (!title || !topic || !summary) return NextResponse.json({ error: "title, topic and summary are required" }, { status: 400 });
      const { data, error } = await supabase.from("growth_research").insert({ app_user_id: appUserId, title, topic, summary, source_type: str(body.source_type, 40) || "manual", source_url: str(body.source_url, 1000) || null, relevance_score: Math.min(100, integer(body.relevance_score)), momentum_score: Math.min(100, integer(body.momentum_score)) }).select("*").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ research: data }, { status: 201 });
    }
    return NextResponse.json({ error: "type must be metric, post, or research" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save manual data";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
