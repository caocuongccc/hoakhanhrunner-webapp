// lib/rule-validators-extended.ts
// Extended validators for new HKR Tết rules

import { Activity } from "./supabase";

// =====================================================
// RULE 2: Minimum Distance
// =====================================================

export interface MinDistanceConfig {
  min_km: number;
  description?: string;
}

export function validateMinDistance(
  activity: Activity,
  config: MinDistanceConfig,
): { isValid: boolean; message: string } {
  const distanceKm = activity.distance_km || 0;
  const minKm = config.min_km || 2.0;

  const isValid = distanceKm >= minKm;

  return {
    isValid,
    message: isValid
      ? `✅ Đạt quãng đường tối thiểu (${distanceKm.toFixed(2)}km >= ${minKm}km)`
      : `❌ Chưa đủ quãng đường (${distanceKm.toFixed(2)}km < ${minKm}km)`,
  };
}

// =====================================================
// RULE 4: Tết Bonus (Lì xì Khai Xuân)
// =====================================================

export interface TetBonusConfig {
  tet_date: string; // "2026-01-29"
  min_km: number;
  multiplier: number;
  time_range: {
    start: string; // "05:00"
    end: string; // "12:00"
  };
  description?: string;
}

export function validateTetBonus(
  activity: Activity,
  config: TetBonusConfig,
): {
  isValid: boolean;
  multiplier: number;
  message: string;
} {
  const activityDate = new Date(activity.start_date);
  const tetDate = new Date(config.tet_date);

  // Check if same date
  const isSameDate =
    activityDate.getFullYear() === tetDate.getFullYear() &&
    activityDate.getMonth() === tetDate.getMonth() &&
    activityDate.getDate() === tetDate.getDate();

  if (!isSameDate) {
    return {
      isValid: false,
      multiplier: 1,
      message: "Không phải ngày Tết",
    };
  }

  // Check time range (morning)
  const activityHour = activityDate.getHours();
  const activityMinute = activityDate.getMinutes();
  const activityTime = activityHour * 60 + activityMinute; // in minutes

  const [startHour, startMin] = config.time_range.start.split(":").map(Number);
  const [endHour, endMin] = config.time_range.end.split(":").map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  const isInTimeRange = activityTime >= startTime && activityTime <= endTime;

  if (!isInTimeRange) {
    return {
      isValid: false,
      multiplier: 1,
      message: `❌ Không trong giờ sáng (${config.time_range.start} - ${config.time_range.end})`,
    };
  }

  // Check minimum distance
  const distanceKm = activity.distance_km || 0;
  const isEnoughDistance = distanceKm >= config.min_km;

  if (!isEnoughDistance) {
    return {
      isValid: false,
      multiplier: 1,
      message: `❌ Chưa đủ ${config.min_km}km cho lì xì (${distanceKm.toFixed(2)}km)`,
    };
  }

  return {
    isValid: true,
    multiplier: config.multiplier,
    message: `🧧 LÌ XÌ KHAI XUÂN! Chạy sáng Mùng 1 Tết × ${config.multiplier} điểm`,
  };
}

// =====================================================
// RULE 5: Lucky Distance (Số đẹp cầu may)
// =====================================================

export interface LuckyDistanceConfig {
  lucky_distances: Array<{
    distance: number;
    name: string;
    multiplier: number;
  }>;
  tolerance: number; // ±0.1km
  description?: string;
}

export function validateLuckyDistance(
  activity: Activity,
  config: LuckyDistanceConfig,
): {
  isValid: boolean;
  multiplier: number;
  message: string;
  matchedLucky?: {
    distance: number;
    name: string;
    multiplier: number;
  };
} {
  const distanceKm = activity.distance_km || 0;
  const tolerance = config.tolerance || 0.1;

  // Check each lucky distance
  for (const lucky of config.lucky_distances) {
    const diff = Math.abs(distanceKm - lucky.distance);

    if (diff <= tolerance) {
      return {
        isValid: true,
        multiplier: lucky.multiplier,
        message: `🎯 SỐ ĐẸP! ${lucky.name} (${distanceKm.toFixed(2)}km ≈ ${lucky.distance}km) × ${lucky.multiplier} điểm`,
        matchedLucky: lucky,
      };
    }
  }

  return {
    isValid: false,
    multiplier: 1,
    message: "Không trúng số đẹp",
  };
}

// =====================================================
// RULE 7: Penalty Calculation
// =====================================================

export interface PenaltyConfig {
  penalty_per_day: number;
  currency: string;
  fund_name: string;
  exclude_days?: number[]; // Day of week to exclude (0=Sunday, 6=Saturday)
  description?: string;
}

export function calculatePenalty(
  totalDays: number,
  activeDays: number,
  config: PenaltyConfig,
): {
  missedDays: number;
  penaltyAmount: number;
  currency: string;
  message: string;
} {
  const missedDays = totalDays - activeDays;
  const penaltyAmount = missedDays * config.penalty_per_day;

  return {
    missedDays,
    penaltyAmount,
    currency: config.currency,
    message:
      missedDays > 0
        ? `💰 Phạt ${missedDays} ngày nghỉ = ${penaltyAmount.toLocaleString()} ${config.currency} (Quỹ: ${config.fund_name})`
        : `✅ Không bị phạt! Chạy đủ ${activeDays}/${totalDays} ngày`,
  };
}

// =====================================================
// STREAK CALCULATION (for Siêng Năng leaderboard)
// =====================================================

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  streakDates: string[];
}

export function calculateStreak(activities: Activity[]): StreakResult {
  if (!activities || activities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      streakDates: [],
    };
  }

  // Get unique dates sorted
  const dates = Array.from(
    new Set(
      activities.map((a) => {
        const date = new Date(a.start_date);
        return date.toISOString().split("T")[0];
      }),
    ),
  ).sort();

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);

    // Calculate difference in days
    const diffDays = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      // Consecutive day
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      // Streak broken
      tempStreak = 1;
    }
  }

  currentStreak = tempStreak;

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: dates.length,
    streakDates: dates,
  };
}

// =====================================================
// POINTS MULTIPLIER CALCULATOR
// =====================================================

export interface MultiplierResult {
  basePoints: number;
  multipliers: Array<{
    ruleName: string;
    multiplier: number;
    message: string;
  }>;
  finalPoints: number;
  totalMultiplier: number;
}

export function calculatePointsWithMultipliers(
  activity: Activity,
  rules: Array<{
    rule_type: string;
    config: any;
  }>,
): MultiplierResult {
  const basePoints = activity.distance_km || 0; // 1km = 1 point
  const multipliers: MultiplierResult["multipliers"] = [];
  let totalMultiplier = 1;

  // Check each rule
  for (const rule of rules) {
    switch (rule.rule_type) {
      case "tet_bonus": {
        const result = validateTetBonus(activity, rule.config);
        if (result.isValid) {
          multipliers.push({
            ruleName: "Lì xì Khai Xuân",
            multiplier: result.multiplier,
            message: result.message,
          });
          totalMultiplier *= result.multiplier;
        }
        break;
      }

      case "lucky_distance": {
        const result = validateLuckyDistance(activity, rule.config);
        if (result.isValid) {
          multipliers.push({
            ruleName: "Số đẹp cầu may",
            multiplier: result.multiplier,
            message: result.message,
          });
          totalMultiplier *= result.multiplier;
        }
        break;
      }

      case "multiplier_day": {
        // Existing multiplier day logic
        const activityDate = new Date(activity.start_date);
        const dayOfWeek = activityDate.getDay();
        if (dayOfWeek === rule.config.multiplier_day) {
          multipliers.push({
            ruleName: "Ngày nhân đôi",
            multiplier: rule.config.multiplier,
            message: `Chủ nhật × ${rule.config.multiplier}`,
          });
          totalMultiplier *= rule.config.multiplier;
        }
        break;
      }
    }
  }

  return {
    basePoints,
    multipliers,
    finalPoints: basePoints * totalMultiplier,
    totalMultiplier,
  };
}

// =====================================================
// HELPER: Format penalty display
// =====================================================

export function formatPenalty(
  amount: number,
  currency: string = "VND",
): string {
  return `${amount.toLocaleString("vi-VN")} ${currency}`;
}

// =====================================================
// HELPER: Get streak emoji
// =====================================================

export function getStreakEmoji(streak: number): string {
  if (streak >= 30) return "🔥🔥🔥"; // 30+ days
  if (streak >= 14) return "🔥🔥"; // 2+ weeks
  if (streak >= 7) return "🔥"; // 1+ week
  if (streak >= 3) return "⚡"; // 3+ days
  return "✅"; // 1-2 days
}

// =====================================================
// EXPORTS
// =====================================================

export const ExtendedRuleValidators = {
  validateMinDistance,
  validateTetBonus,
  validateLuckyDistance,
  calculatePenalty,
  calculateStreak,
  calculatePointsWithMultipliers,
  formatPenalty,
  getStreakEmoji,
};
