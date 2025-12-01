// app/api/auth/strava/callback/route.ts - With Auto Sync
import { NextRequest, NextResponse } from "next/server";
import { exchangeStravaCode } from "@/lib/strava";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

/**
 * Auto sync activities in background after login
 */
async function autoSyncActivities(userId: string, accessToken: string) {
  try {
    console.log("🔄 Auto-syncing 50 recent activities...");

    // Fetch 50 recent activities from Strava
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=50&page=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch activities for auto-sync");
      return;
    }

    const activities = await response.json();
    const runningActivities = activities.filter(
      (a: any) => a.sport_type === "Run" || a.type === "Run"
    );

    console.log(
      `📊 Found ${runningActivities.length} running activities out of ${activities.length} total`
    );

    // Get user's strava_id
    const { data: user } = await supabase
      .from("users")
      .select("strava_id")
      .eq("id", userId)
      .single();

    if (!user) return;

    // Save each running activity
    for (const activity of runningActivities) {
      // Fetch detailed activity to get best efforts
      const detailResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!detailResponse.ok) continue;

      const detailedActivity = await detailResponse.json();

      // Save to strava_activities
      await supabase.from("strava_activities").upsert(
        [
          {
            strava_activity_id: detailedActivity.id,
            user_id: userId,
            athlete_id: user.strava_id,
            name: detailedActivity.name,
            distance: detailedActivity.distance,
            moving_time: detailedActivity.moving_time,
            elapsed_time: detailedActivity.elapsed_time,
            total_elevation_gain: detailedActivity.total_elevation_gain,
            sport_type: detailedActivity.sport_type,
            start_date: detailedActivity.start_date,
            start_date_local: detailedActivity.start_date_local,
            timezone: detailedActivity.timezone,
            map_summary_polyline: detailedActivity.map?.summary_polyline,
            average_speed: detailedActivity.average_speed,
            max_speed: detailedActivity.max_speed,
            average_heartrate: detailedActivity.average_heartrate,
            max_heartrate: detailedActivity.max_heartrate,
            has_heartrate: detailedActivity.has_heartrate,
            raw_data: detailedActivity,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "strava_activity_id" }
      );

      // Save best efforts if available
      if (
        detailedActivity.best_efforts &&
        detailedActivity.best_efforts.length > 0
      ) {
        const records = detailedActivity.best_efforts.map((effort: any) => ({
          user_id: userId,
          strava_activity_id: detailedActivity.id,
          effort_name: effort.name,
          elapsed_time: effort.elapsed_time,
          moving_time: effort.moving_time,
          distance: effort.distance,
          start_date: effort.start_date,
          start_date_local: effort.start_date_local,
          raw_data: effort,
        }));

        await supabase.from("best_efforts").upsert(records, {
          onConflict: "user_id,strava_activity_id,effort_name",
        });
      }
    }

    console.log(
      `✅ Auto-sync completed: ${runningActivities.length} activities synced`
    );
  } catch (error) {
    console.error("❌ Auto-sync error:", error);
    // Don't throw - this is background process
  }
}

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
    let isNewUser = false;

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
      isNewUser = true;
      const username =
        athlete.username ||
        `${athlete.firstname}_${athlete.lastname}`
          .toLowerCase()
          .replace(/\s+/g, "_");
      const email = `strava_${athlete.id}@temp.local`;

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

    // Auto-sync 50 recent activities in background (don't await)
    autoSyncActivities(userId, tokens.access_token).catch((err) => {
      console.error("Background sync error:", err);
    });

    // Redirect to home page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth=success${isNewUser ? "&new_user=true" : ""}`
    );
  } catch (error: any) {
    console.error("Strava callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=callback_failed`
    );
  }
}
