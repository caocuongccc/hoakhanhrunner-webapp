// lib/points-calculator.ts
// Calculate points with "ONLY APPLY HIGHEST BONUS" rule

import { Activity } from "./supabase";
import {
  validateTetBonus,
  validateLuckyDistance,
  TetBonusConfig,
  LuckyDistanceConfig,
} from "./rule-validators-extended";

export interface BonusResult {
  bonusType: string;
  bonusName: string;
  multiplier: number;
  message: string;
  priority: number; // Higher = more important
}

export interface PointsCalculation {
  basePoints: number;
  appliedBonus: BonusResult | null;
  finalPoints: number;
  allAvailableBonuses: BonusResult[];
  rejectedBonuses: BonusResult[];
}

/**
 * Calculate points with ONLY HIGHEST BONUS rule
 * Một tracklog chỉ được apply 1 phần thưởng gần nhất (cao nhất) với nó
 */
export function calculateActivityPoints(
  activity: Activity,
  eventRules: Array<{
    rule_type: string;
    config: any;
  }>,
): PointsCalculation {
  const basePoints = activity.distance_km || 0;
  const availableBonuses: BonusResult[] = [];

  // Priority system:
  // 1. Tết Bonus (x3) - Highest priority
  // 2. Lucky Distance (x2)
  // 3. Multiplier Day (x2)

  // Check Tết Bonus (Priority 3 - Highest)
  const tetRule = eventRules.find((r) => r.rule_type === "tet_bonus");
  if (tetRule) {
    const result = validateTetBonus(activity, tetRule.config as TetBonusConfig);
    if (result.isValid) {
      availableBonuses.push({
        bonusType: "tet_bonus",
        bonusName: "Lì xì Khai Xuân",
        multiplier: result.multiplier,
        message: result.message,
        priority: 3,
      });
    }
  }

  // Check Lucky Distance (Priority 2)
  const luckyRule = eventRules.find((r) => r.rule_type === "lucky_distance");
  if (luckyRule) {
    const result = validateLuckyDistance(
      activity,
      luckyRule.config as LuckyDistanceConfig,
    );
    if (result.isValid) {
      availableBonuses.push({
        bonusType: "lucky_distance",
        bonusName: "Số đẹp cầu may",
        multiplier: result.multiplier,
        message: result.message,
        priority: 2,
      });
    }
  }

  // Check Multiplier Day (Priority 1 - Lowest)
  const multiplierRule = eventRules.find(
    (r) => r.rule_type === "multiplier_day",
  );
  if (multiplierRule) {
    const activityDate = new Date(activity.start_date);
    const dayOfWeek = activityDate.getDay();

    if (dayOfWeek === multiplierRule.config.multiplier_day) {
      const days = [
        "Chủ nhật",
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7",
      ];
      availableBonuses.push({
        bonusType: "multiplier_day",
        bonusName: "Ngày nhân đôi",
        multiplier: multiplierRule.config.multiplier,
        message: `${days[dayOfWeek]} × ${multiplierRule.config.multiplier} điểm`,
        priority: 1,
      });
    }
  }

  // CRITICAL: Only apply the HIGHEST priority bonus
  let appliedBonus: BonusResult | null = null;
  let rejectedBonuses: BonusResult[] = [];

  if (availableBonuses.length > 0) {
    availableBonuses.sort((a, b) => b.priority - a.priority);
    appliedBonus = availableBonuses[0];
    rejectedBonuses = availableBonuses.slice(1);
  }

  const finalPoints = appliedBonus
    ? basePoints * appliedBonus.multiplier
    : basePoints;

  return {
    basePoints,
    appliedBonus,
    finalPoints,
    allAvailableBonuses: availableBonuses,
    rejectedBonuses,
  };
}

export function formatPointsDisplay(calculation: PointsCalculation): string {
  if (!calculation.appliedBonus) {
    return `${calculation.finalPoints.toFixed(1)} điểm`;
  }
  return `${calculation.finalPoints.toFixed(1)} điểm (${calculation.basePoints.toFixed(1)} × ${calculation.appliedBonus.multiplier})`;
}

export function getBonusEmoji(bonusType: string): string {
  switch (bonusType) {
    case "tet_bonus":
      return "🧧";
    case "lucky_distance":
      return "🎯";
    case "multiplier_day":
      return "✖️";
    default:
      return "🎁";
  }
}

export const PointsCalculator = {
  calculateActivityPoints,
  formatPointsDisplay,
  getBonusEmoji,
};
