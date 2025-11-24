import { Activity, Rule } from "./supabase";
import { supabase } from "./supabase";

export type RuleResult = {
  passed: boolean;
  message: string;
  points?: number;
};

export type RuleConfig = {
  // For daily_increase_individual
  increase_km?: number;

  // For daily_increase_team
  team_increase_km?: number;

  // For min_participants
  min_participants?: number;

  // For pace_range
  min_pace?: number; // minutes per km
  max_pace?: number;

  // For multiplier_day
  multiplier_day?: number; // 0 = Sunday, 1 = Monday, etc.
  multiplier?: number; // 2x, 3x, etc.

  // For time_range
  start_time?: string; // HH:mm format
  end_time?: string;
};

/**
 * Validate activity against all rules for an event
 */
export async function validateActivity(
  activity: Activity,
  eventRules: Array<{ rule: Rule; rule_config?: RuleConfig }>
): Promise<{
  totalPoints: number;
  logs: Array<{ ruleId: string; result: RuleResult }>;
}> {
  let totalPoints = activity.distance_km; // Base points = distance
  const logs: Array<{ ruleId: string; result: RuleResult }> = [];

  for (const { rule, rule_config } of eventRules) {
    const config = rule_config || rule.config;
    let result: RuleResult;

    switch (rule.rule_type) {
      case "daily_increase_individual":
        result = await checkDailyIncreaseIndividual(activity, config);
        break;
      case "daily_increase_team":
        result = await checkDailyIncreaseTeam(activity, config);
        break;
      case "min_participants":
        result = await checkMinParticipants(activity, config);
        break;
      case "pace_range":
        result = checkPaceRange(activity, config);
        break;
      case "multiplier_day":
        result = checkMultiplierDay(activity, config);
        break;
      case "time_range":
        result = checkTimeRange(activity, config);
        break;
      default:
        result = { passed: true, message: "Unknown rule type" };
    }

    logs.push({ ruleId: rule.id, result });

    // If rule failed and it's a blocking rule, set points to 0
    if (!result.passed && isBlockingRule(rule.rule_type)) {
      totalPoints = 0;
      break;
    }

    // Apply multipliers if rule passed
    if (result.passed && result.points) {
      totalPoints = result.points;
    }
  }

  return { totalPoints, logs };
}

/**
 * Check if individual needs to increase distance from previous day
 */
async function checkDailyIncreaseIndividual(
  activity: Activity,
  config: RuleConfig
): Promise<RuleResult> {
  const increaseKm = config.increase_km || 0;

  // Get previous valid activity
  const { data: prevActivities } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", activity.user_id)
    .eq("event_id", activity.event_id)
    .lt("activity_date", activity.activity_date)
    .gt("points_earned", 0) // Only count activities that earned points
    .order("activity_date", { ascending: false })
    .limit(1);

  if (!prevActivities || prevActivities.length === 0) {
    // First activity, automatically passes
    return {
      passed: true,
      message: "First activity - automatically passed",
    };
  }

  const prevActivity = prevActivities[0];
  const increase = activity.distance_km - prevActivity.distance_km;

  if (increase >= increaseKm) {
    return {
      passed: true,
      message: `Increased by ${increase.toFixed(2)}km (required: ${increaseKm}km)`,
    };
  }

  return {
    passed: false,
    message: `Failed to increase by ${increaseKm}km. Only increased by ${increase.toFixed(2)}km`,
  };
}

/**
 * Check if team needs to increase total distance from previous day
 */
async function checkDailyIncreaseTeam(
  activity: Activity,
  config: RuleConfig
): Promise<RuleResult> {
  const teamIncreaseKm = config.team_increase_km || 0;

  // Get user's team
  const { data: participant } = await supabase
    .from("event_participants")
    .select("team_id")
    .eq("user_id", activity.user_id)
    .eq("event_id", activity.event_id)
    .single();

  if (!participant?.team_id) {
    return { passed: false, message: "User not in a team" };
  }

  // Get team's total for today
  const { data: todayActivities } = await supabase
    .from("activities")
    .select("distance_km, user_id")
    .eq("event_id", activity.event_id)
    .eq("activity_date", activity.activity_date)
    .in("user_id", [
      // Get all team members
      supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", participant.team_id),
    ]);

  const todayTotal = (todayActivities || []).reduce(
    (sum, a) => sum + a.distance_km,
    0
  );

  // Get previous day's valid total
  const { data: prevActivities } = await supabase
    .from("activities")
    .select("distance_km, activity_date")
    .eq("event_id", activity.event_id)
    .lt("activity_date", activity.activity_date)
    .gt("points_earned", 0)
    .order("activity_date", { ascending: false });

  if (!prevActivities || prevActivities.length === 0) {
    return { passed: true, message: "First day - automatically passed" };
  }

  // Get most recent valid day
  const prevDate = prevActivities[0].activity_date;
  const prevTotal = prevActivities
    .filter((a) => a.activity_date === prevDate)
    .reduce((sum, a) => sum + a.distance_km, 0);

  const increase = todayTotal - prevTotal;

  if (increase >= teamIncreaseKm) {
    return {
      passed: true,
      message: `Team increased by ${increase.toFixed(2)}km (required: ${teamIncreaseKm}km)`,
    };
  }

  return {
    passed: false,
    message: `Team failed to increase by ${teamIncreaseKm}km. Only increased by ${increase.toFixed(2)}km`,
  };
}

/**
 * Check if minimum number of participants ran today
 */
async function checkMinParticipants(
  activity: Activity,
  config: RuleConfig
): Promise<RuleResult> {
  const minParticipants = config.min_participants || 1;

  // Get user's team
  const { data: participant } = await supabase
    .from("event_participants")
    .select("team_id")
    .eq("user_id", activity.user_id)
    .eq("event_id", activity.event_id)
    .single();

  if (!participant?.team_id) {
    return { passed: false, message: "User not in a team" };
  }

  // Count unique participants today
  const { data: todayActivities } = await supabase
    .from("activities")
    .select("user_id")
    .eq("event_id", activity.event_id)
    .eq("activity_date", activity.activity_date);

  const uniqueParticipants = new Set(
    todayActivities?.map((a) => a.user_id) || []
  ).size;

  if (uniqueParticipants >= minParticipants) {
    return {
      passed: true,
      message: `${uniqueParticipants} participants ran today (required: ${minParticipants})`,
    };
  }

  return {
    passed: false,
    message: `Only ${uniqueParticipants} participants ran today (required: ${minParticipants})`,
  };
}

/**
 * Check if pace is within allowed range
 */
function checkPaceRange(activity: Activity, config: RuleConfig): RuleResult {
  if (!activity.pace_min_per_km) {
    return { passed: false, message: "No pace data available" };
  }

  const minPace = config.min_pace || 0;
  const maxPace = config.max_pace || Infinity;

  if (
    activity.pace_min_per_km >= minPace &&
    activity.pace_min_per_km <= maxPace
  ) {
    return {
      passed: true,
      message: `Pace ${activity.pace_min_per_km.toFixed(2)} min/km is within range (${minPace}-${maxPace})`,
    };
  }

  return {
    passed: false,
    message: `Pace ${activity.pace_min_per_km.toFixed(2)} min/km is outside allowed range (${minPace}-${maxPace})`,
  };
}

/**
 * Check if today is a multiplier day and apply multiplier
 */
function checkMultiplierDay(
  activity: Activity,
  config: RuleConfig
): RuleResult {
  const multiplierDay = config.multiplier_day; // 0 = Sunday
  const multiplier = config.multiplier || 1;

  const activityDate = new Date(activity.activity_date);
  const dayOfWeek = activityDate.getDay();

  if (dayOfWeek === multiplierDay) {
    const newPoints = activity.distance_km * multiplier;
    return {
      passed: true,
      message: `Multiplier day! ${multiplier}x applied`,
      points: newPoints,
    };
  }

  return {
    passed: true,
    message: "Not a multiplier day - normal points",
  };
}

/**
 * Check if activity time is within allowed range
 */
function checkTimeRange(activity: Activity, config: RuleConfig): RuleResult {
  if (!config.start_time || !config.end_time) {
    return { passed: true, message: "No time restriction" };
  }

  const activityTime = new Date(activity.created_at);
  const hours = activityTime.getHours();
  const minutes = activityTime.getMinutes();
  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

  if (timeString >= config.start_time && timeString <= config.end_time) {
    return {
      passed: true,
      message: `Activity time ${timeString} is within allowed range (${config.start_time}-${config.end_time})`,
    };
  }

  return {
    passed: false,
    message: `Activity time ${timeString} is outside allowed range (${config.start_time}-${config.end_time})`,
  };
}

/**
 * Determine if a rule type should block points entirely when failed
 */
function isBlockingRule(ruleType: string): boolean {
  const blockingRules = [
    "daily_increase_individual",
    "daily_increase_team",
    "min_participants",
    "pace_range",
    "time_range",
  ];
  return blockingRules.includes(ruleType);
}
