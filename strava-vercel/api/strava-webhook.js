// api/strava-webhook.js - FIXED DATE COMPARISON
import { createClient } from "@supabase/supabase-js";
import {
  calculateActivityPoints,
  validateBlockingRules,
} from "./points-calculator.js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// ==========================================
// SAFE DATE EXTRACTION HELPERS
// ==========================================

/**
 * Safely extract date part (YYYY-MM-DD) from any date string format
 */
function extractDateOnly(dateString) {
  if (!dateString) return "";

  const dateStr = String(dateString);

  // If contains "T", split by it
  if (dateStr.includes("T")) {
    return dateStr.split("T")[0];
  }

  // If no "T", assume it's already YYYY-MM-DD or extract first 10 chars
  // This handles edge cases like "2026-02-11 00:00:00" (space instead of T)
  if (dateStr.includes(" ")) {
    return dateStr.split(" ")[0];
  }

  // Take first 10 characters (YYYY-MM-DD)
  return dateStr.substring(0, 10);
}

/**
 * Check if date is in range (inclusive)
 */
function isDateInRange(date, startDate, endDate) {
  const d = extractDateOnly(date);
  const start = extractDateOnly(startDate);
  const end = extractDateOnly(endDate);

  if (!d || !start || !end) return false;

  return d >= start && d <= end;
}

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

async function getValidAccessToken(userId) {
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

async function fetchStravaActivity(activityId, accessToken) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) throw new Error("Failed to fetch activity");
  return response.json();
}

async function saveBestEfforts(userId, activityId, bestEfforts) {
  if (!bestEfforts || bestEfforts.length === 0) return;

  for (const effort of bestEfforts) {
    const { data: existingPR } = await supabase
      .from("best_efforts")
      .select("*")
      .eq("user_id", userId)
      .eq("effort_name", effort.name)
      .order("elapsed_time", { ascending: true })
      .limit(1)
      .single();

    if (!existingPR || effort.elapsed_time < existingPR.elapsed_time) {
      if (existingPR) {
        await supabase
          .from("best_efforts")
          .delete()
          .eq("user_id", userId)
          .eq("effort_name", effort.name);
      }

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
      0,
    );
    const totalPoints = activities.reduce(
      (sum, a) => sum + (a.points_earned || 0),
      0,
    );

    const { error } = await supabase
      .from("event_participants")
      .update({
        total_km: totalKm,
        total_points: totalPoints,
      })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating participant stats:", error);
      return;
    }

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
      `📊 Updated stats: ${totalKm.toFixed(2)}km, ${totalPoints.toFixed(2)} pts`,
    );
  } catch (error) {
    console.error("Error updating stats:", error);
  }
}

async function updateTeamStats(teamId) {
  try {
    const { data: members } = await supabase
      .from("event_participants")
      .select("total_points")
      .eq("team_id", teamId);

    if (!members || members.length === 0) return;

    const teamTotalPoints = members.reduce(
      (sum, m) => sum + (m.total_points || 0),
      0,
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

// 🔥 FIXED: Proper date comparison without timezone issues
async function syncToEventActivities(userId, activity) {
  try {
    // Extract just the date part (YYYY-MM-DD) for comparison
    const activityDate = activity.start_date_local.split("T")[0];

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

    for (const participation of participations) {
      const event = participation.events;

      // Extract date parts for comparison (YYYY-MM-DD)
      const eventStartDate = event.start_date.split("T")[0];
      const eventEndDate = event.end_date.split("T")[0];

      // Compare dates as strings (YYYY-MM-DD format) - no timezone issues
      console.log(
        `🔍 Checking event "${event.name}": ${eventStartDate} to ${eventEndDate}, activity date: ${activityDate}`,
      );

      if (activityDate >= eventStartDate && activityDate <= eventEndDate) {
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

          console.log(
            `✅ Updated activity in event ${eventId} (${event.name})`,
          );
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

          console.log(
            `✅ Created activity in event ${eventId} (${event.name})`,
          );
        }

        // Update participant stats
        await updateParticipantStats(eventId, userId);
        console.log(`✅ Synced to event ${eventId} (${event.name})`);
      } else {
        console.log(
          `⏭️ Activity ${activityDate} outside event range ${eventStartDate} to ${eventEndDate}`,
        );
      }
    }
  } catch (error) {
    console.error("Error syncing:", error);
  }
}

async function syncToEventActivitiesV2(userId, activity) {
  try {
    // Safe date extraction
    const activityDate = extractDateOnly(activity.start_date_local);

    if (!activityDate) {
      console.error("❌ Invalid activity date:", activity.start_date_local);
      return { success: false, error: "Invalid activity date" };
    }

    console.log(`🔍 Syncing activity ${activity.id} (${activityDate})`);

    // 🎯 STEP 1: Get user's event participations WITH RULES
    const { data: participations, error: partError } = await supabase
      .from("event_participants")
      .select(
        `
        event_id, 
        events!inner(
          id, 
          name, 
          start_date, 
          end_date,
          event_rules(
            rules(*)
          )
        )
      `,
      )
      .eq("user_id", userId);
    if (partError) {
      console.error("❌ Error fetching participations:", partError);
      return { success: false, error: partError.message };
    }

    if (!participations || participations.length === 0) {
      console.log("⚠️ User not in any events");
      return { success: false, reason: "no_events" };
    }

    let syncedCount = 0;
    const results = [];

    for (const participation of participations) {
      const event = participation.events;
      const eventId = participation.event_id;

      // Safe date extraction for events
      const eventStartDate = extractDateOnly(event.start_date);
      const eventEndDate = extractDateOnly(event.end_date);

      console.log(
        `   Event "${event.name}": ${eventStartDate} to ${eventEndDate}`,
      );

      // Check if activity is in event date range
      if (!isDateInRange(activityDate, eventStartDate, eventEndDate)) {
        console.log(`   ⏭️ Skip - outside range`);
        results.push({
          eventId,
          eventName: event.name,
          action: "skipped",
          reason: "outside_range",
        });
        continue;
      }

      console.log(`   ✅ Match - syncing...`);

      // 🎯 STEP 2: Get event rules
      const eventRules = (event.event_rules || []).map((er) => ({
        rule_type: er.rules.rule_type,
        config: er.rules.config,
      }));

      console.log(`   📋 Found ${eventRules.length} rules for event`);

      // 🎯 STEP 3: Validate blocking rules (min_distance, pace_range)
      const blockingValidation = validateBlockingRules(activity, eventRules);

      if (!blockingValidation.isValid) {
        console.log(`   ❌ Failed blocking rules:`);
        blockingValidation.failures.forEach((f) => {
          console.log(`      - ${f.message}`);
        });

        results.push({
          eventId,
          eventName: event.name,
          action: "blocked",
          reason: "Failed blocking rules",
          failures: blockingValidation.failures.map((f) => f.message),
        });
        continue; // Skip this event
      }

      // 🎯 STEP 4: Calculate points with bonuses
      const pointsCalc = calculateActivityPoints(activity, eventRules);

      console.log(`   📊 Points calculation:`);
      console.log(`      Base points: ${pointsCalc.basePoints.toFixed(2)}`);
      if (pointsCalc.appliedBonus) {
        console.log(
          `      ✨ Applied bonus: ${pointsCalc.appliedBonus.bonusName} (x${pointsCalc.appliedBonus.multiplier})`,
        );
        console.log(`      💬 ${pointsCalc.appliedBonus.message}`);
      }
      if (pointsCalc.rejectedBonuses.length > 0) {
        console.log(`      ⏭️ Rejected bonuses (lower priority):`);
        pointsCalc.rejectedBonuses.forEach((b) => {
          console.log(`         - ${b.bonusName} (x${b.multiplier})`);
        });
      }
      console.log(`      Final points: ${pointsCalc.finalPoints.toFixed(2)}`);

      // Prepare activity data
      const distanceKm = activity.distance / 1000;
      const paceMinPerKm =
        activity.moving_time > 0 && distanceKm > 0
          ? activity.moving_time / 60 / distanceKm
          : null;

      const routeData = activity.map?.summary_polyline
        ? { polyline: activity.map.summary_polyline }
        : null;

      // Check if already exists
      const { data: existing, error: existError } = await supabase
        .from("activities")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .eq("activity_date", activityDate)
        .single();

      if (existError && existError.code !== "PGRST116") {
        console.error(`   ❌ Error checking existing:`, existError);
        results.push({
          eventId,
          eventName: event.name,
          action: "failed",
          error: existError.message,
        });
        continue;
      }

      let action = "";

      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from("activities")
          .update({
            distance_km: distanceKm,
            duration_seconds: activity.moving_time,
            pace_min_per_km: paceMinPerKm,
            route_data: routeData,
            description: activity.name,
            points_earned: pointsCalc.finalPoints, // ✅ NEW
            //base_points: pointsCalc.basePoints, // ✅ NEW
            points_multiplier: pointsCalc.appliedBonus?.multiplier || 1, // ✅ NEW
            bonus_type: pointsCalc.appliedBonus?.bonusType || null, // ✅ NEW
            bonus_message: pointsCalc.appliedBonus?.message || null, // ✅ NEW
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError);
          results.push({
            eventId,
            eventName: event.name,
            action: "failed",
            error: updateError.message,
          });
          continue;
        }

        action = "updated";
        console.log(`   ✅ Updated`);
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("activities")
          .insert([
            {
              user_id: userId,
              event_id: eventId,
              activity_date: activityDate,
              distance_km: distanceKm,
              duration_seconds: activity.moving_time,
              pace_min_per_km: paceMinPerKm,
              route_data: routeData,
              description: activity.name,
              points_earned: pointsCalc.finalPoints, // ✅ NEW
              //base_points: pointsCalc.basePoints, // ✅ NEW
              points_multiplier: pointsCalc.appliedBonus?.multiplier || 1, // ✅ NEW
              bonus_type: pointsCalc.appliedBonus?.bonusType || null, // ✅ NEW
              bonus_message: pointsCalc.appliedBonus?.message || null, // ✅ NEW
            },
          ]);

        if (insertError) {
          console.error(`   ❌ Insert failed:`, insertError);
          results.push({
            eventId,
            eventName: event.name,
            action: "failed",
            error: insertError.message,
          });
          continue;
        }

        action = "created";
        console.log(`   ✅ Created`);
      }

      // Update participant stats
      await updateParticipantStats(eventId, userId);

      syncedCount++;
      results.push({
        eventId,
        eventName: event.name,
        action,
        distanceKm: distanceKm.toFixed(2),
      });
    }

    console.log(`✅ Synced ${syncedCount} event(s)`);

    return {
      success: true,
      synced: syncedCount,
      results,
    };
  } catch (error) {
    console.error("❌ Fatal error in syncToEventActivities:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
export default async function handler(req, res) {
  console.log("🔥 Webhook:", req.method);

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
            `✅ Processing: ${activity.name} - Best Efforts: ${activity.best_efforts?.length || 0}`,
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
            { onConflict: "strava_activity_id" },
          );

          // await syncToEventActivities(user.id, activity);
          await syncToEventActivitiesV2(user.id, activity);

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
}
