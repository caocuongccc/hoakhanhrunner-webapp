// components/DualLeaderboard.tsx
// Show 2 leaderboards: Endurance (Total KM) vs Consistency (Streak)

"use client";

import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Flame, Target } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  totalKm: number;
  longestStreak: number;
  totalPoints: number;
  activeDays: number;
}

type DualLeaderboardProps = {
  eventId: string;
};

export default function DualLeaderboard({ eventId }: DualLeaderboardProps) {
  const [enduranceRanking, setEnduranceRanking] = useState<LeaderboardEntry[]>(
    [],
  );
  const [consistencyRanking, setConsistencyRanking] = useState<
    LeaderboardEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"endurance" | "consistency">(
    "endurance",
  );

  useEffect(() => {
    fetchLeaderboards();
  }, [eventId]);

  const fetchLeaderboards = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/dual-leaderboard`);
      const data = await response.json();
      console.log("Fetched leaderboard data:", data);
      setEnduranceRanking(data.endurance || []);
      setConsistencyRanking(data.consistency || []);
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("endurance")}
          className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === "endurance"
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Target className="h-5 w-5" />
          <span>Bền Bỉ (Tổng KM)</span>
        </button>
        <button
          onClick={() => setActiveTab("consistency")}
          className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === "consistency"
              ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Flame className="h-5 w-5" />
          <span>Siêng Năng (Streak)</span>
        </button>
      </div>

      {/* Leaderboard Content */}
      {activeTab === "endurance" ? (
        <EnduranceLeaderboard entries={enduranceRanking} />
      ) : (
        <ConsistencyLeaderboard entries={consistencyRanking} />
      )}
    </div>
  );
}

// Endurance Leaderboard (Total KM)
function EnduranceLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Trophy className="h-6 w-6" />
          <span>Bảng xếp hạng Bền Bỉ</span>
        </h3>
        <p className="text-blue-100 text-sm mt-1">
          Siêu nhân cày km - Xếp hạng theo tổng số km
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {entries.map((entry, index) => {
          const rank = index + 1;
          return (
            <div
              key={entry.userId}
              className={`p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors ${
                rank <= 3 ? "bg-yellow-50" : ""
              }`}
            >
              {/* Rank */}
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  rank === 1
                    ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white"
                    : rank === 2
                      ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                      : rank === 3
                        ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
                        : "bg-gray-200 text-gray-700"
                }`}
              >
                {rank}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{entry.userName}</h4>
                <p className="text-sm text-gray-600">
                  {entry.activeDays} ngày hoạt động
                </p>
              </div>

              {/* Total KM */}
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {entry.totalKm.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600">km</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 p-4 text-center text-sm text-gray-600">
        🏆 Top 3 sẽ nhận giải "Siêu nhân Bền Bỉ"
      </div>
    </div>
  );
}

// Consistency Leaderboard (Streak)
function ConsistencyLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Flame className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Chưa có dữ liệu</p>
      </div>
    );
  }

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return "🔥🔥🔥";
    if (streak >= 14) return "🔥🔥";
    if (streak >= 7) return "🔥";
    if (streak >= 3) return "⚡";
    return "✅";
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Flame className="h-6 w-6" />
          <span>Bảng xếp hạng Siêng Năng</span>
        </h3>
        <p className="text-orange-100 text-sm mt-1">
          Streak master - Xếp hạng theo số ngày chạy liên tục
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {entries.map((entry, index) => {
          const rank = index + 1;
          return (
            <div
              key={entry.userId}
              className={`p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors ${
                rank <= 3 ? "bg-orange-50" : ""
              }`}
            >
              {/* Rank */}
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  rank === 1
                    ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white"
                    : rank === 2
                      ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                      : rank === 3
                        ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
                        : "bg-gray-200 text-gray-700"
                }`}
              >
                {rank}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{entry.userName}</h4>
                <p className="text-sm text-gray-600">
                  {entry.totalKm.toFixed(1)} km tổng cộng
                </p>
              </div>

              {/* Streak */}
              <div className="text-right">
                <div className="text-4xl mb-1">
                  {getStreakEmoji(entry.longestStreak)}
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {entry.longestStreak}
                </div>
                <div className="text-xs text-gray-600">ngày liên tục</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 p-4 text-center text-sm text-gray-600">
        🔥 Top 3 sẽ nhận giải "Streak Master Siêng Năng"
      </div>
    </div>
  );
}
