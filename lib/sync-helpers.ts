// lib/sync-helpers.ts - FIXED: Normalize activity before calculating points
import { createClient } from "@supabase/supabase-js";
import { calculateActivityPoints, type BonusResult } from "./points-calculator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ==========================================
// NORMALIZE STRAVA ACTIVITY
// ==========================================
/**
 * Convert Strava API activity format to our internal format
 * for points calculation
 */
function normalizeStravaActivity(stravaActivity: any): {
  distance_km: number;
  pace_min_per_km: number | null;
  start_date: string;
  [key: string]: any;
} {
  const distanceKm = stravaActivity.distance / 1000; // meters → km
  const paceMinPerKm =
    stravaActivity.moving_time > 0 && distanceKm > 0
      ? stravaActivity.moving_time / 60 / distanceKm
      : null;

  return {
    ...stravaActivity,
    distance_km: distanceKm,
    pace_min_per_km: paceMinPerKm,
    start_date: stravaActivity.start_date_local,
  };
}

// ==========================================
// VALIDATE BLOCKING RULES
// ==========================================
function validateBlockingRules(
  activity: any,
  eventRules: Array<{ rule_type: string; config: any }>,
): {
  isValid: boolean;
  failures: Array<{ rule: string; message: string }>;
} {
  // ✅ Use normalized distance_km
  const distanceKm = activity.distance_km;
  const failures = [];

  // Check min_distance
  const minDistanceRule = eventRules.find(
    (r) => r.rule_type === "min_distance",
  );
  if (minDistanceRule) {
    const minKm = minDistanceRule.config.min_km || 2.0;
    if (distanceKm < minKm) {
      failures.push({
        rule: "min_distance",
        message: `❌ Chưa đủ quãng đường tối thiểu (${distanceKm.toFixed(2)}km < ${minKm}km)`,
      });
    }
  }

  // Check pace_range
  const paceRule = eventRules.find((r) => r.rule_type === "pace_range");
  if (paceRule && activity.pace_min_per_km) {
    const paceMinPerKm = activity.pace_min_per_km;
    const minPace = paceRule.config.min_pace || 0;
    const maxPace = paceRule.config.max_pace || Infinity;

    if (paceMinPerKm < minPace || paceMinPerKm > maxPace) {
      failures.push({
        rule: "pace_range",
        message: `❌ Pace không hợp lệ (${paceMinPerKm.toFixed(2)} min/km ngoài khoảng ${minPace}-${maxPace})`,
      });
    }
  }

  return {
    isValid: failures.length === 0,
    failures,
  };
}

// ==========================================
// SAFE DATE EXTRACTION
// ==========================================
export function extractDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const dateStr = String(dateString);
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  if (dateStr.includes(" ")) return dateStr.split(" ")[0];
  return dateStr.substring(0, 10);
}

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
// 🔥 SYNC WITH RULES VALIDATION - FIXED
// ==========================================
export async function syncToEventActivitiesV2(
  userId: string,
  stravaActivity: any,
) {
  try {
    const activityDate = extractDateOnly(stravaActivity.start_date_local);

    if (!activityDate) {
      console.error(
        "❌ Invalid activity date:",
        stravaActivity.start_date_local,
      );
      return { success: false, error: "Invalid activity date" };
    }

    console.log(`🔍 Syncing activity ${stravaActivity.id} (${activityDate})`);

    // ✅ CRITICAL: Normalize activity ONCE at the start
    const normalizedActivity = normalizeStravaActivity(stravaActivity);
    console.log(
      `   📊 Normalized: ${normalizedActivity.distance_km.toFixed(2)}km, pace: ${normalizedActivity.pace_min_per_km?.toFixed(2) || "N/A"} min/km`,
    );

    // Get participations WITH RULES
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
    const results: any[] = [];

    for (const participation of participations) {
      const event = participation.events;
      const eventId = participation.event_id;

      const eventStartDate = extractDateOnly(event.start_date);
      const eventEndDate = extractDateOnly(event.end_date);

      console.log(
        `   Event "${event.name}": ${eventStartDate} to ${eventEndDate}`,
      );

      // Check date range
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

      console.log(`   ✅ Match - validating rules...`);

      // Get event rules
      const eventRules = (event.event_rules || []).map((er: any) => ({
        rule_type: er.rules.rule_type,
        config: er.rules.config,
      }));

      console.log(`   📋 Found ${eventRules.length} rules for event`);

      // ✅ Validate blocking rules (với normalized activity)
      const blockingValidation = validateBlockingRules(
        normalizedActivity,
        eventRules,
      );

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

      // ✅ Calculate points with bonuses (với normalized activity)
      const pointsCalc = calculateActivityPoints(
        normalizedActivity,
        eventRules,
      );

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
      console.log(
        `      ✅ Final points: ${pointsCalc.finalPoints.toFixed(2)}`,
      );

      // Prepare activity data
      const distanceKm = normalizedActivity.distance_km;
      const paceMinPerKm = normalizedActivity.pace_min_per_km;

      const routeData = stravaActivity.map?.summary_polyline
        ? { polyline: stravaActivity.map.summary_polyline }
        : null;

      // Check existing
      const { data: existing, error: existError } = await supabase
        .from("activities")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        // .eq("activity_date", activityDate)
        .eq("strava_activity_id", stravaActivity.id) // ✅ Unique ID
        .maybeSingle();

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
        // UPDATE with bonuses
        const { error: updateError } = await supabase
          .from("activities")
          .update({
            distance_km: distanceKm,
            duration_seconds: stravaActivity.moving_time,
            pace_min_per_km: paceMinPerKm,
            route_data: routeData,
            description: stravaActivity.name,
            points_earned: pointsCalc.finalPoints.toFixed(2), // ✅ With bonuses
            bonus_multiplier: pointsCalc.appliedBonus?.multiplier || 1,
            bonus_message: pointsCalc.appliedBonus?.message || null,
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
        console.log(
          `   ✅ Updated with points: ${pointsCalc.finalPoints.toFixed(2)}`,
        );
      } else {
        // INSERT with bonuses
        const { error: insertError } = await supabase
          .from("activities")
          .insert([
            {
              user_id: userId,
              event_id: eventId,
              activity_date: activityDate,
              strava_activity_id: stravaActivity.id,
              distance_km: distanceKm,
              duration_seconds: stravaActivity.moving_time,
              pace_min_per_km: paceMinPerKm,
              route_data: routeData,
              description: stravaActivity.name,
              points_earned: pointsCalc.finalPoints.toFixed(2), // ✅ With bonuses
              bonus_multiplier: pointsCalc.appliedBonus?.multiplier || 1,
              bonus_message: pointsCalc.appliedBonus?.message || null,
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
        console.log(
          `   ✅ Created with points: ${pointsCalc.finalPoints.toFixed(2)}`,
        );
      }

      // Update participant stats
      await updateParticipantStats(eventId, userId);

      syncedCount++;
      results.push({
        eventId,
        eventName: event.name,
        action,
        distanceKm: distanceKm.toFixed(2),
        bonus: pointsCalc.appliedBonus?.bonusName || null,
        points: pointsCalc.finalPoints.toFixed(2),
      });
    }

    console.log(`✅ Synced ${syncedCount} event(s) with rules validation`);

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
        activity_count: activities.length,
      })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    console.log(
      `   📊 Updated stats: ${totalKm.toFixed(2)}km, ${totalPoints.toFixed(2)} pts`,
    );
  } catch (error) {
    console.error("Error updating participant stats:", error);
  }
}
