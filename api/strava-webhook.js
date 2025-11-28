// api/strava-webhook.js - Updated with Best Efforts
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper: Refresh Strava token
async function refreshStravaToken(refreshToken) {
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

// Helper: Get valid access token
async function getValidAccessToken(userId) {
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

// Helper: Fetch activity with best efforts from Strava
async function fetchStravaActivity(activityId, accessToken) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch activity");
  return response.json();
}

// Helper: Save best efforts to database
async function saveBestEfforts(userId, activityId, bestEfforts) {
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
  } else {
    console.log(`Saved ${records.length} best efforts`);
  }
}

// Update participant stats
async function updateParticipantStats(eventId, userId) {
  try {
    const { data: activities } = await supabase
      .from("activities")
      .select("distance_km, points_earned")
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (!activities || activities.length === 0) return;

    const totalKm = activities.reduce(
      (sum, a) => sum + (a.distance_km || 0),
      0
    );
    const totalPoints = activities.reduce(
      (sum, a) => sum + (a.points_earned || 0),
      0
    );

    await supabase
      .from("event_participants")
      .update({
        total_km: totalKm,
        total_points: totalPoints,
      })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    const { data: participant } = await supabase
      .from("event_participants")
      .select("team_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    if (participant?.team_id) {
      await updateTeamStats(participant.team_id);
    }

    console.log(
      `📊 Updated stats: ${totalKm.toFixed(2)}km, ${totalPoints.toFixed(2)} pts`
    );
  } catch (error) {
    console.error("Error updating stats:", error);
  }
}

// Update team stats
async function updateTeamStats(teamId) {
  try {
    const { data: members } = await supabase
      .from("event_participants")
      .select("total_points")
      .eq("team_id", teamId);

    if (!members || members.length === 0) return;

    const teamTotalPoints = members.reduce(
      (sum, m) => sum + (m.total_points || 0),
      0
    );

    await supabase
      .from("teams")
      .update({ total_points: teamTotalPoints })
      .eq("id", teamId);

    console.log(`👥 Team updated: ${teamTotalPoints.toFixed(2)} points`);
  } catch (error) {
    console.error("Error updating team:", error);
  }
}

// Helper: Sync to event activities with time check
async function syncToEventActivities(userId, activity) {
  try {
    const activityDateTime = new Date(activity.start_date_local);
    const activityDate = activityDateTime.toISOString().split("T")[0];

    // Get all events user is participating in
    const { data: participations } = await supabase
      .from("event_participants")
      .select("event_id, events!inner(*)")
      .eq("user_id", userId);

    if (!participations || participations.length === 0) {
      console.log("No events found for user");
      return;
    }

    // Save best efforts first
    if (activity.best_efforts && activity.best_efforts.length > 0) {
      await saveBestEfforts(userId, activity.id, activity.best_efforts);
    }

    // For each event, check if activity falls within event date-time range
    for (const participation of participations) {
      const event = participation.events;
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);

      // Check if activity is within event time range
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
              best_efforts: activity.best_efforts,
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
              best_efforts: activity.best_efforts,
            },
          ]);
        }

        await updateParticipantStats(eventId, userId);
        console.log(`✅ Synced to event ${eventId} (${event.name})`);
      } else {
        console.log(
          `⏭️ Activity outside event ${event.name} time range: ${activityDateTime.toISOString()} not in [${eventStart.toISOString()}, ${eventEnd.toISOString()}]`
        );
      }
    }
  } catch (error) {
    console.error("Error syncing:", error);
  }
}

// Main webhook handler
module.exports = async function handler(req, res) {
  console.log("🔥 Webhook:", req.method);

  // GET - Verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
      mode === "subscribe" &&
      token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
    ) {
      console.log("✅ Verified");
      return res.status(200).json({ "hub.challenge": challenge });
    }

    return res.status(403).send("Forbidden");
  }

  // POST - Handle event
  if (req.method === "POST") {
    const event = req.body;
    console.log("🎯 Event:", event.object_type, event.aspect_type);

    const {
      subscription_id,
      aspect_type,
      object_type,
      object_id,
      owner_id,
      event_time,
    } = event;

    // Log event
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
          raw_payload: event,
        },
      ])
      .select()
      .single();

    if (object_type === "activity") {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("strava_id", owner_id)
          .single();

        if (!user) {
          console.log("⚠️ User not found");
          await supabase
            .from("strava_webhook_events")
            .update({
              processed: true,
              error_message: "User not found",
              processed_at: new Date().toISOString(),
            })
            .eq("id", loggedEvent.id);
          return res.status(200).send("OK");
        }

        if (aspect_type === "create" || aspect_type === "update") {
          const accessToken = await getValidAccessToken(user.id);
          const activity = await fetchStravaActivity(object_id, accessToken);

          if (activity.sport_type !== "Run" && activity.type !== "Run") {
            console.log("⏭️ Skip non-run");
            await supabase
              .from("strava_webhook_events")
              .update({
                processed: true,
                error_message: "Not running",
                processed_at: new Date().toISOString(),
              })
              .eq("id", loggedEvent.id);
            return res.status(200).send("OK");
          }

          console.log(
            `✅ Processing: ${activity.name} - Best Efforts: ${activity.best_efforts?.length || 0}`
          );

          await supabase.from("strava_activities").upsert(
            [
              {
                strava_activity_id: activity.id,
                user_id: user.id,
                athlete_id: owner_id,
                name: activity.name,
                distance: activity.distance,
                moving_time: activity.moving_time,
                elapsed_time: activity.elapsed_time,
                total_elevation_gain: activity.total_elevation_gain,
                sport_type: activity.sport_type,
                start_date: activity.start_date,
                start_date_local: activity.start_date_local,
                timezone: activity.timezone,
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
            { onConflict: "strava_activity_id" }
          );

          await syncToEventActivities(user.id, activity);

          await supabase
            .from("strava_webhook_events")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
            })
            .eq("id", loggedEvent.id);

          console.log("✅ Done");
        } else if (aspect_type === "delete") {
          await supabase
            .from("strava_activities")
            .delete()
            .eq("strava_activity_id", object_id);

          await supabase
            .from("best_efforts")
            .delete()
            .eq("strava_activity_id", object_id);

          await supabase
            .from("strava_webhook_events")
            .update({
              processed: true,
              error_message: "Deleted",
              processed_at: new Date().toISOString(),
            })
            .eq("id", loggedEvent.id);

          console.log("🗑️ Deleted activity and best efforts");
        }
      } catch (error) {
        console.error("❌ Error:", error);

        await supabase
          .from("strava_webhook_events")
          .update({
            processed: false,
            error_message: error.message,
            processed_at: new Date().toISOString(),
          })
          .eq("id", loggedEvent.id);
      }
    }

    return res.status(200).send("OK");
  }

  return res.status(405).send("Method Not Allowed");
};
