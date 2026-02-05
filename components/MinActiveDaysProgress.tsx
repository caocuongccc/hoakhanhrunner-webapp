// components/MinActiveDaysProgress.tsx
// Component to display user's progress on min_active_days rule

"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, XCircle, Info } from "lucide-react";

type ProgressData = {
  hasRule: boolean;
  eventEnded: boolean;
  completed: boolean;
  message: string;
  details: {
    activeDays: number;
    requiredDays: number;
    totalDays: number;
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
};

export default function MinActiveDaysProgress({
  eventId,
}: MinActiveDaysProgressProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [eventId]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/check-completion`);
      const result = await response.json();
      console.log("MinActiveDaysProgress fetch result:", result);
      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Tiến độ ngày chạy</h3>
        </div>

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
      </div>

      {/* Progress Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">{data.rule.name}</p>
            <p className="mt-1">{data.rule.description}</p>
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

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completed
                ? "bg-green-500"
                : progressPercentage >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>0 ngày</span>
          <span className="font-medium">{details.percentage}%</span>
          <span>{details.totalDays} ngày</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {details.activeDays}
          </div>
          <div className="text-xs text-gray-600 mt-1">Ngày đã chạy</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {details.requiredDays}
          </div>
          <div className="text-xs text-gray-600 mt-1">Ngày yêu cầu</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {details.totalDays}
          </div>
          <div className="text-xs text-gray-600 mt-1">Tổng số ngày</div>
        </div>
      </div>

      {/* Message */}
      <div
        className={`text-sm font-medium text-center p-3 rounded-lg ${
          completed
            ? "bg-green-50 text-green-800"
            : eventEnded
              ? "bg-red-50 text-red-800"
              : "bg-gray-50 text-gray-700"
        }`}
      >
        {data.message}
      </div>

      {/* Action hint */}
      {!eventEnded && !completed && (
        <div className="text-xs text-center text-gray-500 pt-2 border-t">
          💡 Mẹo: Cố gắng chạy đều đặn mỗi ngày để đạt yêu cầu!
        </div>
      )}
    </div>
  );
}
