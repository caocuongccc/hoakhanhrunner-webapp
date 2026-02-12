// strava-vercel/api/points-calculator.js
// Calculate points with "ONLY APPLY HIGHEST BONUS" rule
// Ported from TypeScript version

/**
 * Validate Tết Bonus Rule
 */
function validateTetBonus(activity, config) {
  const activityDate = new Date(activity.start_date_local);
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
  const activityTime = activityHour * 60 + activityMinute;

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
  const distanceKm = activity.distance / 1000;
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

/**
 * Validate Lucky Distance Rule
 */
function validateLuckyDistance(activity, config) {
  const distanceKm = activity.distance / 1000;
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

/**
 * Calculate points with ONLY HIGHEST BONUS rule
 * Priority system:
 * 1. Tết Bonus (x3) - Highest priority (3)
 * 2. Lucky Distance (x2) - Priority 2
 * 3. Multiplier Day (x2) - Lowest priority (1)
 */
function calculateActivityPoints(activity, eventRules) {
  const basePoints = activity.distance / 1000 || 0;
  const availableBonuses = [];

  // Check Tết Bonus (Priority 3 - Highest)
  const tetRule = eventRules.find((r) => r.rule_type === "tet_bonus");
  if (tetRule) {
    const result = validateTetBonus(activity, tetRule.config);
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
    const result = validateLuckyDistance(activity, luckyRule.config);
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
    const activityDate = new Date(activity.start_date_local);
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
  let appliedBonus = null;
  let rejectedBonuses = [];

  if (availableBonuses.length > 0) {
    // Sort by priority (descending)
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

/**
 * Validate blocking rules (pace, distance, etc.)
 */
function validateBlockingRules(activity, eventRules) {
  const distanceKm = activity.distance / 1000;
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
  if (paceRule && activity.moving_time > 0) {
    const paceMinPerKm = activity.moving_time / 60 / distanceKm;
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

export { calculateActivityPoints, validateBlockingRules };
