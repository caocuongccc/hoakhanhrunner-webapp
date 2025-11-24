import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchStravaActivity, getValidAccessToken } from "@/lib/strava";

/**
 * GET - Webhook validation endpoint
 * Strava will send a GET request to verify the webhook
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("Webhook validation request:", { mode, token, challenge });

    // Verify the token matches what we expect
    if (
      mode === "subscribe" &&
      token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
    ) {
      console.log("Webhook validation successful");
      return NextResponse.json({ "hub.challenge": challenge });
    }

    console.log("Webhook validation failed");
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  } catch (error: any) {
    console.error("Webhook validation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Webhook event handler
 * Strava sends activity events here
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("Webhook event received:", payload);

    const {
      subscription_id,
      aspect_type, // 'create', 'update', 'delete'
      object_type, // 'activity', 'athlete'
      object_id,
      owner_id,
      event_time,
    } = payload;

    // Log the webhook event
    const { data: loggedEvent } = await supabase
      .from("strava_webhook_events")
      .insert([
        {
          subscription_id,
          aspect_type,
          object_type,
          object_id,
          owner_id,
          event_time: new Date(event_time * 1000).toISOString(),
          raw_payload: payload,
        },
      ])
      .select()
      .single();

    // Only process activity events
    if (object_type === "activity") {
      // Process in background (don't block webhook response)
      processActivityEvent(
        loggedEvent.id,
        aspect_type,
        object_id,
        owner_id
      ).catch((err) => {
        console.error("Error processing activity event:", err);
      });
    }

    // Always return success quickly to Strava
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook event error:", error);
    // Still return success to avoid Strava retries
    return NextResponse.json({ success: true });
  }
}

/**
 * Process activity event in background
 */
async function processActivityEvent(
  eventId: string,
  aspectType: string,
  activityId: number,
  athleteId: number
) {
  try {
    // Find user by Strava athlete ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("strava_id", athleteId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found for athlete ID: ${athleteId}`);
    }

    if (aspectType === "create" || aspectType === "update") {
      // Get valid access token
      const accessToken = await getValidAccessToken(user.id);

      // Fetch activity details from Strava
      const activity = await fetchStravaActivity(activityId, accessToken);

      // Only process running activities
      if (activity.sport_type !== "Run" && activity.type !== "Run") {
        console.log(`Skipping non-running activity: ${activity.sport_type}`);
        await updateEventStatus(eventId, true, "Skipped non-running activity");
        return;
      }

      // Save or update Strava activity
      const { data: stravaActivity, error: activityError } = await supabase
        .from("strava_activities")
        .upsert(
          [
            {
              strava_activity_id: activity.id,
              user_id: user.id,
              athlete_id: athleteId,
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

      if (activityError) {
        throw new Error(
          `Failed to save Strava activity: ${activityError.message}`
        );
      }

      // Sync to activities table for ongoing events
      await syncToEventActivities(stravaActivity.id, user.id, activity);

      await updateEventStatus(eventId, true, "Activity processed successfully");
      console.log(
        `Successfully processed activity ${activityId} for user ${user.username}`
      );
    } else if (aspectType === "delete") {
      // Mark activity as deleted
      await supabase
        .from("strava_activities")
        .delete()
        .eq("strava_activity_id", activityId);

      await updateEventStatus(eventId, true, "Activity deleted");
      console.log(`Deleted activity ${activityId}`);
    }
  } catch (error: any) {
    console.error("Error processing activity event:", error);
    await updateEventStatus(eventId, false, error.message);
  }
}

/**
 * Sync Strava activity to event activities
 */
async function syncToEventActivities(
  stravaActivityId: string,
  userId: string,
  activity: any
) {
  try {
    // Get all active events that the user is participating in
    const activityDate = new Date(activity.start_date_local)
      .toISOString()
      .split("T")[0];

    const { data: participations } = await supabase
      .from("event_participants")
      .select("event_id, events!inner(*)")
      .eq("user_id", userId)
      .lte("events.start_date", activityDate)
      .gte("events.end_date", activityDate);

    if (!participations || participations.length === 0) {
      console.log("No active events found for this activity date");
      return;
    }

    // For each event, create/update activity record
    for (const participation of participations) {
      const eventId = participation.event_id;

      // Check if activity already exists for this event and date
      const { data: existingActivity } = await supabase
        .from("activities")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .eq("activity_date", activityDate)
        .single();

      const distanceKm = activity.distance / 1000;
      const paceMinPerKm =
        activity.moving_time > 0
          ? activity.moving_time / 60 / distanceKm
          : null;

      // Prepare route data from polyline
      const routeData = activity.map?.summary_polyline
        ? {
            polyline: activity.map.summary_polyline,
          }
        : null;

      if (existingActivity) {
        // Update existing activity
        await supabase
          .from("activities")
          .update({
            distance_km: distanceKm,
            duration_seconds: activity.moving_time,
            pace_min_per_km: paceMinPerKm,
            route_data: routeData,
            description: activity.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingActivity.id);

        console.log(`Updated activity for event ${eventId}`);
      } else {
        // Create new activity
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
            points_earned: 0, // Will be calculated by rules engine
          },
        ]);

        console.log(`Created new activity for event ${eventId}`);
      }
    }

    // Mark as synced
    await supabase
      .from("strava_activities")
      .update({ synced_to_activity_id: stravaActivityId })
      .eq("id", stravaActivityId);
  } catch (error) {
    console.error("Error syncing to event activities:", error);
  }
}

/**
 * Update webhook event processing status
 */
async function updateEventStatus(
  eventId: string,
  processed: boolean,
  message?: string
) {
  await supabase
    .from("strava_webhook_events")
    .update({
      processed,
      processed_at: new Date().toISOString(),
      error_message: message,
    })
    .eq("id", eventId);
}
