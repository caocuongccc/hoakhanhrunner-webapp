// lib/smart-sync.ts - Smart sync logic with history tracking
import { supabase } from "./supabase";

type SyncResult = {
  synced: number;
  skipped: number;
  errors: number;
  lastSyncDate: string;
};

/**
 * Get last sync date for user
 */
async function getLastSyncDate(userId: string): Promise<Date> {
  try {
    const { data, error } = await supabase
      .from("sync_history")
      .select("last_sync_date")
      .eq("user_id", userId)
      .order("last_sync_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Default: sync last 30 days on first login
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo;
    }

    return new Date(data.last_sync_date);
  } catch (error) {
    // First time sync - go back 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo;
  }
}

/**
 * Save sync history
 */
async function saveSyncHistory(
  userId: string,
  syncDate: Date,
  activitiesCount: number,
  success: boolean
) {
  try {
    await supabase.from("sync_history").insert({
      user_id: userId,
      last_sync_date: syncDate.toISOString(),
      activities_synced: activitiesCount,
      success,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving sync history:", error);
  }
}

/**
 * Smart sync: Only sync activities after last sync date
 */
export async function smartSync(
  userId: string,
  accessToken: string
): Promise<SyncResult> {
  try {
    console.log("🧠 Smart sync starting for user:", userId);

    // Get last sync date
    const lastSyncDate = await getLastSyncDate(userId);
    const afterTimestamp = Math.floor(lastSyncDate.getTime() / 1000);

    console.log(`📅 Syncing activities after: ${lastSyncDate.toISOString()}`);

    // Get user's strava_id
    const { data: user } = await supabase
      .from("users")
      .select("strava_id")
      .eq("id", userId)
      .single();

    if (!user) throw new Error("User not found");

    let page = 1;
    let hasMore = true;
    let totalSynced = 0;
    let totalSkipped = 0;

    // Fetch activities page by page
    while (hasMore && page <= 10) {
      // Max 10 pages (300 activities)
      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=30&page=${page}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch activities from Strava");
        break;
      }

      const activities = await response.json();

      if (!activities || activities.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`📦 Page ${page}: Found ${activities.length} activities`);

      // Process each activity
      for (const activity of activities) {
        // Only process running activities
        if (activity.sport_type !== "Run" && activity.type !== "Run") {
          totalSkipped++;
          continue;
        }

        // Fetch detailed activity for best efforts
        const detailResponse = await fetch(
          `https://www.strava.com/api/v3/activities/${activity.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!detailResponse.ok) {
          console.error(`Failed to fetch details for activity ${activity.id}`);
          continue;
        }

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
          { onConflict: "strava_activity_id" }
        );

        if (!error) {
          // Save best efforts (only keep fastest)
          if (
            detailedActivity.best_efforts &&
            detailedActivity.best_efforts.length > 0
          ) {
            await saveBestEffortsOptimized(
              userId,
              detailedActivity.id,
              detailedActivity.best_efforts
            );
          }

          // Sync to event activities
          await syncToEventActivities(userId, detailedActivity);
          totalSynced++;
        }
      }

      page++;
    }

    // Save sync history
    await saveSyncHistory(userId, new Date(), totalSynced, true);

    console.log(
      `✅ Smart sync completed: ${totalSynced} synced, ${totalSkipped} skipped`
    );

    return {
      synced: totalSynced,
      skipped: totalSkipped,
      errors: 0,
      lastSyncDate: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("❌ Smart sync error:", error);
    await saveSyncHistory(userId, new Date(), 0, false);
    throw error;
  }
}

/**
 * Save best efforts - only keep fastest time per distance
 */
async function saveBestEffortsOptimized(
  userId: string,
  activityId: number,
  bestEfforts: any[]
) {
  for (const effort of bestEfforts) {
    const { data: existingPR } = await supabase
      .from("best_efforts")
      .select("elapsed_time")
      .eq("user_id", userId)
      .eq("effort_name", effort.name)
      .order("elapsed_time", { ascending: true })
      .limit(1)
      .single();

    // Only save if faster or first time
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
    }
  }
}

/**
 * Sync activity to event activities if within event date range
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

        // Update participant stats
        await updateParticipantStats(eventId, userId);
      }
    }
  } catch (error) {
    console.error("Error syncing to events:", error);
  }
}

/**
 * Update participant stats
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
  } catch (error) {
    console.error("Error updating participant stats:", error);
  }
}
