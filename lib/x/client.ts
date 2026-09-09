import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/security/token-crypto";
import { refreshAccessToken } from "@/lib/x/oauth";

const X_API = "https://api.x.com/2";

type XAccount = {
  id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  access_token_expires_at: string | null;
};

async function getAccessToken(account: XAccount) {
  if (account.access_token_expires_at) {
    const expiresAt = new Date(account.access_token_expires_at).getTime();
    if (expiresAt > Date.now() + 120_000) return decryptSecret(account.access_token_encrypted);
  }

  if (!account.refresh_token_encrypted) return decryptSecret(account.access_token_encrypted);

  const supabase = getSupabaseAdmin();
  const refreshed = await refreshAccessToken(decryptSecret(account.refresh_token_encrypted));
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from("x_accounts")
    .update({
      access_token_encrypted: encryptSecret(refreshed.access_token),
      refresh_token_encrypted: refreshed.refresh_token
        ? encryptSecret(refreshed.refresh_token)
        : account.refresh_token_encrypted,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  return refreshed.access_token;
}

async function xFetch<T>(account: XAccount, path: string) {
  const token = await getAccessToken(account);
  const response = await fetch(`${X_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.title || "X API request failed");
  }

  return payload as T;
}

export type XMe = {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
  };
};

export async function getAuthenticatedUser(account: XAccount) {
  const fields = "created_at,description,profile_image_url,public_metrics,verified";
  const payload = await xFetch<{ data: XMe }>(account, `/users/me?user.fields=${fields}`);
  return payload.data;
}

export type XPost = {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: Record<string, number>;
};

export async function getUserPosts(account: XAccount, xUserId: string) {
  const params = new URLSearchParams({
    max_results: "20",
    exclude: "retweets,replies",
    "tweet.fields": "created_at,public_metrics,author_id",
  });

  const payload = await xFetch<{ data?: XPost[]; meta?: { result_count?: number } }>(
    account,
    `/users/${xUserId}/tweets?${params.toString()}`,
  );

  return payload.data ?? [];
}
