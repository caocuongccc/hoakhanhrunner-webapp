import { NextRequest, NextResponse } from "next/server";
import { exchangeStravaCode } from "@/lib/strava";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const scope = searchParams.get("scope");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=no_code`
      );
    }

    // Check if user approved all required scopes
    const requiredScopes = ["read", "activity:read_all"];
    const approvedScopes = scope?.split(",") || [];
    const hasAllScopes = requiredScopes.every((s) =>
      approvedScopes.includes(s)
    );

    if (!hasAllScopes) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=insufficient_scope`
      );
    }

    // Exchange code for tokens
    const { tokens, athlete } = await exchangeStravaCode(code);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("strava_id", athlete.id)
      .single();

    let userId: string;

    if (existingUser) {
      // Update existing user's tokens
      userId = existingUser.id;
      await supabase
        .from("users")
        .update({
          strava_access_token: tokens.access_token,
          strava_refresh_token: tokens.refresh_token,
          strava_token_expires_at: new Date(
            tokens.expires_at * 1000
          ).toISOString(),
          strava_athlete_data: athlete,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      // Create new user
      const username =
        athlete.username ||
        `${athlete.firstname}_${athlete.lastname}`
          .toLowerCase()
          .replace(/\s+/g, "_");
      const email = `strava_${athlete.id}@temp.local`; // Strava doesn't provide email in basic scope

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            strava_id: athlete.id,
            username,
            email,
            full_name: `${athlete.firstname} ${athlete.lastname}`,
            avatar_url: athlete.profile,
            strava_access_token: tokens.access_token,
            strava_refresh_token: tokens.refresh_token,
            strava_token_expires_at: new Date(
              tokens.expires_at * 1000
            ).toISOString(),
            strava_athlete_data: athlete,
          },
        ])
        .select()
        .single();

      if (createError || !newUser) {
        console.error("Error creating user:", createError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/?error=user_creation_failed`
        );
      }

      userId = newUser.id;
    }

    // Create a simple session by setting cookie
    const cookieStore = cookies();
    cookieStore.set("user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    // Redirect to home page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth=success`
    );
  } catch (error: any) {
    console.error("Strava callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=callback_failed`
    );
  }
}
