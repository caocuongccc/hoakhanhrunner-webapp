// components/BonusBadge.tsx
// Display bonus badge on activity cards

import { getBonusEmoji } from "@/lib/points-calculator";

interface BonusBadgeProps {
  bonusType: string;
  bonusMessage: string;
  multiplier: number;
  rejectedBonuses?: string[];
}

export default function BonusBadge({
  bonusType,
  bonusMessage,
  multiplier,
  rejectedBonuses,
}: BonusBadgeProps) {
  const emoji = getBonusEmoji(bonusType);

  const getBonusGradient = (type: string) => {
    switch (type) {
      case "tet_bonus":
        return "from-red-100 via-orange-100 to-yellow-100 border-red-300";
      case "lucky_distance":
        return "from-yellow-100 via-amber-100 to-orange-100 border-yellow-300";
      case "multiplier_day":
        return "from-blue-100 via-indigo-100 to-purple-100 border-blue-300";
      default:
        return "from-gray-100 to-gray-200 border-gray-300";
    }
  };

  const getBonusName = (type: string) => {
    switch (type) {
      case "tet_bonus":
        return "Lì xì Khai Xuân";
      case "lucky_distance":
        return "Số đẹp cầu may";
      case "multiplier_day":
        return "Ngày nhân đôi";
      default:
        return "Bonus";
    }
  };

  return (
    <div className="space-y-2">
      {/* Applied Bonus Badge */}
      <div
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r ${getBonusGradient(
          bonusType,
        )} border-2 shadow-sm`}
      >
        <span className="text-lg mr-1.5">{emoji}</span>
        <span className="text-gray-900">
          {getBonusName(bonusType)} ×{multiplier}
        </span>
      </div>

      {/* Message */}
      <div className="text-xs text-gray-700 italic">{bonusMessage}</div>

      {/* Rejected Bonuses (if any) */}
      {rejectedBonuses && rejectedBonuses.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            + {rejectedBonuses.length} bonus khác không áp dụng
          </summary>
          <ul className="mt-1 pl-4 list-disc space-y-0.5">
            {rejectedBonuses.map((bonus, index) => (
              <li key={index} className="text-gray-600">
                {bonus} (ưu tiên thấp hơn)
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Usage in UserTracklogModal or activity cards:
 *
 * {activity.bonus_applied && (
 *   <BonusBadge
 *     bonusType={activity.bonus_applied}
 *     bonusMessage={activity.bonus_message}
 *     multiplier={activity.bonus_multiplier}
 *     rejectedBonuses={activity.rejected_bonuses ? JSON.parse(activity.rejected_bonuses) : []}
 *   />
 * )}
 */
