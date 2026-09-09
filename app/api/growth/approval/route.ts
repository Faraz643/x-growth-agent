import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/growth/db";

export async function GET() {
  try {
    const { appUserId, supabase } = await requireAppUser();
    const [content, replies, opportunities] = await Promise.all([
      supabase.from("content_drafts").select("id,body,format,status,created_at").eq("app_user_id", appUserId).in("status", ["draft", "saved"]).order("created_at", { ascending: false }).limit(20),
      supabase.from("reply_suggestions").select("id,author_username,source_content,reply,status,created_at").eq("app_user_id", appUserId).in("status", ["pending", "saved"]).order("created_at", { ascending: false }).limit(20),
      supabase.from("opportunities").select("id,author_username,author_name,topic,content,opportunity_score,status,source_type").eq("app_user_id", appUserId).eq("status", "open").order("opportunity_score", { ascending: false }).limit(20),
    ]);
    const error = content.error || replies.error || opportunities.error;
    if (error) throw new Error(error.message);
    return NextResponse.json({ content: content.data ?? [], replies: replies.data ?? [], opportunities: opportunities.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load approval queue" }, { status: 401 });
  }
}
