import { NextRequest, NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/security/token-crypto";
import { exchangeCode } from "@/lib/x/oauth";
import { getAuthenticatedUser } from "@/lib/x/client";

export async function GET(request: NextRequest) {
  const redirect = (params: Record<string, string>) => {
    const url = new URL("/", request.url);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = NextResponse.redirect(url);
    response.cookies.delete("x_oauth_state");
    response.cookies.delete("x_oauth_verifier");
    return response;
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get("x_oauth_state")?.value;
  const verifier = request.cookies.get("x_oauth_verifier")?.value;
  const appUserId = await getCurrentAppUserId();

  if (oauthError) return redirect({ x_error: "X authorization was cancelled" });
  if (!code || !state || state !== expectedState || !verifier) {
    return redirect({ x_error: "The X authorization session expired or was invalid" });
  }
  if (!appUserId) return redirect({ x_error: "Your local app session is missing. Please try again" });

  try {
    const token = await exchangeCode(code, verifier);
    const temporaryAccount = {
      id: "pending",
      access_token_encrypted: encryptSecret(token.access_token),
      refresh_token_encrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      access_token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    };
    const profile = await getAuthenticatedUser(temporaryAccount);
    const supabase = getSupabaseAdmin();
    const metrics = profile.public_metrics ?? {};

    const { error } = await supabase.from("x_accounts").upsert(
      {
        app_user_id: appUserId,
        x_user_id: profile.id,
        username: profile.username,
        name: profile.name,
        description: profile.description ?? null,
        profile_image_url: profile.profile_image_url ?? null,
        followers_count: metrics.followers_count ?? 0,
        following_count: metrics.following_count ?? 0,
        tweet_count: metrics.tweet_count ?? 0,
        access_token_encrypted: temporaryAccount.access_token_encrypted,
        refresh_token_encrypted: temporaryAccount.refresh_token_encrypted,
        access_token_expires_at: temporaryAccount.access_token_expires_at,
        scopes: token.scope ? token.scope.split(" ") : [],
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "x_user_id" },
    );

    if (error) throw new Error(error.message);
    return redirect({ x_connected: "1" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not connect your X account";
    return redirect({ x_error: message });
  }
}
