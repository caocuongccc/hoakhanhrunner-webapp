// lib/sync-helpers.ts
// Safe date extraction helpers

/**
 * Safely extract date part (YYYY-MM-DD) from any date string format
 * Handles:
 * - "2026-02-11" → "2026-02-11"
 * - "2026-02-11T00:00:00" → "2026-02-11"
 * - "2026-02-11T00:00:00+07:00" → "2026-02-11"
 * - null/undefined → ""
 */
export function extractDateOnly(dateString: string | null | undefined): string {
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
export function isDateInRange(
  date: string,
  startDate: string,
  endDate: string,
): boolean {
  const d = extractDateOnly(date);
  const start = extractDateOnly(startDate);
  const end = extractDateOnly(endDate);

  if (!d || !start || !end) return false;

  return d >= start && d <= end;
}

// ==========================================
// IMPROVED SYNC FUNCTION
// ==========================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function syncToEventActivitiesV2(userId: string, activity: any) {
  try {
    // Safe date extraction
    const activityDate = extractDateOnly(activity.start_date_local);

    if (!activityDate) {
      console.error("❌ Invalid activity date:", activity.start_date_local);
      return { success: false, error: "Invalid activity date" };
    }

    console.log(`🔍 Syncing activity ${activity.id} (${activityDate})`);

    // Get user's event participations
    const { data: participations, error: partError } = await supabase
      .from("event_participants")
      .select("event_id, events!inner(*)")
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
    const results: any[] = [];

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
            points_earned: distanceKm,
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
              points_earned: distanceKm,
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
  } catch (error: any) {
    console.error("❌ Fatal error in syncToEventActivities:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function updateParticipantStats(eventId: string, userId: string) {
  try {
    const { data: activities } = await supabase
      .from("activities")
      .select("distance_km, points_earned")
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (!activities || activities.length === 0) {
      return;
    }

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
  } catch (error) {
    console.error("Error updating participant stats:", error);
  }
}
