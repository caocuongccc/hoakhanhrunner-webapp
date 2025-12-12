import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { fetchStravaActivities, getValidAccessToken } from "@/lib/strava";

/**
 * POST - Manually sync activities from Strava
 * Useful for initial sync or catching up on missed activities
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { after, before, page = 1, perPage = 30 } = await request.json();

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
      (a) => a.sport_type === "Run" || a.type === "Run"
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
      const { data, error } = await supabase
        .from("strava_activities")
        .upsert(
          [
            {
              strava_activity_id: activity.id,
              user_id: userId,
              athlete_id: user.strava_id,
              name: activity.name,
              distance: activity.distance,
              moving_time: activity.moving_time,
              elapsed_time: activity.elapsed_time,
              total_elevation_gain: activity.total_elevation_gain,
              sport_type: activity.sport_type,
              start_date: activity.start_date,
              start_date_local: activity.start_date_local,
              timezone: activity.timezone,
              achievement_count: activity.achievement_count,
              kudos_count: activity.kudos_count,
              comment_count: activity.comment_count,
              athlete_count: activity.athlete_count,
              photo_count: activity.photo_count,
              map_polyline: activity.map?.polyline,
              map_summary_polyline: activity.map?.summary_polyline,
              average_speed: activity.average_speed,
              max_speed: activity.max_speed,
              average_heartrate: activity.average_heartrate,
              max_heartrate: activity.max_heartrate,
              has_heartrate: activity.has_heartrate,
              raw_data: activity,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
