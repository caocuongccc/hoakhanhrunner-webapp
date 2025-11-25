"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Trophy,
  MapPin,
  Clock,
  TrendingUp,
  Activity as ActivityIcon,
  RefreshCw,
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

type Activity = {
  id: string;
  activity_date: string;
  distance_km: number;
  duration_seconds: number;
  pace_min_per_km: number;
  points_earned: number;
  description: string;
  events: {
    id: string;
    name: string;
  };
};

export default function ActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [view, setView] = useState<"my-events" | "my-activities" | "account">(
    "my-events"
  );
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalDistance: 0,
    totalPoints: 0,
    eventsCount: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === "my-events") {
        await loadMyEvents();
      } else if (view === "my-activities") {
        await loadMyActivities();
      }
      await loadStats();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyEvents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("event_participants")
      .select(
        `
        *,
        events(*),
        teams(name)
      `
      )
      .eq("user_id", user.id)
      .order("events(start_date)", { ascending: false });

    if (error) throw error;
    setMyEvents(data || []);
  };

  const loadMyActivities = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("activities")
      .select(
        `
        *,
        events(id, name)
      `
      )
      .eq("user_id", user.id)
      .order("activity_date", { ascending: false })
      .limit(50);

    if (error) throw error;
    setActivities(data || []);
  };

  const loadStats = async () => {
    if (!user) return;

    // Total activities
    const { count: activityCount } = await supabase
      .from("activities")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Total distance and points
    const { data: activitiesData } = await supabase
      .from("activities")
      .select("distance_km, points_earned")
      .eq("user_id", user.id);

    const totalDistance =
      activitiesData?.reduce((sum, a) => sum + (a.distance_km || 0), 0) || 0;
    const totalPoints =
      activitiesData?.reduce((sum, a) => sum + (a.points_earned || 0), 0) || 0;

    // Events count
    const { count: eventsCount } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setStats({
      totalActivities: activityCount || 0,
      totalDistance,
      totalPoints,
      eventsCount: eventsCount || 0,
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/strava/sync-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, perPage: 30 }),
      });
      const data = await response.json();

      if (data.success) {
        alert(`Đã đồng bộ ${data.data.running} hoạt động!`);
        loadData();
      } else {
        alert("Không thể đồng bộ: " + data.error);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Không thể đồng bộ hoạt động");
    } finally {
      setSyncing(false);
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

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hoạt động của tôi
          </h1>
          <p className="text-gray-600 mt-1">
            Quản lý sự kiện và hoạt động chạy bộ
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Đang đồng bộ..." : "Đồng bộ Strava"}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={<ActivityIcon className="h-6 w-6" />}
          label="Hoạt động"
          value={stats.totalActivities}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Tổng km"
          value={stats.totalDistance.toFixed(1)}
          color="green"
        />
        <StatCard
          icon={<Trophy className="h-6 w-6" />}
          label="Điểm"
          value={stats.totalPoints.toFixed(0)}
          color="yellow"
        />
        <StatCard
          icon={<Calendar className="h-6 w-6" />}
          label="Sự kiện"
          value={stats.eventsCount}
          color="purple"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setView("my-events")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            view === "my-events"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Sự kiện của tôi
        </button>
        <button
          onClick={() => setView("my-activities")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            view === "my-activities"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Hoạt động của tôi
        </button>
        <button
          onClick={() => setView("account")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            view === "account"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Thông tin tài khoản
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {view === "my-events" && <MyEventsView events={myEvents} />}
          {view === "my-activities" && (
            <MyActivitiesView
              activities={activities}
              formatDuration={formatDuration}
            />
          )}
          {view === "account" && (
            <AccountView user={user} onUpdate={loadData} />
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MyEventsView({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-4">
          Bạn chưa tham gia sự kiện nào
        </p>
        <Link
          href="/events"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
        >
          Khám phá sự kiện
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {events.map((participation) => {
        const event = participation.events;
        const today = new Date().toISOString().split("T")[0];
        const isOngoing = today >= event.start_date && today <= event.end_date;

        return (
          <div
            key={participation.id}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {event.name}
                </h3>
                <div className="flex items-center space-x-2 mb-3">
                  {isOngoing ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      Đang diễn ra
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                      Đã kết thúc
                    </span>
                  )}
                  {participation.teams && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                      {participation.teams.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tổng km:</span>
                <span className="font-bold text-gray-900">
                  {participation.total_km.toFixed(2)} km
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Điểm:</span>
                <span className="font-bold text-blue-600">
                  {participation.total_points.toFixed(2)}
                </span>
              </div>
            </div>

            <Link
              href={`/events/${event.id}`}
              className="block w-full py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
            >
              Xem chi tiết
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function MyActivitiesView({
  activities,
  formatDuration,
}: {
  activities: Activity[];
  formatDuration: (seconds: number) => string;
}) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <ActivityIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-2">Chưa có hoạt động nào</p>
        <p className="text-gray-400 text-sm">
          Hoạt động từ Strava sẽ tự động đồng bộ về đây
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {activity.description || "Chạy bộ"}
                </h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  {activity.events.name}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(activity.activity_date), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(activity.duration_seconds)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Khoảng cách</p>
                  <p className="text-lg font-bold text-gray-900">
                    {activity.distance_km.toFixed(2)} km
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pace</p>
                  <p className="text-lg font-bold text-gray-900">
                    {activity.pace_min_per_km
                      ? activity.pace_min_per_km.toFixed(2)
                      : "-"}{" "}
                    min/km
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Điểm</p>
                  <p className="text-lg font-bold text-blue-600">
                    {activity.points_earned.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountView({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const supabase = createSupabaseClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username || "",
    full_name: user.full_name || "",
    pr_5k: user.pr_5k || "",
    pr_10k: user.pr_10k || "",
    pr_hm: user.pr_hm || "",
    pr_fm: user.pr_fm || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update(formData)
        .eq("id", user.id);

      if (error) throw error;

      alert("Cập nhật thông tin thành công!");
      setEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert("Không thể cập nhật: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Thông tin tài khoản
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors"
          >
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-600">
                {user.username?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.username}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên hiển thị
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              disabled={!editing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Thành tích cá nhân (PR)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  5K
                </label>
                <input
                  type="text"
                  value={formData.pr_5k}
                  onChange={(e) =>
                    setFormData({ ...formData, pr_5k: e.target.value })
                  }
                  disabled={!editing}
                  placeholder="VD: 25:30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  10K
                </label>
                <input
                  type="text"
                  value={formData.pr_10k}
                  onChange={(e) =>
                    setFormData({ ...formData, pr_10k: e.target.value })
                  }
                  disabled={!editing}
                  placeholder="VD: 52:00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Half Marathon
                </label>
                <input
                  type="text"
                  value={formData.pr_hm}
                  onChange={(e) =>
                    setFormData({ ...formData, pr_hm: e.target.value })
                  }
                  disabled={!editing}
                  placeholder="VD: 1:55:00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Marathon
                </label>
                <input
                  type="text"
                  value={formData.pr_fm}
                  onChange={(e) =>
                    setFormData({ ...formData, pr_fm: e.target.value })
                  }
                  disabled={!editing}
                  placeholder="VD: 4:15:00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {editing && (
          <div className="flex items-center space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setEditing(false);
                setFormData({
                  username: user.username || "",
                  full_name: user.full_name || "",
                  pr_5k: user.pr_5k || "",
                  pr_10k: user.pr_10k || "",
                  pr_hm: user.pr_hm || "",
                  pr_fm: user.pr_fm || "",
                });
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
