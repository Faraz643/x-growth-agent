import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const APP_USER_COOKIE = "xga_user_id";

function sign(id: string) {
  return createHmac("sha256", Buffer.from(getServerEnv().encryptionKey, "hex"))
    .update(id)
    .digest("base64url");
}

function verify(value: string) {
  const [id, signature] = value.split(".");
  if (!id || !signature) return null;

  const expected = sign(id);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return id;
}

export async function getOrCreateAppUser() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(APP_USER_COOKIE)?.value;
  const verified = existing ? verify(existing) : null;
  if (verified) return { id: verified, cookieValue: existing!, isNew: false };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("app_users").insert({}).select("id").single();
  if (error || !data) throw new Error(error?.message || "Could not create app user");

  const id = data.id as string;
  return { id, cookieValue: `${id}.${sign(id)}`, isNew: true };
}

export async function getCurrentAppUserId() {
  const cookieStore = await cookies();
  const value = cookieStore.get(APP_USER_COOKIE)?.value;
  return value ? verify(value) : null;
}
