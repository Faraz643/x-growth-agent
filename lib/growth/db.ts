import "server-only";
import { getCurrentAppUserId } from "@/lib/app-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function requireAppUser() {
  const appUserId = await getCurrentAppUserId();
  if (!appUserId) throw new Error("UNAUTHENTICATED");
  return { appUserId, supabase: getSupabaseAdmin() };
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  return { error: message === "UNAUTHENTICATED" ? "Not connected" : message };
}
