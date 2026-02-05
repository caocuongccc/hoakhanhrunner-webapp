// components/RulesSelector.tsx - ENHANCED with custom percentage and grace days
"use client";

import { useEffect, useState } from "react";
import { Check, Info, Settings } from "lucide-react";
import { createSupabaseClient, Rule } from "@/lib/supabase";
import { PERCENTAGE_OPTIONS, GRACE_DAYS_OPTIONS } from "@/lib/rule-validators";

type RulesSelectorProps = {
  selectedRules: string[];
  onChange: (ruleIds: string[]) => void;
  onRuleConfigChange?: (ruleId: string, config: any) => void; // NEW: Allow config customization
};

const RULE_TEMPLATES = [
  {
    name: "Tăng dần cá nhân",
    description: "Mỗi ngày phải chạy nhiều hơn ngày hôm trước",
    rule_type: "daily_increase_individual",
    config: { increase_km: 1 },
  },
  {
    name: "Tăng dần theo đội",
    description: "Tổng km của đội mỗi ngày phải tăng so với ngày hôm trước",
    rule_type: "daily_increase_team",
    config: { team_increase_km: 5 },
  },
  {
    name: "Số người tối thiểu",
    description: "Mỗi ngày phải có ít nhất một số người chạy",
    rule_type: "min_participants",
    config: { min_participants: 3 },
  },
  {
    name: "Giới hạn pace",
    description: "Pace phải nằm trong khoảng cho phép",
    rule_type: "pace_range",
    config: { min_pace: 4, max_pace: 8 },
  },
  {
    name: "Ngày nhân đôi",
    description: "Chủ nhật sẽ được nhân đôi số km",
    rule_type: "multiplier_day",
    config: { multiplier_day: 0, multiplier: 2 },
  },
  {
    name: "Giới hạn thời gian",
    description: "Chỉ tính hoạt động trong khung giờ nhất định",
    rule_type: "time_range",
    config: { start_time: "05:00", end_time: "22:00" },
  },
  {
    name: "Số ngày chạy tối thiểu",
    description: "Phải có tracklog đủ số ngày yêu cầu (có thể tùy chỉnh %)",
    rule_type: "min_active_days",
    config: {
      min_percentage: 66.67,
      grace_days: 0,
      description_example: "Sự kiện 10 ngày cần 7 ngày có tracklog",
    },
  },
];

export default function RulesSelector({
  selectedRules,
  onChange,
  onRuleConfigChange,
}: RulesSelectorProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRules, setCreatingRules] = useState(false);
  const [configuringRule, setConfiguringRule] = useState<string | null>(null);
  const [tempConfigs, setTempConfigs] = useState<Record<string, any>>({});

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules(data || []);

      if (!data || data.length === 0) {
        await createDefaultRules();
      }
    } catch (error) {
      console.error("Error loading rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultRules = async () => {
    setCreatingRules(true);
    try {
      const { data, error } = await supabase
        .from("rules")
        .insert(RULE_TEMPLATES)
        .select();

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Error creating default rules:", error);
    } finally {
      setCreatingRules(false);
    }
  };

  const toggleRule = (ruleId: string) => {
    if (selectedRules.includes(ruleId)) {
      onChange(selectedRules.filter((id) => id !== ruleId));
    } else {
      onChange([...selectedRules, ruleId]);
    }
  };

  const openConfig = (ruleId: string, currentConfig: any) => {
    setConfiguringRule(ruleId);
    setTempConfigs({ ...tempConfigs, [ruleId]: { ...currentConfig } });
  };

  const saveConfig = (ruleId: string) => {
    if (onRuleConfigChange && tempConfigs[ruleId]) {
      onRuleConfigChange(ruleId, tempConfigs[ruleId]);
    }
    setConfiguringRule(null);
  };

  const updateTempConfig = (ruleId: string, key: string, value: any) => {
    setTempConfigs({
      ...tempConfigs,
      [ruleId]: {
        ...tempConfigs[ruleId],
        [key]: value,
      },
    });
  };

  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case "daily_increase_individual":
        return "📈";
      case "daily_increase_team":
        return "👥";
      case "min_participants":
        return "🎯";
      case "pace_range":
        return "⚡";
      case "multiplier_day":
        return "✖️";
      case "time_range":
        return "⏰";
      case "min_active_days":
        return "📅";
      default:
        return "📋";
    }
  };

  const getRuleConfigDisplay = (rule: Rule) => {
    const config = rule.config as any;

    switch (rule.rule_type) {
      case "daily_increase_individual":
        return `Tăng ${config.increase_km} km mỗi ngày`;
      case "daily_increase_team":
        return `Đội tăng ${config.team_increase_km} km mỗi ngày`;
      case "min_participants":
        return `Tối thiểu ${config.min_participants} người/ngày`;
      case "pace_range":
        return `Pace: ${config.min_pace} - ${config.max_pace} phút/km`;
      case "multiplier_day":
        const days = [
          "Chủ nhật",
          "Thứ 2",
          "Thứ 3",
          "Thứ 4",
          "Thứ 5",
          "Thứ 6",
          "Thứ 7",
        ];
        return `${days[config.multiplier_day]} x${config.multiplier}`;
      case "time_range":
        return `${config.start_time} - ${config.end_time}`;
      case "min_active_days":
        const percentage = config.min_percentage?.toFixed(0) || "67";
        const grace = config.grace_days || 0;
        const graceText = grace > 0 ? `, cho phép nghỉ ${grace} ngày` : "";
        return `Cần ${percentage}% ngày có tracklog${graceText}`;
      default:
        return "";
    }
  };

  if (loading || creatingRules) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-2">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Lưu ý về luật chơi:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Các luật sẽ được áp dụng khi tính điểm cho hoạt động</li>
            <li>Nếu không đáp ứng luật, hoạt động sẽ không được tính điểm</li>
            <li>Có thể chọn nhiều luật cùng lúc</li>
            <li>
              <strong>Luật "Số ngày chạy tối thiểu"</strong> có thể tùy chỉnh %
              và số ngày nghỉ
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => {
          const isSelected = selectedRules.includes(rule.id);
          const isConfiguring = configuringRule === rule.id;

          return (
            <div key={rule.id} className="relative">
              <button
                type="button"
                onClick={() => toggleRule(rule.id)}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">
                        {getRuleIcon(rule.rule_type)}
                      </span>
                      <h3 className="font-bold text-gray-900">{rule.name}</h3>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {rule.description}
                    </p>

                    <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {getRuleConfigDisplay(rule)}
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-2 ml-4">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </div>

                    {/* Config button for min_active_days */}
                    {rule.rule_type === "min_active_days" && isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfig(rule.id, rule.config);
                        }}
                        className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        title="Tùy chỉnh cấu hình"
                      >
                        <Settings className="h-4 w-4 text-gray-700" />
                      </button>
                    )}
                  </div>
                </div>
              </button>

              {/* Configuration Modal */}
              {isConfiguring && rule.rule_type === "min_active_days" && (
                <div className="absolute inset-0 z-10 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-xl">
                  <h4 className="font-bold text-gray-900 mb-3">
                    Tùy chỉnh luật
                  </h4>

                  {/* Percentage selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phần trăm ngày yêu cầu
                    </label>
                    <select
                      value={tempConfigs[rule.id]?.min_percentage || 66.67}
                      onChange={(e) =>
                        updateTempConfig(
                          rule.id,
                          "min_percentage",
                          parseFloat(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {PERCENTAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grace days selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số ngày nghỉ cho phép
                    </label>
                    <select
                      value={tempConfigs[rule.id]?.grace_days || 0}
                      onChange={(e) =>
                        updateTempConfig(
                          rule.id,
                          "grace_days",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {GRACE_DAYS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview */}
                  <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                    <p className="text-gray-600">
                      <strong>Ví dụ:</strong> Sự kiện 10 ngày sẽ yêu cầu{" "}
                      <strong className="text-blue-600">
                        {Math.max(
                          Math.ceil(
                            (10 *
                              (tempConfigs[rule.id]?.min_percentage || 66.67)) /
                              100,
                          ) - (tempConfigs[rule.id]?.grace_days || 0),
                          1,
                        )}{" "}
                        ngày
                      </strong>{" "}
                      có tracklog
                      {tempConfigs[rule.id]?.grace_days > 0 &&
                        ` (cho phép nghỉ ${tempConfigs[rule.id].grace_days} ngày)`}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setConfiguringRule(null)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => saveConfig(rule.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Không có luật chơi nào. Hệ thống sẽ tự động tạo các luật mẫu.
        </div>
      )}
    </div>
  );
}
