// app/feeds/page.tsx - WITH STRAVA ATTRIBUTION
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Activity, MapPin, Clock, TrendingUp, Calendar } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const STRAVA_ORANGE = "#FC4C02";

type StravaActivityFeed = {
  id: string;
  strava_activity_id: number;
  user_id: string;
  name: string;
  distance: number;
  moving_time: number;
  average_speed: number;
  start_date_local: string;
  map_summary_polyline?: string;
  created_at: string;
  users: {
    id: string;
    full_name: string;
    avatar_url?: string;
    username: string;
  };
};

export default function FeedsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [activities, setActivities] = useState<StravaActivityFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "following" | "mine">("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadActivities();
    }
  }, [user, authLoading, router, filter]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from("strava_activities")
        .select(
          `
          id,
          strava_activity_id,
          user_id,
          name,
          distance,
          moving_time,
          average_speed,
          start_date_local,
          map_summary_polyline,
          created_at,
          users!strava_activities_user_id_fkey (
            id,
            full_name,
            avatar_url,
            username
          )
        `,
        )
        .gte("start_date_local", thirtyDaysAgo.toISOString())
        .order("start_date_local", { ascending: false })
        .limit(50);

      if (filter === "mine") {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (distanceMeters: number, movingTimeSeconds: number) => {
    console.log("Calculating pace for:", { distanceMeters, movingTimeSeconds });
    if (distanceMeters === 0 || movingTimeSeconds === 0) return "N/A";
    const paceSeconds = (movingTimeSeconds / distanceMeters) * 1000;
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header with Powered by Strava */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bảng tin</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Hoạt động chạy bộ 30 ngày gần đây</p>

            {/* Powered by Strava Badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-600">Powered by</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill={STRAVA_ORANGE}>
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <span
                className="text-xs font-semibold"
                style={{ color: STRAVA_ORANGE }}
              >
                Strava
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("following")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "following"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Đang theo dõi
            </button>
            <button
              onClick={() => setFilter("mine")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "mine"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Của tôi
            </button>
          </div>
        </div>

        {/* Activities Feed */}
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Chưa có hoạt động nào
              </h3>
              <p className="text-gray-600">
                Các hoạt động chạy bộ từ Strava 30 ngày gần đây sẽ hiển thị ở
                đây
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* User Info */}
                <div className="p-4 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {activity.users.avatar_url ? (
                      <img
                        src={activity.users.avatar_url}
                        alt={
                          activity.users.full_name || activity.users.username
                        }
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      activity.users.full_name?.[0] ||
                      activity.users.username?.[0] ||
                      "U"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {activity.users.full_name || activity.users.username}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(
                          new Date(activity.start_date_local),
                          "dd MMM yyyy, HH:mm",
                          { locale: vi },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Strava Link - REQUIRED */}
                  <a
                    href={`https://www.strava.com/activities/${activity.strava_activity_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ color: STRAVA_ORANGE }}
                  >
                    <span>View on Strava</span>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                  </a>
                </div>

                {/* Activity Details */}
                <div className="px-4 pb-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-3">
                    {activity.name}
                  </h4>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {(activity.distance / 1000).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">km</div>
                    </div>
                    <div className="text-center border-l border-r border-gray-200">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="h-4 w-4 text-gray-500 mr-1" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatDuration(activity.moving_time)}
                      </div>
                      <div className="text-xs text-gray-500">thời gian</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 text-gray-500 mr-1" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatPace(activity.distance, activity.moving_time)}
                      </div>
                      <div className="text-xs text-gray-500">pace</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
