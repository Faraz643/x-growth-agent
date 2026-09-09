import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { learningSummary } from "@/lib/growth/intelligence";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data: account } = await supabase.from("x_accounts").select("x_user_id").eq("app_user_id", appUserId).maybeSingle();
    const { data: posts, error } = await supabase.from("x_posts").select("text,public_metrics,data_source").eq("x_user_id", account?.x_user_id || "").neq("data_source", "demo").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    const rows = (posts ?? []).map((p) => {
      const m = (p.public_metrics ?? {}) as Record<string, number>;
      return { text: p.text, engagements: (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0) + (m.quote_count ?? 0), impressions: m.impression_count ?? 0 };
    });
    return NextResponse.json({ ...learningSummary(rows), postsAnalyzed: rows.length, dataSource: "real" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load learning signals";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
