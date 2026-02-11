// components/PenaltyTracker.tsx
// Enhanced with PUBLIC penalties summary for all participants

"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  DollarSign,
  Calendar,
  TrendingDown,
  Users,
  Download,
} from "lucide-react";
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

interface ParticipantPenalty {
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalDays: number;
  activeDays: number;
  missedDays: number;
  penaltyAmount: number;
  isPaid: boolean;
}

interface PenaltiesSummary {
  summary: {
    totalParticipants: number;
    totalPenalties: number;
    participantsWithPenalties: number;
    participantsWithoutPenalties: number;
    paidCount: number;
    unpaidCount: number;
    totalPaid: number;
    totalUnpaid: number;
    currency: string;
  };
  participants: ParticipantPenalty[];
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
  const [allPenalties, setAllPenalties] = useState<PenaltiesSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showAllPenalties, setShowAllPenalties] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user's personal penalty
      if (userId) {
        const response = await fetch(
          `/api/events/${eventId}/penalties-streaks?userId=${userId}`,
        );
        const data = await response.json();
        if (data.penalty) {
          setPenalty(data.penalty);
        }
      }

      // Fetch all penalties summary
      const summaryResponse = await fetch(
        `/api/events/${eventId}/penalties-summary`,
      );
      const summaryData = await summaryResponse.json();
      setAllPenalties(summaryData);
    } catch (error) {
      console.error("Error fetching penalties:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    // Create CSV content
    const headers = [
      "Tên",
      "Tổng ngày",
      "Đã chạy",
      "Nghỉ",
      "Phạt (VND)",
      "Đã đóng",
    ];

    const rows = allPenalties?.participants.map((p) => [
      p.userName,
      p.totalDays,
      p.activeDays,
      p.missedDays,
      p.penaltyAmount,
      p.isPaid ? "Có" : "Chưa",
    ]);

    const csvContent = [
      headers.join(","),
      ...(rows || []).map((row) => row.join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `penalties_${eventId}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  if (!penalty && !allPenalties) {
    return null;
  }

  const hasPenalty = penalty && penalty.missed_days > 0;

  return (
    <div className="space-y-4">
      {/* PERSONAL PENALTY SECTION */}

      {/* PUBLIC SUMMARY SECTION */}
      {allPenalties && (
        <CollapsibleSection
          title="📊 Bảng phạt toàn bộ"
          isExpanded={showAllPenalties}
          onToggle={() => setShowAllPenalties(!showAllPenalties)}
          headerColor="from-purple-50 to-indigo-50 border-purple-300"
          icon={<Users className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
        >
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-xl font-bold text-blue-600">
                  {allPenalties.summary.totalParticipants}
                </div>
                <div className="text-xs text-gray-600">Thành viên</div>
              </div>

              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-xl font-bold text-red-600">
                  {allPenalties.summary.participantsWithPenalties}
                </div>
                <div className="text-xs text-gray-600">Bị phạt</div>
              </div>

              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-xl font-bold text-green-600">
                  {allPenalties.summary.participantsWithoutPenalties}
                </div>
                <div className="text-xs text-gray-600">Không phạt</div>
              </div>

              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-xl font-bold text-orange-600">
                  {allPenalties.summary.totalPenalties.toLocaleString("vi-VN")}
                </div>
                <div className="text-xs text-gray-600">Tổng quỹ (VND)</div>
              </div>
            </div>

            {/* Download Button */}
            {/* <div className="flex justify-end">
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Tải CSV</span>
              </button>
            </div> */}

            {/* Participants List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allPenalties.participants.map((participant, index) => (
                <div
                  key={participant.userId}
                  className={`p-3 rounded-lg border ${
                    participant.penaltyAmount > 0
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  } ${
                    participant.userId === userId ? "ring-2 ring-blue-400" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                        {participant.userAvatar ? (
                          <img
                            src={participant.userAvatar}
                            alt={participant.userName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {participant.userName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {participant.userName}
                          {participant.userId === userId && (
                            <span className="ml-2 text-xs text-blue-600 font-bold">
                              (Bạn)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          {participant.activeDays}/{participant.totalDays} ngày
                          {participant.missedDays > 0 && (
                            <span className="text-red-600 ml-1">
                              • Nghỉ {participant.missedDays}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Penalty Amount */}
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          participant.penaltyAmount > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {participant.penaltyAmount > 0
                          ? `-${participant.penaltyAmount.toLocaleString("vi-VN")}`
                          : "0"}{" "}
                        VND
                      </p>
                      {participant.penaltyAmount > 0 && (
                        <p
                          className={`text-xs ${
                            participant.isPaid
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {participant.isPaid ? "✓ Đã đóng" : "⏳ Chưa đóng"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-700">
                    Đã thu:{" "}
                    {allPenalties.summary.totalPaid.toLocaleString("vi-VN")} VND
                  </p>
                  <p className="text-sm text-gray-700">
                    Chưa thu:{" "}
                    {allPenalties.summary.totalUnpaid.toLocaleString("vi-VN")}{" "}
                    VND
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Tổng quỹ</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {allPenalties.summary.totalPenalties.toLocaleString(
                      "vi-VN",
                    )}{" "}
                    VND
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
