// components/MinActiveDaysProgress.tsx - UPDATED with expand/collapse
// Component to display user's progress on min_active_days rule

"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
} from "lucide-react";

type ProgressData = {
  hasRule: boolean;
  eventEnded: boolean;
  completed: boolean;
  message: string;
  details: {
    activeDays: number;
    requiredDays: number;
    totalDays: number;
    graceDays: number;
    missedDays: number;
    percentage: string;
  };
  rule: {
    name: string;
    description: string;
    config: any;
  };
};

type MinActiveDaysProgressProps = {
  eventId: string;
  defaultExpanded?: boolean; // NEW: Control default state
};

export default function MinActiveDaysProgress({
  eventId,
  defaultExpanded = false, // Default to minimized
}: MinActiveDaysProgressProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProgressData | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    fetchProgress();
  }, [eventId]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/check-completion`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.hasRule) {
    return null; // Don't show if event doesn't have this rule
  }

  const { details, completed, eventEnded } = data;
  const progressPercentage = (details.activeDays / details.totalDays) * 100;
  const progressWidth = Math.min(progressPercentage, 100);

  // Minimized view
  if (!isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <button
          onClick={toggleExpand}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-900">
                Tiến độ ngày chạy
              </h3>
              <p className="text-xs text-gray-600">
                {details.activeDays}/{details.requiredDays} ngày •{" "}
                {details.percentage}%
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mini Progress Bar */}
            <div className="hidden sm:block w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  completed
                    ? "bg-green-500"
                    : progressPercentage >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            {/* Status Badge */}
            {eventEnded && (
              <div
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  completed
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {completed ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Đạt</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Chưa đạt</span>
                  </>
                )}
              </div>
            )}

            {/* Expand Icon */}
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header with collapse button */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Tiến độ ngày chạy
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            {eventEnded && (
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                  completed
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {completed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-semibold">Hoàn thành</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Chưa đạt</span>
                  </>
                )}
              </div>
            )}

            {/* Collapse Button */}
            <button
              onClick={toggleExpand}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Thu gọn"
            >
              <ChevronUp className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Rule Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">{data.rule.name}</p>
              <p className="mt-1">{data.rule.description}</p>
              {details.graceDays > 0 && (
                <p className="mt-2 text-xs bg-blue-100 inline-block px-2 py-1 rounded">
                  🎁 Cho phép nghỉ {details.graceDays} ngày
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tiến độ</span>
            <span className="font-bold text-gray-900">
              {details.activeDays} / {details.requiredDays} ngày
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                completed
                  ? "bg-gradient-to-r from-green-400 to-green-600"
                  : progressPercentage >= 50
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                    : "bg-gradient-to-r from-red-400 to-red-600"
              }`}
              style={{ width: `${progressWidth}%` }}
            >
              {progressPercentage >= 20 && (
                <span className="text-xs font-bold text-white">
                  {details.percentage}%
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>0 ngày</span>
            <span className="font-medium">{details.percentage}%</span>
            <span>{details.totalDays} ngày</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {details.activeDays}
            </div>
            <div className="text-xs text-gray-600 mt-1">Ngày đã chạy</div>
          </div>

          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {details.requiredDays}
            </div>
            <div className="text-xs text-gray-600 mt-1">Ngày yêu cầu</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {details.totalDays}
            </div>
            <div className="text-xs text-gray-600 mt-1">Tổng số ngày</div>
          </div>
        </div>

        {/* Missed Days Info */}
        {details.missedDays > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
            <span className="text-gray-600">Số ngày đã nghỉ</span>
            <span className="font-bold text-gray-900">
              {details.missedDays} ngày
              {details.graceDays > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  (cho phép {details.graceDays})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Message */}
        <div
          className={`text-sm font-medium text-center p-4 rounded-lg ${
            completed
              ? "bg-green-50 text-green-800 border border-green-200"
              : eventEnded
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-gray-50 text-gray-700 border border-gray-200"
          }`}
        >
          {data.message}
        </div>

        {/* Action hint */}
        {!eventEnded && !completed && (
          <div className="text-xs text-center text-gray-500 pt-2 border-t">
            💡 Mẹo: Cố gắng chạy đều đặn mỗi ngày để đạt yêu cầu!
            {details.graceDays > 0 &&
              ` Bạn có ${details.graceDays} ngày nghỉ phép.`}
          </div>
        )}

        {/* Completion Celebration */}
        {eventEnded && completed && (
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
            <div className="text-4xl mb-2">🎉</div>
            <div className="font-bold text-gray-900 mb-1">
              Chúc mừng bạn đã hoàn thành!
            </div>
            <div className="text-sm text-gray-600">
              Bạn đã chinh phục thử thách với {details.activeDays} ngày chạy
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
