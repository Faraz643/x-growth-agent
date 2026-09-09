import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) return NextResponse.json({ connected: false });

  const supabase = getSupabaseAdmin();
  const { data: account, error } = await supabase
    .from("x_accounts")
    .select("x_user_id,username,name,description,profile_image_url,followers_count,following_count,tweet_count,connected_at,updated_at")
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (error) return NextResponse.json({ connected: false, error: error.message }, { status: 500 });

  return NextResponse.json({ connected: Boolean(account), account });
}
