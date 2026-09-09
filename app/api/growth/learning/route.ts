import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";
import { learningSummary } from "@/lib/growth/intelligence";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const { data, error } = await supabase.from("x_posts").select("text,public_metrics").eq("x_user_id", (await supabase.from("x_accounts").select("x_user_id").eq("app_user_id", appUserId).maybeSingle()).data?.x_user_id || "").limit(100);
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map((p) => {
      const m = (p.public_metrics ?? {}) as Record<string, number>;
      return { text: p.text ?? "", engagements: (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0) + (m.quote_count ?? 0), impressions: m.impression_count ?? 0 };
    });
    return NextResponse.json(learningSummary(rows));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load learning" }, { status: 401 });
  }
}
