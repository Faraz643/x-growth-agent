import { NextResponse } from "next/server";
import { getOrCreateAppUser, APP_USER_COOKIE } from "@/lib/app-user";
import { buildAuthorizeUrl, createPkcePair, createState } from "@/lib/x/oauth";

export async function GET(request: Request) {
  try {
    const { id, isNew } = await getOrCreateAppUser();
    const state = createState();
    const { verifier, challenge } = createPkcePair();
    const response = NextResponse.redirect(buildAuthorizeUrl(state, challenge));

    if (isNew) {
      response.cookies.set(APP_USER_COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    response.cookies.set("x_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("x_oauth_verifier", verifier, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start X authorization";
    return NextResponse.redirect(new URL(`/?x_error=${encodeURIComponent(message)}`, request.url));
  }
}
