import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getOptionalServerEnv, getServerEnv } from "@/lib/env";

export const X_SCOPES = ["tweet.read", "users.read", "offline.access"];

function base64url(value: Buffer) {
  return value.toString("base64url");
}

export function createPkcePair() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function createState() {
  return base64url(randomBytes(32));
}

export function buildAuthorizeUrl(state: string, challenge: string) {
  const { xClientId, xRedirectUri } = getServerEnv();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: xClientId,
    redirect_uri: xRedirectUri,
    scope: X_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

async function requestToken(body: URLSearchParams) {
  const { xClientId } = getServerEnv();
  const { xClientSecret } = getOptionalServerEnv();
  const headers: HeadersInit = { "Content-Type": "application/x-www-form-urlencoded" };

  if (xClientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${xClientId}:${xClientSecret}`).toString("base64")}`;
  }

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error_description || payload?.detail || "X token request failed");
  return payload as {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token?: string;
    scope?: string;
  };
}

export function exchangeCode(code: string, verifier: string) {
  const { xClientId, xRedirectUri } = getServerEnv();
  return requestToken(new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: xClientId,
    redirect_uri: xRedirectUri,
    code_verifier: verifier,
  }));
}

export function refreshAccessToken(refreshToken: string) {
  const { xClientId } = getServerEnv();
  return requestToken(new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    client_id: xClientId,
  }));
}
