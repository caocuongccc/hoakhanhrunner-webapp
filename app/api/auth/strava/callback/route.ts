// app/api/auth/strava/callback/route.ts - IMPROVED VERSION
import { NextRequest, NextResponse } from "next/server";
import { exchangeStravaCode } from "@/lib/strava";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { syncToEventActivitiesV2 } from "@/lib/sync-helpers";

/**
 * Save/update best efforts - ONLY KEEP THE FASTEST TIME
 */
async function saveBestEfforts(
  userId: string,
  activityId: number,
  bestEfforts: any[],
) {
  if (!bestEfforts || bestEfforts.length === 0) return;

  for (const effort of bestEfforts) {
    // Check if we already have a record for this distance
    const { data: existingPR } = await supabase
      .from("best_efforts")
      .select("*")
      .eq("user_id", userId)
      .eq("effort_name", effort.name)
      .order("elapsed_time", { ascending: true })
      .limit(1)
      .single();

    // If new time is faster, replace the old record
    if (!existingPR || effort.elapsed_time < existingPR.elapsed_time) {
      // Delete old record if exists
      if (existingPR) {
        await supabase
          .from("best_efforts")
          .delete()
          .eq("user_id", userId)
          .eq("effort_name", effort.name);
      }

      // Insert new PR
      await supabase.from("best_efforts").insert({
        user_id: userId,
        strava_activity_id: activityId,
        effort_name: effort.name,
        elapsed_time: effort.elapsed_time,
        moving_time: effort.moving_time,
        distance: effort.distance,
        start_date: effort.start_date,
        start_date_local: effort.start_date_local,
        raw_data: effort,
      });

      console.log(`✅ New PR for ${effort.name}: ${effort.elapsed_time}s`);
    }
  }
}

/**
 * Auto sync activities in background after login
 */
async function autoSyncActivities(userId: string, accessToken: string) {
  try {
    console.log("🔄 Auto-syncing 30 recent activities...");

    // Fetch 30 recent activities
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=30&page=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch activities for auto-sync");
      return;
    }

    const activities = await response.json();
    const runningActivities = activities.filter(
      (a: any) => a.sport_type === "Run" || a.type === "Run",
    );

    console.log(
      `📊 Found ${runningActivities.length} running activities out of ${activities.length} total`,
    );

    const { data: user } = await supabase
      .from("users")
      .select("strava_id")
      .eq("id", userId)
      .single();

    if (!user) return;

    let syncedCount = 0;

    for (const activity of runningActivities) {
      // Fetch detailed activity for best efforts and polyline
      const detailResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!detailResponse.ok) continue;

      const detailedActivity = await detailResponse.json();

      // Save to strava_activities
      const { error } = await supabase.from("strava_activities").upsert(
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
        { onConflict: "strava_activity_id" },
      );

      if (!error) {
        // Save best efforts (only keep fastest)
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

        // Sync to events
        // await syncToEventActivities(userId, detailedActivity);
        await syncToEventActivitiesV2(userId, detailedActivity);
        syncedCount++;
      }
    }

    console.log(`✅ Auto-sync completed: ${syncedCount} activities synced`);
  } catch (error) {
    console.error("❌ Auto-sync error:", error);
  }
}

/**
 * Sync activity to event activities
 */
async function syncToEventActivities(userId: string, activity: any) {
  try {
    const activityDateTime = new Date(activity.start_date_local);
    const activityDate = activityDateTime.toISOString().split("T")[0];

    const { data: participations } = await supabase
      .from("event_participants")
      .select("event_id, events!inner(*)")
      .eq("user_id", userId);

    if (!participations || participations.length === 0) return;

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
              route_data: routeData,
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
              route_data: routeData,
              description: activity.name,
              points_earned: distanceKm,
            },
          ]);
        }

        // Update event_participants stats
        await updateParticipantStats(eventId, userId);

        console.log(`✅ Synced to event ${eventId}`);
      }
    }
  } catch (error) {
    console.error("Error syncing to events:", error);
  }
}

/**
 * Update event_participants total_km and total_points
 */
async function updateParticipantStats(eventId: string, userId: string) {
  try {
    const { data: activities } = await supabase
      .from("activities")
      .select("distance_km, points_earned")
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (!activities || activities.length === 0) return;

    const totalKm = activities.reduce(
      (sum, a) => sum + (a.distance_km || 0),
      0,
    );
    const totalPoints = activities.reduce(
      (sum, a) => sum + (a.points_earned || 0),
      0,
    );

    await supabase
      .from("event_participants")
      .update({
        total_km: totalKm,
        total_points: totalPoints,
      })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    console.log(
      `📊 Updated participant stats: ${totalKm.toFixed(2)}km, ${totalPoints.toFixed(2)} pts`,
    );
  } catch (error) {
    console.error("Error updating participant stats:", error);
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
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=${encodeURIComponent(error)}`,
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=no_code`,
      );
    }

    const requiredScopes = ["read", "activity:read_all"];
    const approvedScopes = scope?.split(",") || [];
    const hasAllScopes = requiredScopes.every((s) =>
      approvedScopes.includes(s),
    );

    if (!hasAllScopes) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=insufficient_scope`,
      );
    }

    const { tokens, athlete } = await exchangeStravaCode(code);

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("strava_id", athlete.id)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      await supabase
        .from("users")
        .update({
          strava_access_token: tokens.access_token,
          strava_refresh_token: tokens.refresh_token,
          strava_token_expires_at: new Date(
            tokens.expires_at * 1000,
          ).toISOString(),
          strava_athlete_data: athlete,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
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
              tokens.expires_at * 1000,
            ).toISOString(),
            strava_athlete_data: athlete,
          },
        ])
        .select()
        .single();

      if (createError || !newUser) {
        console.error("Error creating user:", createError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/?error=user_creation_failed`,
        );
      }

      userId = newUser.id;
    }

    const cookieStore = await cookies();
    cookieStore.set("user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    // AUTO-SYNC 30 ACTIVITIES IN BACKGROUND (don't await)
    autoSyncActivities(userId, tokens.access_token).catch((err) => {
      console.error("Background sync error:", err);
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth=success${isNewUser ? "&new_user=true" : ""}`,
    );
  } catch (error: any) {
    console.error("Strava callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=callback_failed`,
    );
  }
}
