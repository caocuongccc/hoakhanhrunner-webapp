// lib/rule-validators.ts - UPDATED with grace days and custom percentage
import { Activity, Rule } from "./supabase";

export interface MinActiveDaysConfig {
  min_percentage: number; // 50, 66.67, 75, 90, 100
  grace_days?: number; // Optional: Allow X missed days
  description_example?: string;
}

export interface ValidationResult {
  isValid: boolean;
  activeDays: number;
  totalDays: number;
  requiredDays: number;
  graceDays: number;
  completionPercentage: number;
  missedDays: number;
}

/**
 * Validate "Minimum Active Days" Rule with Grace Days support
 *
 * @param activities - All activities of user in this event
 * @param eventStartDate - Event start date
 * @param eventEndDate - Event end date
 * @param ruleConfig - Rule configuration
 * @returns ValidationResult
 */
export function validateMinActiveDays(
  activities: Activity[],
  eventStartDate: Date,
  eventEndDate: Date,
  ruleConfig: MinActiveDaysConfig,
): ValidationResult {
  // Calculate total event days (inclusive)

  const totalDays =
    Math.ceil(
      (eventEndDate.getTime() - eventStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  // Get unique days with activities
  const uniqueDays = new Set(
    activities.map((activity) => {
      const activityDate = new Date(activity.activity_date);
      return activityDate.toISOString().split("T")[0];
    }),
  );

  const activeDays = uniqueDays.size;

  // Get config values
  const minPercentage = ruleConfig.min_percentage || 66.67;
  const graceDays = ruleConfig.grace_days || 0;

  // Calculate required days
  // Formula: ceil(total_days * percentage / 100) - grace_days
  const baseRequiredDays = Math.ceil((totalDays * minPercentage) / 100);
  const requiredDays = Math.max(baseRequiredDays - graceDays, 1); // At least 1 day

  // Calculate completion percentage
  const completionPercentage = (activeDays / totalDays) * 100;

  // Calculate missed days
  const missedDays = totalDays - activeDays;

  // Validation
  const isValid = activeDays >= requiredDays;

  return {
    isValid,
    activeDays,
    totalDays,
    requiredDays,
    graceDays,
    completionPercentage: parseFloat(completionPercentage.toFixed(2)),
    missedDays,
  };
}

/**
 * Check if an event has ended
 */
export function isEventEnded(eventEndDate: Date): boolean {
  return new Date() > eventEndDate;
}

/**
 * Get validation message for min_active_days rule
 */
export function getMinActiveDaysMessage(result: ValidationResult): string {
  const {
    isValid,
    activeDays,
    requiredDays,
    totalDays,
    graceDays,
    missedDays,
  } = result;

  if (isValid) {
    const graceInfo = graceDays > 0 ? ` (cho phép nghỉ ${graceDays} ngày)` : "";
    return `✅ Hoàn thành: ${activeDays}/${requiredDays} ngày có tracklog (tổng ${totalDays} ngày)${graceInfo}`;
  } else {
    const remaining = requiredDays - activeDays;
    const graceInfo =
      graceDays > 0
        ? ` (đã dùng ${Math.min(missedDays, graceDays)}/${graceDays} ngày nghỉ)`
        : "";
    return `❌ Chưa đủ: ${activeDays}/${requiredDays} ngày - Còn thiếu ${remaining} ngày${graceInfo}`;
  }
}

/**
 * Determine which badge to award based on completion percentage
 */
export function determineBadge(completionPercentage: number): {
  badgeName: string;
  badgeIcon: string;
  badgeType: string;
} | null {
  if (completionPercentage >= 100) {
    return {
      badgeName: "Siêu nhân",
      badgeIcon: "⭐",
      badgeType: "perfect_completion",
    };
  } else if (completionPercentage >= 90) {
    return {
      badgeName: "Người sắt",
      badgeIcon: "💪",
      badgeType: "excellent_completion",
    };
  } else if (completionPercentage >= 66.67) {
    return {
      badgeName: "Chiến binh kiên trì",
      badgeIcon: "🏆",
      badgeType: "good_completion",
    };
  } else if (completionPercentage >= 50) {
    return {
      badgeName: "Người mới bắt đầu",
      badgeIcon: "🎯",
      badgeType: "basic_completion",
    };
  }
  return null;
}

/**
 * Calculate leaderboard ranking for event
 */
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  activeDays: number;
  totalDays: number;
  requiredDays: number;
  completionPercentage: number;
  isCompleted: boolean;
  rank: number;
  badges: string[];
}

export function calculateLeaderboardRankings(
  entries: Omit<LeaderboardEntry, "rank">[],
): LeaderboardEntry[] {
  // Sort by completion percentage (desc), then by active days (desc)
  const sorted = [...entries].sort((a, b) => {
    if (b.completionPercentage !== a.completionPercentage) {
      return b.completionPercentage - a.completionPercentage;
    }
    return b.activeDays - a.activeDays;
  });

  // Assign ranks
  let currentRank = 1;
  return sorted.map((entry, index) => {
    // Handle ties
    if (index > 0) {
      const prev = sorted[index - 1];
      if (
        prev.completionPercentage === entry.completionPercentage &&
        prev.activeDays === entry.activeDays
      ) {
        // Same rank as previous
      } else {
        currentRank = index + 1;
      }
    }

    return {
      ...entry,
      rank: currentRank,
    };
  });
}

/**
 * Get percentage options for admin rule configuration
 */
export const PERCENTAGE_OPTIONS = [
  { value: 50, label: "50% - Dễ (5/10 ngày)" },
  { value: 60, label: "60% - Trung bình thấp (6/10 ngày)" },
  { value: 66.67, label: "66.67% - Tiêu chuẩn (7/10 ngày)" },
  { value: 75, label: "75% - Khó (8/10 ngày)" },
  { value: 80, label: "80% - Rất khó (8/10 ngày)" },
  { value: 90, label: "90% - Cực khó (9/10 ngày)" },
  { value: 100, label: "100% - Hoàn hảo (10/10 ngày)" },
] as const;

/**
 * Get grace days options
 */
export const GRACE_DAYS_OPTIONS = [
  { value: 0, label: "Không cho phép nghỉ" },
  { value: 1, label: "1 ngày nghỉ" },
  { value: 2, label: "2 ngày nghỉ" },
  { value: 3, label: "3 ngày nghỉ" },
  { value: 5, label: "5 ngày nghỉ" },
] as const;

/**
 * Helper to format rule display text
 */
export function formatRuleDisplay(config: MinActiveDaysConfig): string {
  const percentage = config.min_percentage.toFixed(0);
  const gracePart =
    config.grace_days && config.grace_days > 0
      ? `, cho phép nghỉ ${config.grace_days} ngày`
      : "";

  return `Cần ${percentage}% ngày có tracklog${gracePart}`;
}

// Export all helpers
export const RuleValidators = {
  validateMinActiveDays,
  isEventEnded,
  getMinActiveDaysMessage,
  determineBadge,
  calculateLeaderboardRankings,
  formatRuleDisplay,
  PERCENTAGE_OPTIONS,
  GRACE_DAYS_OPTIONS,
};
