// lib/strava-best-efforts.ts - Updated to use DB function
import { supabase } from "./supabase";

export type BestEffort = {
  name: string;
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
 * Get user's personal records (fastest time for each distance)
 * Uses the database function for better performance
 */
export async function getUserPRs(userId: string): Promise<{
  [key: string]: {
    time: number;
    date: string;
    activityId: number;
  };
}> {
  try {
    // Use the database function to get PRs
    const { data, error } = await supabase.rpc("get_user_prs", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error getting user PRs:", error);
      return {};
    }

    if (!data || data.length === 0) {
      return {};
    }

    // Convert to object format
    const prs: { [key: string]: any } = {};
    data.forEach((record: any) => {
      prs[record.effort_name] = {
        time: record.best_time,
        date: record.activity_date,
        activityId: record.strava_activity_id,
      };
    });

    return prs;
  } catch (error) {
    console.error("Error in getUserPRs:", error);
    return {};
  }
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
 * Get fastest activity for a specific distance
 * Useful for generating certificates
 */
export async function getFastestActivityForDistance(
  userId: string,
  effortName: string
): Promise<{
  time: number;
  pace: number;
  date: string;
  activityId: number;
  activityName: string;
} | null> {
  try {
    // Get the PR for this distance
    const { data: prData } = await supabase.rpc("get_user_prs", {
      p_user_id: userId,
    });

    if (!prData || prData.length === 0) return null;

    const pr = prData.find((r: any) => r.effort_name === effortName);
    if (!pr) return null;

    // Get the activity details
    const { data: activity } = await supabase
      .from("strava_activities")
      .select("name, distance, average_speed")
      .eq("strava_activity_id", pr.strava_activity_id)
      .single();

    if (!activity) return null;

    // Calculate pace (min/km)
    const pace =
      activity.average_speed > 0 ? 1000 / (activity.average_speed * 60) : 0;

    return {
      time: pr.best_time,
      pace,
      date: pr.activity_date,
      activityId: pr.strava_activity_id,
      activityName: activity.name,
    };
  } catch (error) {
    console.error("Error getting fastest activity:", error);
    return null;
  }
}
