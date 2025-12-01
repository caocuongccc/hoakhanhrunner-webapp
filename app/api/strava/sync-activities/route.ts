// app/api/strava/sync-activities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

/**
 * Helper: Refresh Strava token
 */
async function refreshStravaToken(refreshToken: string) {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error("Failed to refresh token");
  return response.json();
}

/**
 * Helper: Get valid access token
 */
async function getValidAccessToken(userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select(
      "strava_access_token, strava_refresh_token, strava_token_expires_at"
    )
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  const expiresAt = new Date(user.strava_token_expires_at).getTime();
  const now = Date.now();

  if (expiresAt - now < 5 * 60 * 1000) {
    const newTokens = await refreshStravaToken(user.strava_refresh_token);

    await supabase
      .from("users")
      .update({
        strava_access_token: newTokens.access_token,
        strava_refresh_token: newTokens.refresh_token,
        strava_token_expires_at: new Date(
          newTokens.expires_at * 1000
        ).toISOString(),
      })
      .eq("id", userId);

    return newTokens.access_token;
  }

  return user.strava_access_token;
}

/**
 * Helper: Fetch activities from Strava
 */
async function fetchStravaActivities(
  accessToken: string,
  after?: number,
  before?: number,
  page: number = 1,
  perPage: number = 30
) {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  if (after) params.append("after", after.toString());
  if (before) params.append("before", before.toString());

  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch activities from Strava");
  }

  return response.json();
}

/**
 * Helper: Save best efforts
 */
async function saveBestEfforts(
  userId: string,
  activityId: number,
  bestEfforts: any[]
) {
  if (!bestEfforts || bestEfforts.length === 0) return;

  const records = bestEfforts.map((effort) => ({
    user_id: userId,
    strava_activity_id: activityId,
    effort_name: effort.name,
    elapsed_time: effort.elapsed_time,
    moving_time: effort.moving_time,
    distance: effort.distance,
    start_date: effort.start_date,
    start_date_local: effort.start_date_local,
    raw_data: effort,
  }));

  const { error } = await supabase.from("best_efforts").upsert(records, {
    onConflict: "user_id,strava_activity_id,effort_name",
  });

  if (error) {
    console.error("Error saving best efforts:", error);
  }
}

/**
 * POST - Manually sync activities from Strava
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { after, before, page = 1, perPage = 30 } = body;

    // Get valid access token
    const accessToken = await getValidAccessToken(userId);

    // Fetch activities from Strava
    const activities = await fetchStravaActivities(
      accessToken,
      after,
      before,
      page,
      perPage
    );

    // Filter only running activities
    const runningActivities = activities.filter(
      (a: any) => a.sport_type === "Run" || a.type === "Run"
    );

    // Get user's athlete ID
    const { data: user } = await supabase
      .from("users")
      .select("strava_id")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save activities to database
    const savedActivities = [];
    for (const activity of runningActivities) {
      // Fetch detailed activity to get best efforts
      const detailResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const detailedActivity = await detailResponse.json();

      // Save to strava_activities
      const { data, error } = await supabase
        .from("strava_activities")
        .upsert(
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
              achievement_count: detailedActivity.achievement_count,
              kudos_count: detailedActivity.kudos_count,
              comment_count: detailedActivity.comment_count,
              athlete_count: detailedActivity.athlete_count,
              photo_count: detailedActivity.photo_count,
              map_polyline: detailedActivity.map?.polyline,
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
          {
            onConflict: "strava_activity_id",
          }
        )
        .select()
        .single();

      if (!error && data) {
        // Save best efforts if available
        if (
          detailedActivity.best_efforts &&
          detailedActivity.best_efforts.length > 0
        ) {
          await saveBestEfforts(
            userId,
            detailedActivity.id,
            detailedActivity.best_efforts
          );
        }

        savedActivities.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${savedActivities.length} running activities`,
      data: {
        total: activities.length,
        running: savedActivities.length,
        activities: savedActivities,
      },
    });
  } catch (error: any) {
    console.error("Sync activities error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync activities" },
      { status: 500 }
    );
  }
}
