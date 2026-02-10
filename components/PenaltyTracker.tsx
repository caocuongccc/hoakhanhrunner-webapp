// components/PenaltyTracker.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertCircle, DollarSign, Calendar, TrendingDown } from "lucide-react";
import { CollapsibleSection } from "./CollapsibleSection";

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
  isExpanded: boolean;
  onToggle: () => void;
};

export default function PenaltyTracker({
  eventId,
  userId,
  isExpanded,
  onToggle,
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
    <CollapsibleSection
      title={hasPenalty ? "Phạt tiền ngày nghỉ" : "Không bị phạt!"}
      isExpanded={isExpanded}
      onToggle={onToggle}
      headerColor={
        hasPenalty
          ? "from-red-50 to-orange-50 border-red-300"
          : "from-green-50 to-emerald-50 border-green-300"
      }
      icon={
        hasPenalty ? (
          <AlertCircle className="h-5 w-5 text-red-600" />
        ) : (
          <DollarSign className="h-5 w-5 text-green-600" />
        )
      }
      iconBg={hasPenalty ? "bg-red-100" : "bg-green-100"}
    >
      {/* ===== CONTENT ===== */}
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{penalty.total_days}</div>
            <div className="text-xs text-gray-600">Tổng ngày</div>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border">
            <Calendar className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">
              {penalty.active_days}
            </div>
            <div className="text-xs text-gray-600">Đã chạy</div>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border">
            <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">
              {penalty.missed_days}
            </div>
            <div className="text-xs text-gray-600">Nghỉ</div>
          </div>
        </div>

        {/* Penalty detail */}
        <div className="p-4 bg-white rounded-lg border-2 border-dashed">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Mỗi ngày nghỉ:</span>
            <span className="font-semibold">
              {penalty.penalty_per_day.toLocaleString("vi-VN")}{" "}
              {penalty.currency}
            </span>
          </div>

          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Số ngày nghỉ:</span>
            <span className="font-semibold">{penalty.missed_days} ngày</span>
          </div>

          <div className="border-t pt-2 mt-2 flex justify-between">
            <span className="font-bold">Tổng phạt:</span>
            <span
              className={`text-2xl font-bold ${
                hasPenalty ? "text-red-600" : "text-green-600"
              }`}
            >
              {penalty.penalty_amount.toLocaleString("vi-VN")}{" "}
              {penalty.currency}
            </span>
          </div>
        </div>

        {/* Message */}
        <div
          className={`text-center p-4 rounded-lg ${
            hasPenalty
              ? "bg-red-100 border border-red-200"
              : "bg-green-100 border border-green-200"
          }`}
        >
          {hasPenalty ? (
            <>
              <p className="font-bold text-red-800 mb-1">
                💰 Vui lòng đóng góp quỹ "Lẩu tất niên"
              </p>
              <p className="text-sm text-red-700">
                Số tiền sẽ dùng cho bữa tiệc kết thúc sự kiện
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-green-800 mb-1">
                🎉 Xuất sắc! Không bị phạt
              </p>
              <p className="text-sm text-green-700">
                Bạn đã chạy đủ {penalty.active_days}/{penalty.total_days} ngày
              </p>
            </>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
