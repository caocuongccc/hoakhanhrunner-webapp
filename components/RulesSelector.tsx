"use client";

import { useEffect, useState } from "react";
import { Check, Info } from "lucide-react";
import { createSupabaseClient, Rule } from "@/lib/supabase";

type RulesSelectorProps = {
  selectedRules: string[];
  onChange: (ruleIds: string[]) => void;
};

// Predefined rules templates
const RULE_TEMPLATES = [
  {
    name: "Tăng dần cá nhân",
    description:
      "Mỗi ngày phải chạy nhiều hơn ngày hôm trước một khoảng km nhất định",
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
];

export default function RulesSelector({
  selectedRules,
  onChange,
}: RulesSelectorProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRules, setCreatingRules] = useState(false);
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

      // Create default rules if none exist
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
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => {
          const isSelected = selectedRules.includes(rule.id);

          return (
            <button
              key={rule.id}
              type="button"
              onClick={() => toggleRule(rule.id)}
              className={`text-left p-4 border-2 rounded-lg transition-all ${
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

                <div
                  className={`flex-shrink-0 ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
              </div>
            </button>
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
