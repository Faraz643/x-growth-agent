import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedUser, getUserPosts } from "@/lib/x/client";

export async function POST() {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: account, error: accountError } = await supabase
    .from("x_accounts")
    .select("id,x_user_id,access_token_encrypted,refresh_token_encrypted,access_token_expires_at")
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (accountError || !account) return NextResponse.json({ error: "X account not found" }, { status: 404 });

  try {
    const profile = await getAuthenticatedUser(account);
    const posts = await getUserPosts(account, profile.id);
    const metrics = profile.public_metrics ?? {};

    await supabase
      .from("x_accounts")
      .update({
        username: profile.username,
        name: profile.name,
        description: profile.description ?? null,
        profile_image_url: profile.profile_image_url ?? null,
        followers_count: metrics.followers_count ?? 0,
        following_count: metrics.following_count ?? 0,
        tweet_count: metrics.tweet_count ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (posts.length) {
      const rows = posts.map((post) => ({
        x_post_id: post.id,
        x_user_id: profile.id,
        text: post.text,
        created_at: post.created_at ?? new Date().toISOString(),
        public_metrics: post.public_metrics ?? {},
        synced_at: new Date().toISOString(),
      }));
      const { error: postsError } = await supabase.from("x_posts").upsert(rows, { onConflict: "x_post_id" });
      if (postsError) throw new Error(postsError.message);
    }

    return NextResponse.json({ synced: true, profile, postsSynced: posts.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "X sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
