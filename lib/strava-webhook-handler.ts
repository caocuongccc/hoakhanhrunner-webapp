// strava-webhook-handler.ts
// Handler for Strava webhooks with validation and bonus calculation

import { createClient } from "@supabase/supabase-js";
import {
  validateMinDistance,
  validateTetBonus,
  validateLuckyDistance,
  MinDistanceConfig,
  TetBonusConfig,
  LuckyDistanceConfig,
} from "@/lib/rule-validators-extended";
import { calculateActivityPoints } from "@/lib/points-calculator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for webhook
);

interface StravaActivity {
  id: number;
  user_id: string;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number;
  type: string;
  start_date: string;
  start_date_local: string;
  // ... other fields
}

/**
 * Main webhook handler
 */
export async function handleStravaWebhook(stravaActivity: StravaActivity) {
  console.log("Processing Strava activity:", stravaActivity.id);

  // STEP 1: Type validation (Run/Walk only)
  if (!["Run", "Walk"].includes(stravaActivity.type)) {
    console.log(`Activity rejected: Type ${stravaActivity.type} not allowed`);
    return {
      success: false,
      reason: "invalid_type",
      message: "Chỉ tính chạy bộ (Run) hoặc đi bộ (Walk)",
    };
  }

  // Convert to our format
  const distanceKm = stravaActivity.distance / 1000;
  const movingTimeMin = stravaActivity.moving_time / 60;
  const paceMinPerKm = movingTimeMin / distanceKm;

  const activity = {
    user_id: stravaActivity.user_id,
    distance_km: distanceKm,
    pace_min_per_km: paceMinPerKm,
    start_date: stravaActivity.start_date_local,
    // ... other fields
  };

  // Find user's active events
  const { data: participations } = await supabase
    .from("event_participants")
    .select("event_id, events(*)")
    .eq("user_id", stravaActivity.user_id);

  if (!participations || participations.length === 0) {
    console.log("User not participating in any events");
    return { success: false, reason: "no_events" };
  }

  // Process for each active event
  for (const participation of participations) {
    const event = participation.events;
    const eventId = participation.event_id;

    // Check if activity is within event dates
    const activityDate = new Date(stravaActivity.start_date_local);
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    if (activityDate < startDate || activityDate > endDate) {
      console.log(`Activity outside event dates for ${event.name}`);
      continue;
    }

    // Get event rules
    const { data: eventRules } = await supabase
      .from("event_rules")
      .select("rules(*)")
      .eq("event_id", eventId);

    const rules = (eventRules || []).map((er) => ({
      rule_type: er.rules.rule_type,
      config: er.rules.config,
    }));

    // STEP 2: Validate minimum distance
    const minDistRule = rules.find((r) => r.rule_type === "min_distance");
    if (minDistRule) {
      const result = validateMinDistance(
        activity as any,
        minDistRule.config as MinDistanceConfig,
      );
      if (!result.isValid) {
        console.log(`Activity rejected for ${event.name}:`, result.message);
        continue; // Skip this event
      }
    }

    // STEP 3: Validate pace range
    const paceRule = rules.find((r) => r.rule_type === "pace_range");
    if (paceRule) {
      const minPace = paceRule.config.min_pace || 4.0;
      const maxPace = paceRule.config.max_pace || 12.0;

      if (paceMinPerKm < minPace || paceMinPerKm > maxPace) {
        console.log(
          `Activity rejected for ${event.name}: Pace ${paceMinPerKm.toFixed(2)} not in range ${minPace}-${maxPace}`,
        );
        continue;
      }
    }

    // STEP 4: Calculate points with ONLY HIGHEST BONUS
    const pointsCalc = calculateActivityPoints(activity as any, rules);

    console.log(`Points for ${event.name}:`, {
      base: pointsCalc.basePoints,
      bonus: pointsCalc.appliedBonus?.bonusName,
      multiplier: pointsCalc.appliedBonus?.multiplier,
      final: pointsCalc.finalPoints,
    });

    // STEP 5: Save activity
    const { data: savedActivity, error: saveError } = await supabase
      .from("activities")
      .insert({
        user_id: stravaActivity.user_id,
        event_id: eventId,
        strava_activity_id: stravaActivity.id,
        start_date: stravaActivity.start_date_local,
        name: stravaActivity.name,
        type: stravaActivity.type,
        distance: stravaActivity.distance,
        distance_km: distanceKm,
        moving_time: stravaActivity.moving_time,
        elapsed_time: stravaActivity.elapsed_time,
        pace_min_per_km: paceMinPerKm,
        points_earned: pointsCalc.finalPoints,
        bonus_applied: pointsCalc.appliedBonus?.bonusType || null,
        bonus_message: pointsCalc.appliedBonus?.message || null,
        bonus_multiplier: pointsCalc.appliedBonus?.multiplier || 1.0,
        rejected_bonuses: JSON.stringify(
          pointsCalc.rejectedBonuses.map((b) => b.bonusName),
        ),
      })
      .select()
      .single();

    if (saveError) {
      console.error(`Error saving activity for ${event.name}:`, saveError);
      continue;
    }

    // STEP 6: Update participant stats
    await updateParticipantStats(eventId, stravaActivity.user_id);

    // STEP 7: Update streak
    await supabase.rpc("calculate_streak", {
      p_event_id: eventId,
      p_user_id: stravaActivity.user_id,
    });

    // STEP 8: Send notification about bonus (if any)
    if (pointsCalc.appliedBonus) {
      await sendBonusNotification(
        stravaActivity.user_id,
        eventId,
        pointsCalc.appliedBonus.message,
        pointsCalc.finalPoints,
      );

      console.log("✨ Bonus applied:", pointsCalc.appliedBonus.message);
    }

    // STEP 9: Log rejected bonuses
    if (pointsCalc.rejectedBonuses.length > 0) {
      console.log("Bonuses not applied (lower priority):");
      pointsCalc.rejectedBonuses.forEach((b) => {
        console.log(`- ${b.bonusName} (x${b.multiplier}): ${b.message}`);
      });
    }

    console.log(
      `✅ Activity saved for ${event.name} with ${pointsCalc.finalPoints.toFixed(1)} points`,
    );
  }

  return {
    success: true,
    message: "Activity processed",
  };
}

/**
 * Update participant stats
 */
async function updateParticipantStats(eventId: string, userId: string) {
  const { data: activities } = await supabase
    .from("activities")
    .select("distance_km, points_earned")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  const totalKm = (activities || []).reduce(
    (sum, a) => sum + (a.distance_km || 0),
    0,
  );
  const totalPoints = (activities || []).reduce(
    (sum, a) => sum + (a.points_earned || 0),
    0,
  );
  const activityCount = activities?.length || 0;

  await supabase
    .from("event_participants")
    .update({
      total_km: totalKm,
      total_points: totalPoints,
      activity_count: activityCount,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("user_id", userId);

  console.log(
    `Updated stats: ${totalKm.toFixed(1)}km, ${totalPoints.toFixed(1)} points`,
  );
}

/**
 * Send notification about bonus (optional - implement based on your notification system)
 */
async function sendBonusNotification(
  userId: string,
  eventId: string,
  message: string,
  points: number,
) {
  // TODO: Implement notification system
  // Could be: email, push notification, in-app notification, etc.
  console.log(
    `Notification to ${userId}: ${message} - ${points.toFixed(1)} points`,
  );
}

/**
 * Example usage in API route:
 *
 * export async function POST(req: Request) {
 *   const body = await req.json();
 *   const result = await handleStravaWebhook(body);
 *   return Response.json(result);
 * }
 */
