// lib/strava-best-efforts.ts
import { supabase } from "./supabase";

export type BestEffort = {
  name: string; // "400m", "1/2 mile", "1k", "1 mile", "2 mile", "5k", "10k", "15k", "10 mile", "20k", "Half-Marathon", "Marathon"
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  achievements: any[];
};

export type StravaDetailedActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  best_efforts: BestEffort[];
  [key: string]: any;
};

/**
 * Fetch detailed activity with best efforts from Strava
 */
export async function fetchActivityWithBestEfforts(
  activityId: number,
  accessToken: string
): Promise<StravaDetailedActivity> {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch activity with best efforts");
  }

  return response.json();
}

/**
 * Save best efforts to database
 */
export async function saveBestEfforts(
  userId: string,
  activityId: number,
  bestEfforts: BestEffort[]
): Promise<void> {
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
 * Get user's personal records (fastest time for each distance)
 */
export async function getUserPRs(userId: string): Promise<{
  [key: string]: {
    time: number;
    date: string;
    activityId: number;
  };
}> {
  const { data, error } = await supabase
    .from("best_efforts")
    .select("*")
    .eq("user_id", userId)
    .order("moving_time", { ascending: true });

  if (error || !data) {
    return {};
  }

  // Group by effort name and get fastest for each
  const prs: { [key: string]: any } = {};

  data.forEach((effort) => {
    const key = effort.effort_name;
    if (!prs[key] || effort.moving_time < prs[key].time) {
      prs[key] = {
        time: effort.moving_time,
        date: effort.start_date_local,
        activityId: effort.strava_activity_id,
      };
    }
  });

  return prs;
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
export function formatEffortTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get effort name mapping for display
 */
export function getEffortDisplayName(effortName: string): string {
  const mapping: { [key: string]: string } = {
    "400m": "400m",
    "1/2 mile": "1/2 dặm",
    "1k": "1km",
    "1 mile": "1 dặm",
    "2 mile": "2 dặm",
    "5k": "5km",
    "10k": "10km",
    "15k": "15km",
    "10 mile": "10 dặm",
    "20k": "20km",
    "Half-Marathon": "Half Marathon",
    Marathon: "Marathon",
  };

  return mapping[effortName] || effortName;
}

/**
 * Check if activity falls within event date range
 */
export function isActivityInEventRange(
  activityDate: string,
  eventStartDate: string,
  eventEndDate: string
): boolean {
  const activity = new Date(activityDate);
  const start = new Date(eventStartDate);
  const end = new Date(eventEndDate);

  return activity >= start && activity <= end;
}

/**
 * Sync activity with best efforts for events
 */
export async function syncActivityWithBestEfforts(
  userId: string,
  activity: StravaDetailedActivity
): Promise<void> {
  try {
    // Save best efforts first
    if (activity.best_efforts && activity.best_efforts.length > 0) {
      await saveBestEfforts(userId, activity.id, activity.best_efforts);
    }

    // Get all active events that the user is participating in
    const activityDateTime = new Date(activity.start_date_local);
    const activityDate = activityDateTime.toISOString().split("T")[0];

    const { data: participations } = await supabase
      .from("event_participants")
      .select("event_id, events!inner(*)")
      .eq("user_id", userId);

    if (!participations || participations.length === 0) {
      console.log("No events found for user");
      return;
    }

    // For each event, check if activity falls within event date range
    for (const participation of participations) {
      const event = participation.events;

      // Check if activity is within event date range (including time)
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);

      if (activityDateTime >= eventStart && activityDateTime <= eventEnd) {
        console.log(`Activity falls within event ${event.id} range`);

        const distanceKm = activity.distance / 1000;
        const paceMinPerKm =
          activity.moving_time > 0
            ? activity.moving_time / 60 / distanceKm
            : null;

        const routeData = activity.map?.summary_polyline
          ? { polyline: activity.map.summary_polyline }
          : null;

        // Check if activity already exists for this event and date
        const { data: existingActivity } = await supabase
          .from("activities")
          .select("id")
          .eq("user_id", userId)
          .eq("event_id", event.id)
          .eq("activity_date", activityDate)
          .single();

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
              points_earned: distanceKm, // Will be recalculated by rules engine
              best_efforts: activity.best_efforts,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingActivity.id);

          console.log(`Updated activity for event ${event.id}`);
        } else {
          // Create new activity
          await supabase.from("activities").insert([
            {
              user_id: userId,
              event_id: event.id,
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

          console.log(`Created new activity for event ${event.id}`);
        }

        // Update participant stats
        await updateParticipantStats(event.id, userId);
      }
    }
  } catch (error) {
    console.error("Error syncing activity with best efforts:", error);
    throw error;
  }
}

/**
 * Update participant stats after syncing activity
 */
async function updateParticipantStats(
  eventId: string,
  userId: string
): Promise<void> {
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

    console.log(`Updated participant stats: ${totalKm}km, ${totalPoints} pts`);
  } catch (error) {
    console.error("Error updating participant stats:", error);
  }
}
