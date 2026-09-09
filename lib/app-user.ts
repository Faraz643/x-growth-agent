import "server-only";

import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const APP_USER_COOKIE = "xga_user_id";

export async function getOrCreateAppUser() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(APP_USER_COOKIE)?.value;
  if (existing) return { id: existing, isNew: false };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("app_users").insert({}).select("id").single();
  if (error || !data) throw new Error(error?.message || "Could not create app user");

  return { id: data.id as string, isNew: true };
}

export async function getCurrentAppUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(APP_USER_COOKIE)?.value ?? null;
}
