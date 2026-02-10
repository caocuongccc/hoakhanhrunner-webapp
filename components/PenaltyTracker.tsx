// components/PenaltyTracker.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertCircle, DollarSign, Calendar, TrendingDown } from "lucide-react";

interface PenaltyData {
  has_penalty_rule: boolean;
  total_days: number;
  active_days: number;
  missed_days: number;
  penalty_per_day: number;
  penalty_amount: number;
  currency: string;
}

type PenaltyTrackerProps = {
  eventId: string;
  userId?: string;
};

export default function PenaltyTracker({
  eventId,
  userId,
}: PenaltyTrackerProps) {
  const [penalty, setPenalty] = useState<PenaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchPenalty();
    }
  }, [eventId, userId]);

  const fetchPenalty = async () => {
    if (!userId) return;
    try {
      const response = await fetch(
        `/api/events/${eventId}/penalties-streaks?userId=${userId}`,
      );
      const data = await response.json();
      if (data.penalty) {
        setPenalty(data.penalty);
      }
    } catch (error) {
      console.error("Error fetching penalty:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!penalty || !penalty.has_penalty_rule) {
    return null;
  }

  const hasPenalty = penalty.missed_days > 0;

  return (
    <div
      className={`rounded-xl shadow-lg overflow-hidden border-2 ${hasPenalty ? "border-red-300 bg-gradient-to-br from-red-50 to-orange-50" : "border-green-300 bg-gradient-to-br from-green-50 to-emerald-50"}`}
    >
      <div
        className={`p-4 ${hasPenalty ? "bg-gradient-to-r from-red-600 to-orange-600" : "bg-gradient-to-r from-green-600 to-emerald-600"}`}
      >
        <div className="flex items-center space-x-3 text-white">
          {hasPenalty ? (
            <AlertCircle className="h-6 w-6" />
          ) : (
            <DollarSign className="h-6 w-6" />
          )}
          <div>
            <h3 className="text-lg font-bold">
              {hasPenalty ? "Phạt tiền ngày nghỉ" : "Không bị phạt!"}
            </h3>
            <p className="text-sm opacity-90">Quỹ "Lẩu tất niên/tân niên"</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
            <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">
              {penalty.total_days}
            </div>
            <div className="text-xs text-gray-600">Tổng ngày</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
            <Calendar className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">
              {penalty.active_days}
            </div>
            <div className="text-xs text-gray-600">Đã chạy</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
            <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">
              {penalty.missed_days}
            </div>
            <div className="text-xs text-gray-600">Nghỉ</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Mỗi ngày nghỉ:</span>
            <span className="font-semibold text-gray-900">
              {penalty.penalty_per_day.toLocaleString("vi-VN")}{" "}
              {penalty.currency}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Số ngày nghỉ:</span>
            <span className="font-semibold text-gray-900">
              {penalty.missed_days} ngày
            </span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-gray-900">
                Tổng phạt:
              </span>
              <span
                className={`text-2xl font-bold ${hasPenalty ? "text-red-600" : "text-green-600"}`}
              >
                {penalty.penalty_amount.toLocaleString("vi-VN")}{" "}
                {penalty.currency}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`text-center p-4 rounded-lg ${hasPenalty ? "bg-red-100 border border-red-200" : "bg-green-100 border border-green-200"}`}
        >
          {hasPenalty ? (
            <div>
              <p className="font-bold mb-1 text-red-800">
                💰 Vui lòng đóng góp quỹ "Lẩu tất niên"
              </p>
              <p className="text-sm text-red-700">
                Số tiền sẽ được sử dụng cho bữa tiệc kết thúc sự kiện
              </p>
            </div>
          ) : (
            <div>
              <p className="font-bold text-green-800 mb-1">
                🎉 Xuất sắc! Không bị phạt
              </p>
              <p className="text-sm text-green-700">
                Bạn đã chạy đủ {penalty.active_days}/{penalty.total_days} ngày
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
