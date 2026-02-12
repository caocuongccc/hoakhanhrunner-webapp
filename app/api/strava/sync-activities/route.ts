// app/api/strava/sync-activities/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

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

async function getValidAccessToken(userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select(
      "strava_access_token, strava_refresh_token, strava_token_expires_at",
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
          newTokens.expires_at * 1000,
        ).toISOString(),
      })
      .eq("id", userId);

    return newTokens.access_token;
  }

  return user.strava_access_token;
}

async function saveBestEfforts(
  userId: string,
  activityId: number,
  bestEfforts: any[],
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

// Helper: Sync activity to events
async function syncToEventActivities(userId: string, activity: any) {
  try {
    // const activityDateTime = new Date(activity.start_date_local);
    // const activityDate = activityDateTime.toISOString().split("T")[0];

    const activityDate = activity.start_date_local.split("T")[0];
    const activityDateTime = new Date(activity.start_date_local);

    const { data: participations } = await supabase
      .from("event_participants")
      .select("event_id, events!inner(*)")
      .eq("user_id", userId);

    if (!participations || participations.length === 0) {
      console.log("No events found for user");
      return;
    }

    for (const participation of participations) {
      const event = participation.events;
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);

      if (activityDateTime >= eventStart && activityDateTime <= eventEnd) {
        const eventId = participation.event_id;
        const distanceKm = activity.distance / 1000;
        const paceMinPerKm =
          activity.moving_time > 0
            ? activity.moving_time / 60 / distanceKm
            : null;

        // IMPORTANT: Save polyline from activity.map.summary_polyline
        const routeData = activity.map?.summary_polyline
          ? { polyline: activity.map.summary_polyline }
          : null;

        const { data: existingActivity } = await supabase
          .from("activities")
          .select("id")
          .eq("user_id", userId)
          .eq("event_id", eventId)
          .eq("activity_date", activityDate)
          .single();

        if (existingActivity) {
          await supabase
            .from("activities")
            .update({
              distance_km: distanceKm,
              duration_seconds: activity.moving_time,
              pace_min_per_km: paceMinPerKm,
              route_data: routeData, // Save polyline
              description: activity.name,
              points_earned: distanceKm,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingActivity.id);
        } else {
          await supabase.from("activities").insert([
            {
              user_id: userId,
              event_id: eventId,
              activity_date: activityDate,
              distance_km: distanceKm,
              duration_seconds: activity.moving_time,
              pace_min_per_km: paceMinPerKm,
              route_data: routeData, // Save polyline
              description: activity.name,
              points_earned: distanceKm,
            },
          ]);
        }

        console.log(`✅ Synced to event ${eventId} with polyline`);
      }
    }
  } catch (error) {
    console.error("Error syncing to events:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { page = 1, perPage = 30 } = body;

    console.log(`📥 Syncing activities for user ${userId}, page ${page}`);

    const accessToken = await getValidAccessToken(userId);

    // Get user's athlete ID
    const { data: user } = await supabase
      .from("users")
      .select("strava_id")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch activities from Strava
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch activities from Strava");
    }

    const activities = await response.json();
    const runningActivities = activities.filter(
      (a: any) => a.sport_type === "Run" || a.type === "Run",
    );

    console.log(
      `📊 Found ${runningActivities.length}/${activities.length} running activities`,
    );

    const savedActivities = [];

    for (const activity of runningActivities) {
      // Fetch DETAILED activity to get best_efforts and polyline
      const detailResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!detailResponse.ok) {
        console.error(`Failed to fetch details for activity ${activity.id}`);
        continue;
      }

      const detailedActivity = await detailResponse.json();

      // Save to strava_activities with polyline
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
              map_summary_polyline: detailedActivity.map?.summary_polyline, // Save polyline
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
          },
        )
        .select()
        .single();

      if (!error && data) {
        // Save best efforts
        if (
          detailedActivity.best_efforts &&
          detailedActivity.best_efforts.length > 0
        ) {
          await saveBestEfforts(
            userId,
            detailedActivity.id,
            detailedActivity.best_efforts,
          );
        }

        // Sync to event activities (with polyline)
        await syncToEventActivities(userId, detailedActivity);

        savedActivities.push(data);
      }
    }

    console.log(`✅ Successfully synced ${savedActivities.length} activities`);

    return NextResponse.json({
      success: true,
      message: `Synced ${savedActivities.length} running activities`,
      data: {
        total: activities.length,
        running: savedActivities.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Sync error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync activities" },
      { status: 500 },
    );
  }
}
