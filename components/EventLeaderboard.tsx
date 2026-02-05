// components/EventLeaderboard.tsx
// Display event leaderboard with rankings and badges

"use client";

import { useEffect, useState } from "react";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  Calendar,
} from "lucide-react";
import Image from "next/image";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  activeDays: number;
  totalDays: number;
  requiredDays: number;
  completionPercentage: number;
  isCompleted: boolean;
  rank: number;
  badges: string[];
}

interface LeaderboardData {
  event: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
  leaderboard: LeaderboardEntry[];
  totalParticipants: number;
  completedCount: number;
}

type EventLeaderboardProps = {
  eventId: string;
};

export default function EventLeaderboard({ eventId }: EventLeaderboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [eventId]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/leaderboard`);

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error("Error fetching leaderboard:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-amber-500 to-amber-700";
      default:
        return "bg-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center text-red-600">
          {error || "Không thể tải bảng xếp hạng"}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Bảng xếp hạng</h2>
              <p className="text-blue-100 text-sm">{data.event.name}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold">{data.completedCount}</div>
            <div className="text-sm text-blue-100">hoàn thành</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <div>
                <div className="text-lg font-bold">
                  {data.totalParticipants}
                </div>
                <div className="text-xs text-blue-100">Người tham gia</div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <div>
                <div className="text-lg font-bold">
                  {data.leaderboard[0]?.totalDays || 0}
                </div>
                <div className="text-xs text-blue-100">Ngày</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-200">
        {data.leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Chưa có ai hoàn thành sự kiện</p>
          </div>
        ) : (
          data.leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                entry.rank <= 3
                  ? "bg-gradient-to-r from-transparent to-yellow-50"
                  : ""
              }`}
            >
              <div className="flex items-center space-x-4">
                {/* Rank */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getRankBadgeColor(
                    entry.rank,
                  )} ${entry.rank <= 3 ? "shadow-lg" : ""}`}
                >
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  {entry.userAvatar ? (
                    <Image
                      src={entry.userAvatar}
                      alt={entry.userName}
                      width={48}
                      height={48}
                      className="rounded-full border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {entry.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">
                      {entry.userName}
                    </h3>
                    {entry.isCompleted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Hoàn thành
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          entry.isCompleted
                            ? "bg-green-500"
                            : entry.completionPercentage >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{
                          width: `${Math.min(entry.completionPercentage, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      {entry.completionPercentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>
                      {entry.activeDays}/{entry.requiredDays} ngày
                    </span>
                    {entry.badges.length > 0 && (
                      <div className="flex items-center space-x-1">
                        {entry.badges.map((badge, idx) => (
                          <span key={idx} className="text-lg">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Percentage Badge */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {entry.activeDays}
                  </div>
                  <div className="text-xs text-gray-500">ngày</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {data.leaderboard.length > 0 && (
        <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-600">
          <p>
            🏆 Top 3 được hiển thị với huy hiệu đặc biệt •{" "}
            {((data.completedCount / data.totalParticipants) * 100).toFixed(0)}%
            đã hoàn thành
          </p>
        </div>
      )}
    </div>
  );
}
