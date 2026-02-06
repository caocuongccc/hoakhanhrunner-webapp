// components/EventDashboard.tsx - UPDATED with tracklog action
"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import {
  Activity,
  ChevronRight,
  Trophy,
  TrendingUp,
  Award,
} from "lucide-react";

interface DashboardProps {
  eventId: string;
  onViewTracklog?: (userId: string, userName: string) => void; // NEW: Callback to open tracklog modal
}

export default function EventDashboard({
  eventId,
  onViewTracklog,
}: DashboardProps) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadParticipants();
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("event_participants")
        .select(
          `
          *,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `,
        )
        .eq("event_id", eventId)
        .order("total_km", { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error("Error loading participants:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Chưa có người tham gia nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 3 Podium */}
      {participants.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="text-center pt-8">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-white shadow-lg">
                {participants[1]?.users?.avatar_url ? (
                  <img
                    src={participants[1].users.avatar_url}
                    alt={participants[1].users.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {participants[1]?.users?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                2
              </div>
            </div>
            <div className="font-bold text-gray-900 truncate">
              {participants[1]?.users?.username}
            </div>
            <div className="text-sm text-gray-600">
              {participants[1]?.total_km?.toFixed(1) || 0} km
            </div>
          </div>

          {/* 1st Place */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-white shadow-xl">
                {participants[0]?.users?.avatar_url ? (
                  <img
                    src={participants[0].users.avatar_url}
                    alt={participants[0].users.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {participants[0]?.users?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <Trophy className="h-8 w-8 text-yellow-500 drop-shadow-lg" />
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                1
              </div>
            </div>
            <div className="font-bold text-gray-900 text-lg truncate">
              {participants[0]?.users?.username}
            </div>
            <div className="text-sm text-yellow-600 font-semibold">
              {participants[0]?.total_km?.toFixed(1) || 0} km
            </div>
          </div>

          {/* 3rd Place */}
          <div className="text-center pt-12">
            <div className="relative inline-block">
              <div className="w-18 h-18 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-white shadow-lg">
                {participants[2]?.users?.avatar_url ? (
                  <img
                    src={participants[2].users.avatar_url}
                    alt={participants[2].users.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {participants[2]?.users?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-amber-700 rounded-full flex items-center justify-center text-white font-bold text-xs shadow">
                3
              </div>
            </div>
            <div className="font-bold text-gray-900 text-sm truncate">
              {participants[2]?.users?.username}
            </div>
            <div className="text-xs text-gray-600">
              {participants[2]?.total_km?.toFixed(1) || 0} km
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <span>Bảng xếp hạng chi tiết</span>
        </h3>

        <div className="space-y-2">
          {participants.map((participant, index) => {
            const isCurrentUser = user && participant.user_id === user.id;
            const rank = index + 1;

            return (
              <div
                key={participant.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isCurrentUser
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : rank <= 3
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Rank Badge */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      rank === 1
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg"
                        : rank === 2
                          ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md"
                          : rank === 3
                            ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md"
                            : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {rank}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {participant.users?.avatar_url ? (
                      <img
                        src={participant.users.avatar_url}
                        alt={participant.users.username}
                        className="w-12 h-12 rounded-full border-2 border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-gray-200">
                        {participant.users?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-bold text-gray-900 truncate">
                        {participant.users?.username || "Unknown"}
                      </h4>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Bạn
                        </span>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Tổng km</span>
                        <div className="font-semibold text-gray-900">
                          {participant.total_km?.toFixed(1) || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Điểm</span>
                        <div className="font-semibold text-gray-900">
                          {participant.total_points?.toFixed(0) || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Hoạt động</span>
                        <div className="font-semibold text-gray-900">
                          {participant.activity_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View Tracklog Button */}
                  {onViewTracklog && (
                    <button
                      onClick={() =>
                        onViewTracklog(
                          participant.user_id,
                          participant.users?.username || "User",
                        )
                      }
                      className="flex-shrink-0 flex items-center space-x-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium text-sm group"
                      title="Xem tracklog"
                    >
                      <Activity className="h-4 w-4" />
                      <span className="hidden sm:inline">Tracklog</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                {participants[0]?.total_km > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Tiến độ so với top 1</span>
                      <span>
                        {(
                          (participant.total_km / participants[0].total_km) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          rank === 1
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                            : rank === 2
                              ? "bg-gradient-to-r from-gray-400 to-gray-600"
                              : rank === 3
                                ? "bg-gradient-to-r from-amber-500 to-amber-700"
                                : "bg-gradient-to-r from-blue-400 to-blue-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            (participant.total_km / participants[0].total_km) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-blue-600" />
            <span className="text-gray-700 font-medium">
              Tổng số người tham gia: <strong>{participants.length}</strong>
            </span>
          </div>
          <div className="text-gray-600">Top 3 được highlight đặc biệt</div>
        </div>
      </div>
    </div>
  );
}
