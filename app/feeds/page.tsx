// app/feeds/page.tsx - FIXED VERSION
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Activity,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Clock,
  TrendingUp,
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type ActivityFeed = {
  id: string;
  user_id: string;
  event_id: string;
  activity_date: string;
  distance_km: number;
  duration_seconds: number;
  pace_min_per_km?: number;
  description?: string;
  points_earned: number;
  created_at: string;
  users: {
    id: string;
    full_name: string;
    avatar_url?: string;
    username: string;
  };
  events: {
    id: string;
    name: string;
  };
};

export default function FeedsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [activities, setActivities] = useState<ActivityFeed[]>([]);
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

      let query = supabase
        .from("activities")
        .select(
          `
          *,
          users!activities_user_id_fkey (
            id,
            full_name,
            avatar_url,
            username
          ),
          events!activities_event_id_fkey (
            id,
            name
          )
        `
        )
        .order("activity_date", { ascending: false })
        .limit(50);

      // Filter by mine
      if (filter === "mine") {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading activities:", error);
        throw error;
      }

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

  const formatPace = (paceMinPerKm?: number) => {
    if (!paceMinPerKm) return "N/A";
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.floor((paceMinPerKm - minutes) * 60);
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bảng tin</h1>
          <p className="text-gray-600">
            Theo dõi hoạt động của cộng đồng chạy bộ
          </p>
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
                Các hoạt động chạy bộ sẽ được hiển thị ở đây
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
                      <span>
                        {format(
                          new Date(activity.activity_date),
                          "dd MMM yyyy",
                          { locale: vi }
                        )}
                      </span>
                      {activity.events && (
                        <>
                          <span>•</span>
                          <span className="truncate">
                            {activity.events.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Activity className="h-5 w-5 text-orange-500 flex-shrink-0" />
                </div>

                {/* Activity Details */}
                <div className="px-4 pb-4">
                  {activity.description && (
                    <h4 className="font-semibold text-lg text-gray-900 mb-3">
                      {activity.description}
                    </h4>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {activity.distance_km.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">km</div>
                    </div>
                    <div className="text-center border-l border-r border-gray-200">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="h-4 w-4 text-gray-500 mr-1" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatDuration(activity.duration_seconds)}
                      </div>
                      <div className="text-xs text-gray-500">thời gian</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 text-gray-500 mr-1" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatPace(activity.pace_min_per_km)}
                      </div>
                      <div className="text-xs text-gray-500">pace</div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="mt-3 flex items-center text-sm">
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">
                      {activity.points_earned.toFixed(2)} điểm
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t px-4 py-3 flex items-center justify-around text-gray-600">
                  <button className="flex items-center space-x-2 hover:text-red-500 transition-colors">
                    <Heart className="h-5 w-5" />
                    <span className="text-sm">Thích</span>
                  </button>
                  <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-sm">Bình luận</span>
                  </button>
                  <button className="flex items-center space-x-2 hover:text-green-500 transition-colors">
                    <Share2 className="h-5 w-5" />
                    <span className="text-sm">Chia sẻ</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
