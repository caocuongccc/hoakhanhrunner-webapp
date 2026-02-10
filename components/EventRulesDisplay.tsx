// components/EventRulesDisplay.tsx
// Beautiful, user-friendly display of event rules with visual examples

"use client";

import {
  Trophy,
  Target,
  Gift,
  AlertCircle,
  CheckCircle,
  Zap,
  TrendingUp,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Flame,
} from "lucide-react";
import { useState } from "react";

interface Rule {
  rule_type: string;
  name: string;
  description: string;
  config: any;
}

interface EventRulesDisplayProps {
  rules: Rule[];
}

export default function EventRulesDisplay({ rules }: EventRulesDisplayProps) {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    validation: true, // Start expanded
    bonuses: true, // Start expanded
    penalty: true, // Start expanded
    priority: true, // Start expanded
    other: false, // Start collapsed
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Categorize rules
  const validationRules = rules.filter((r) =>
    ["min_distance", "pace_range"].includes(r.rule_type),
  );

  const bonusRules = rules.filter((r) =>
    ["tet_bonus", "lucky_distance", "multiplier_day"].includes(r.rule_type),
  );

  const penaltyRules = rules.filter(
    (r) => r.rule_type === "penalty_missed_day",
  );

  const otherRules = rules.filter((r) => r.rule_type === "min_active_days");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          📜 Thể lệ sự kiện
        </h2>
        <p className="text-gray-600">
          Tìm hiểu các quy tắc áp dụng trong sự kiện để tối ưu điểm số của bạn
        </p>
      </div>

      {/* Validation Rules (Requirements) */}
      {validationRules.length > 0 && (
        <CollapsibleSection
          title="✅ Điều kiện hợp lệ"
          isExpanded={expandedSections.validation}
          onToggle={() => toggleSection("validation")}
          headerColor="from-blue-50 to-indigo-50 border-blue-200"
          icon={<CheckCircle className="h-6 w-6 text-white" />}
          iconBg="bg-blue-600"
        >
          <div className="space-y-4">
            {validationRules.map((rule, index) => (
              <ValidationRuleCard key={index} rule={rule} />
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
            <p className="text-sm text-blue-900 font-semibold">
              ⚠️ Tracklog không đạt điều kiện sẽ KHÔNG được tính điểm
            </p>
          </div>
        </CollapsibleSection>
      )}

      {/* Bonus Rules (Rewards) */}
      {bonusRules.length > 0 && (
        <CollapsibleSection
          title="🎁 Phần thưởng nhân điểm"
          isExpanded={expandedSections.bonuses}
          onToggle={() => toggleSection("bonuses")}
          headerColor="from-yellow-50 via-orange-50 to-red-50 border-yellow-300"
          icon={<Gift className="h-6 w-6 text-white" />}
          iconBg="bg-gradient-to-r from-yellow-500 to-orange-500"
        >
          <div className="space-y-4">
            {bonusRules.map((rule, index) => (
              <BonusRuleCard
                key={index}
                rule={rule}
                priority={bonusRules.length - index}
              />
            ))}
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-900 mb-1">
                  ⚡ QUY TẮC QUAN TRỌNG: CHỈ NHẬN 1 PHẦN THƯỞNG CAO NHẤT
                </p>
                <p className="text-sm text-orange-800">
                  Nếu 1 tracklog đủ điều kiện nhiều phần thưởng, bạn chỉ nhận
                  phần thưởng có mức nhân cao nhất. Các phần thưởng khác sẽ
                  không được cộng thêm.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Penalty Rules */}
      {penaltyRules.length > 0 && (
        <CollapsibleSection
          title="💰 Phạt tiền ngày nghỉ"
          isExpanded={expandedSections.penalty}
          onToggle={() => toggleSection("penalty")}
          headerColor="from-red-50 to-orange-50 border-red-200"
          icon={<AlertCircle className="h-6 w-6 text-white" />}
          iconBg="bg-red-600"
        >
          <div className="space-y-4">
            {penaltyRules.map((rule, index) => (
              <PenaltyRuleCard key={index} rule={rule} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Other Rules */}
      {otherRules.length > 0 && (
        <CollapsibleSection
          title="🎯 Yêu cầu hoàn thành"
          isExpanded={expandedSections.other}
          onToggle={() => toggleSection("other")}
          headerColor="from-purple-50 to-pink-50 border-purple-200"
          icon={<Target className="h-6 w-6 text-white" />}
          iconBg="bg-purple-600"
        >
          <div className="space-y-4">
            {otherRules.map((rule, index) => (
              <OtherRuleCard key={index} rule={rule} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Bonus Priority Explanation */}
      {bonusRules.length > 1 && (
        <CollapsibleSection
          title="🎯 Ưu tiên phần thưởng"
          isExpanded={expandedSections.priority}
          onToggle={() => toggleSection("priority")}
          headerColor="from-indigo-50 to-purple-50 border-indigo-300"
          icon={<Trophy className="h-6 w-6 text-white" />}
          iconBg="bg-indigo-600"
        >
          <BonusPriorityExplanation bonusRules={bonusRules} />
        </CollapsibleSection>
      )}
    </div>
  );
}
// Collapsible Section Component
function CollapsibleSection({
  title,
  children,
  isExpanded,
  onToggle,
  headerColor,
  icon,
  iconBg,
}: {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  headerColor: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${headerColor} rounded-2xl border-2 overflow-hidden`}
    >
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-6 w-6 text-gray-600" />
        ) : (
          <ChevronDown className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Content - Collapsible */}
      {isExpanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// Validation Rule Card
function ValidationRuleCard({ rule }: { rule: Rule }) {
  if (rule.rule_type === "min_distance") {
    const minKm = rule.config.min_km || 2.0;
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-2">
              Quãng đường tối thiểu: {minKm} km
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Mỗi lần chạy phải đạt tối thiểu {minKm}km mới được tính điểm
            </p>

            {/* Visual Example */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800">
                    HỢP LỆ
                  </span>
                </div>
                <div className="text-lg font-bold text-green-700">
                  {minKm + 0.5} km
                </div>
                <div className="text-xs text-green-600">✅ Được tính điểm</div>
              </div>

              <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">
                    KHÔNG HỢP LỆ
                  </span>
                </div>
                <div className="text-lg font-bold text-red-700">
                  {minKm - 0.3} km
                </div>
                <div className="text-xs text-red-600">❌ Bị loại</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rule.rule_type === "pace_range") {
    const minPace = rule.config.min_pace || 4.0;
    const maxPace = rule.config.max_pace || 12.0;

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-2">
              Pace hợp lệ: {minPace}:00 - {maxPace}:00 phút/km
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Tốc độ chạy phải nằm trong khoảng cho phép
            </p>

            {/* Pace Range Visualization */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">Quá nhanh</span>
                <span className="text-xs font-semibold text-green-600">
                  Hợp lệ
                </span>
                <span className="text-xs text-gray-600">Quá chậm</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                <div className="w-1/6 bg-red-300"></div>
                <div className="flex-1 bg-gradient-to-r from-green-400 to-green-500"></div>
                <div className="w-1/6 bg-red-300"></div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-red-600">&lt;{minPace}:00</span>
                <span className="text-xs font-bold text-green-700">
                  {minPace}:00 - {maxPace}:00
                </span>
                <span className="text-xs text-red-600">&gt;{maxPace}:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Bonus Rule Card
function BonusRuleCard({ rule, priority }: { rule: Rule; priority: number }) {
  if (rule.rule_type === "tet_bonus") {
    const config = rule.config;
    const multiplier = config.multiplier || 3;
    const tetDate = new Date(config.tet_date);

    return (
      <div className="bg-white rounded-xl p-4 shadow-md border-2 border-red-300 relative overflow-hidden">
        {/* Priority Badge */}
        <div className="absolute top-2 right-2 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full">
          Ưu tiên #{priority}
        </div>

        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg">
            <span className="text-3xl">🧧</span>
          </div>
          <div className="flex-1 pr-20">
            <h4 className="font-bold text-gray-900 mb-2 text-lg">
              Lì xì Khai Xuân ×{multiplier}
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Hoàn thành ít nhất {config.min_km}km vào sáng Mùng 1 Tết
            </p>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <Calendar className="h-4 w-4 text-red-600 mb-1" />
                <div className="text-xs text-gray-600">Ngày</div>
                <div className="font-bold text-red-700">
                  {tetDate.toLocaleDateString("vi-VN")}
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Clock className="h-4 w-4 text-orange-600 mb-1" />
                <div className="text-xs text-gray-600">Giờ</div>
                <div className="font-bold text-orange-700">
                  {config.time_range.start} - {config.time_range.end}
                </div>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <TrendingUp className="h-4 w-4 text-yellow-600 mb-1" />
                <div className="text-xs text-gray-600">Nhân</div>
                <div className="font-bold text-yellow-700">×{multiplier}</div>
              </div>
            </div>

            {/* Example */}
            <div className="mt-3 p-3 bg-gradient-to-r from-red-100 to-orange-100 rounded-lg border border-red-300">
              <div className="text-xs font-semibold text-red-900 mb-1">
                💡 Ví dụ:
              </div>
              <div className="text-sm text-red-800">
                Chạy 3km vào 8:00 sáng Mùng 1 Tết → Nhận{" "}
                <span className="font-bold">
                  3 × {multiplier} = {3 * multiplier} điểm
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rule.rule_type === "lucky_distance") {
    const config = rule.config;
    const luckyDistances = config.lucky_distances || [];

    return (
      <div className="bg-white rounded-xl p-4 shadow-md border-2 border-yellow-300 relative overflow-hidden">
        {/* Priority Badge */}
        <div className="absolute top-2 right-2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full">
          Ưu tiên #{priority}
        </div>

        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
            <span className="text-3xl">🎯</span>
          </div>
          <div className="flex-1 pr-20">
            <h4 className="font-bold text-gray-900 mb-2 text-lg">
              Số đẹp cầu may ×2
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Chạy đúng các quãng đường may mắn để nhận điểm nhân đôi
            </p>

            {/* Lucky Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {luckyDistances.map((lucky: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-300"
                >
                  <div className="text-2xl font-bold text-yellow-700 mb-1">
                    {lucky.distance} km
                  </div>
                  <div className="text-xs font-semibold text-yellow-600">
                    {lucky.name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    ±{config.tolerance}km
                  </div>
                </div>
              ))}
            </div>

            {/* Example */}
            <div className="mt-3 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border border-yellow-300">
              <div className="text-xs font-semibold text-yellow-900 mb-1">
                💡 Ví dụ:
              </div>
              <div className="text-sm text-yellow-800">
                Chạy 6.75km (trong khoảng 6.7-6.9km) → Nhận{" "}
                <span className="font-bold">6.75 × 2 = 13.5 điểm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rule.rule_type === "multiplier_day") {
    const config = rule.config;
    const multiplier = config.multiplier || 2;
    const dayNames = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    const dayName = dayNames[config.multiplier_day];

    return (
      <div className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-300 relative overflow-hidden">
        {/* Priority Badge */}
        <div className="absolute top-2 right-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold rounded-full">
          Ưu tiên #{priority}
        </div>

        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg">
            <span className="text-3xl">✖️</span>
          </div>
          <div className="flex-1 pr-20">
            <h4 className="font-bold text-gray-900 mb-2 text-lg">
              Ngày nhân đôi ×{multiplier}
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Chạy vào {dayName} để nhận điểm nhân đôi
            </p>

            {/* Example */}
            <div className="mt-3 p-3 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg border border-purple-300">
              <div className="text-xs font-semibold text-purple-900 mb-1">
                💡 Ví dụ:
              </div>
              <div className="text-sm text-purple-800">
                Chạy 5km vào {dayName} → Nhận{" "}
                <span className="font-bold">
                  5 × {multiplier} = {5 * multiplier} điểm
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Penalty Rule Card
function PenaltyRuleCard({ rule }: { rule: Rule }) {
  const config = rule.config;
  const penaltyAmount = config.penalty_per_day || 50000;

  return (
    <div className="bg-white rounded-xl p-4 shadow-md border-2 border-red-300">
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-red-100 rounded-lg">
          <span className="text-3xl">💰</span>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 mb-2 text-lg">
            Phạt {penaltyAmount.toLocaleString("vi-VN")} VND mỗi ngày nghỉ
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Ngày nào không chạy sẽ đóng góp vào quỹ "{config.fund_name}"
          </p>

          {/* Example Calculation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-300">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-green-800">
                  CHẠY ĐỦ
                </span>
              </div>
              <div className="text-sm text-green-700">
                10 ngày sự kiện, chạy 10 ngày
              </div>
              <div className="text-lg font-bold text-green-700 mt-1">
                Phạt: 0 VND ✅
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-300">
              <div className="flex items-center space-x-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-red-800">
                  NGHỈ 3 NGÀY
                </span>
              </div>
              <div className="text-sm text-red-700">
                10 ngày sự kiện, chạy 7 ngày
              </div>
              <div className="text-lg font-bold text-red-700 mt-1">
                Phạt: {(penaltyAmount * 3).toLocaleString("vi-VN")} VND ❌
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-300">
            <p className="text-xs text-red-900">
              💡 <span className="font-bold">Mục đích:</span> Khuyến khích chạy
              đều đặn + Quỹ cho bữa tiệc kết thúc
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Other Rules Card
function OtherRuleCard({ rule }: { rule: Rule }) {
  if (rule.rule_type === "min_active_days") {
    const config = rule.config;
    const percentage = (config.min_active_days_percentage || 66) / 100;

    return (
      <div className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-300">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Flame className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-2">
              Yêu cầu: Chạy tối thiểu {Math.round(percentage * 100)}% số ngày
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Để hoàn thành sự kiện, bạn cần chạy ít nhất{" "}
              {Math.round(percentage * 100)}% tổng số ngày
            </p>

            {/* Visual Progress Example */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Ví dụ: 10 ngày sự kiện</span>
                <span className="font-semibold text-purple-700">
                  Cần: {Math.ceil(10 * percentage)} ngày
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-xs font-bold text-white"
                  style={{ width: `${percentage * 100}%` }}
                >
                  {Math.round(percentage * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Bonus Priority Explanation
function BonusPriorityExplanation({ bonusRules }: { bonusRules: Rule[] }) {
  const getPriorityLevel = (ruleType: string): number => {
    if (ruleType === "tet_bonus") return 3;
    if (ruleType === "lucky_distance") return 2;
    if (ruleType === "multiplier_day") return 1;
    return 0;
  };

  const sortedBonuses = [...bonusRules].sort(
    (a, b) => getPriorityLevel(b.rule_type) - getPriorityLevel(a.rule_type),
  );

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-300">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          🎯 Ưu tiên phần thưởng
        </h3>
      </div>

      <div className="bg-white rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-700 mb-3">
          Khi 1 tracklog đủ điều kiện{" "}
          <span className="font-bold">NHIỀU phần thưởng</span>, hệ thống sẽ{" "}
          <span className="font-bold text-indigo-700">
            CHỈ TÍNH PHẦN THƯỞNG CÓ ƯU TIÊN CAO NHẤT
          </span>
          . Các phần thưởng khác sẽ không được cộng thêm.
        </p>

        <div className="space-y-2">
          {sortedBonuses.map((rule, index) => {
            const priority = getPriorityLevel(rule.rule_type);
            const emoji =
              rule.rule_type === "tet_bonus"
                ? "🧧"
                : rule.rule_type === "lucky_distance"
                  ? "🎯"
                  : "✖️";
            const multiplier = rule.config.multiplier || 2;

            return (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 ${
                  priority === 3
                    ? "bg-red-50 border-red-300"
                    : priority === 2
                      ? "bg-yellow-50 border-yellow-300"
                      : "bg-purple-50 border-purple-300"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-full border-2 border-gray-300 font-bold text-gray-700">
                  {priority}
                </div>
                <span className="text-2xl">{emoji}</span>
                <div className="flex-1">
                  <span className="font-bold text-gray-900">{rule.name}</span>
                  <span className="ml-2 text-sm text-gray-600">
                    (×{multiplier})
                  </span>
                </div>
                {priority === 3 && (
                  <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                    CAO NHẤT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Example Scenario */}
      <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl p-4 border-2 border-indigo-300">
        <div className="text-sm font-bold text-indigo-900 mb-2">
          📖 Ví dụ thực tế:
        </div>
        <div className="text-sm text-indigo-800 space-y-1">
          <div>
            Bạn chạy <span className="font-bold">6.8km</span> vào{" "}
            <span className="font-bold">sáng Mùng 1 Tết</span> (là{" "}
            <span className="font-bold">Chủ nhật</span>)
          </div>
          <div className="mt-2 space-y-1 pl-4 border-l-4 border-indigo-400">
            <div>✅ Đủ điều kiện: Lì xì Khai Xuân (×3)</div>
            <div>✅ Đủ điều kiện: Số đẹp 6.8km (×2)</div>
            <div>✅ Đủ điều kiện: Ngày Chủ nhật (×2)</div>
          </div>
          <div className="mt-2 pt-2 border-t border-indigo-300">
            <span className="font-bold text-indigo-900">
              → Kết quả: Chỉ nhận Lì xì Khai Xuân ×3
            </span>
          </div>
          <div className="text-lg font-bold text-indigo-900">
            Điểm cuối: 6.8 × 3 = 20.4 điểm
          </div>
        </div>
      </div>
    </div>
  );
}
