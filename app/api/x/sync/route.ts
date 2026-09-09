import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedUser, getUserPosts, XApiError } from "@/lib/x/client";

export async function POST() {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: account, error: accountError } = await supabase.from("x_accounts")
    .select("id,x_user_id,access_token_encrypted,refresh_token_encrypted,access_token_expires_at")
    .eq("app_user_id", appUserId).maybeSingle();
  if (accountError || !account) return NextResponse.json({ error: "X account not found" }, { status: 404 });

  try {
    const profile = await getAuthenticatedUser(account);
    let posts: Awaited<ReturnType<typeof getUserPosts>> = [];
    try {
      posts = await getUserPosts(account, profile.id);
    } catch (error) {
      if (error instanceof XApiError && error.code === "X_API_CREDITS_DEPLETED") {
        await supabase.from("x_accounts").update({ sync_status: "limited", sync_error_code: error.code, updated_at: new Date().toISOString() }).eq("id", account.id);
        return NextResponse.json({ synced: false, code: error.code, message: error.message }, { status: 200 });
      }
      throw error;
    }

    const metrics = profile.public_metrics ?? {};
    const now = new Date().toISOString();
    const { error: accountUpdateError } = await supabase.from("x_accounts").update({
      username: profile.username, name: profile.name, description: profile.description ?? null,
      profile_image_url: profile.profile_image_url ?? null, followers_count: metrics.followers_count ?? 0,
      following_count: metrics.following_count ?? 0, tweet_count: metrics.tweet_count ?? 0,
      last_successful_sync_at: now, sync_status: "success", sync_error_code: null, updated_at: now,
    }).eq("id", account.id);
    if (accountUpdateError) throw new Error(accountUpdateError.message);

    if (posts.length) {
      const rows = posts.map((post) => ({ x_post_id: post.id, x_user_id: profile.id, text: post.text,
        created_at: post.created_at ?? now, public_metrics: post.public_metrics ?? {}, synced_at: now }));
      const { error: postsError } = await supabase.from("x_posts").upsert(rows, { onConflict: "x_post_id" });
      if (postsError) throw new Error(postsError.message);
    }
    return NextResponse.json({ synced: true, profile, postsSynced: posts.length, lastSuccessfulSyncAt: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "X sync failed";
    if (error instanceof XApiError) {
      return NextResponse.json({ code: error.code, error: message }, { status: error.status });
    }
    console.error("X SYNC ERROR:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
