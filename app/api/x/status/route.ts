import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) return NextResponse.json({ connected: false });
  const { data: account, error } = await getSupabaseAdmin().from("x_accounts")
    .select("x_user_id,username,name,description,profile_image_url,followers_count,following_count,tweet_count,connected_at,updated_at,last_successful_sync_at,sync_status,sync_error_code")
    .eq("app_user_id", appUserId).maybeSingle();
  if (error) return NextResponse.json({ connected: false, error: error.message }, { status: 500 });
  return NextResponse.json({ connected: Boolean(account), account });
}
