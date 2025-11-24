"use client";

import { useEffect, useState } from "react";
import { Calendar, Users, Activity, TrendingUp } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalUsers: 0,
    totalActivities: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total events
      const { count: totalEvents } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });

      // Get active events
      const { count: activeEvents } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .lte("start_date", today)
        .gte("end_date", today);

      // Get total users
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get total activities
      const { count: totalActivities } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true });

      setStats({
        totalEvents: totalEvents || 0,
        activeEvents: activeEvents || 0,
        totalUsers: totalUsers || 0,
        totalActivities: totalActivities || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Tổng quan hệ thống Running Club</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng sự kiện"
          value={stats.totalEvents}
          icon={<Calendar className="h-8 w-8" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Sự kiện đang diễn ra"
          value={stats.activeEvents}
          icon={<TrendingUp className="h-8 w-8" />}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Thành viên"
          value={stats.totalUsers}
          icon={<Users className="h-8 w-8" />}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Hoạt động"
          value={stats.totalActivities}
          icon={<Activity className="h-8 w-8" />}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            href="/admin/events/create"
            label="Tạo sự kiện mới"
            icon={<Calendar className="h-5 w-5" />}
          />
          <QuickActionButton
            href="/admin/teams/create"
            label="Tạo đội mới"
            icon={<Users className="h-5 w-5" />}
          />
          <QuickActionButton
            href="/admin/strava"
            label="Cấu hình Strava"
            icon={<Activity className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Recent Activity - Placeholder */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Hoạt động gần đây
        </h2>
        <div className="text-gray-500 text-center py-8">Đang phát triển...</div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange";
  loading: boolean;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-600 font-medium mb-1">{title}</h3>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
      ) : (
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      )}
    </div>
  );
}

function QuickActionButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
    >
      <div className="flex-shrink-0 text-blue-600">{icon}</div>
      <span className="font-medium text-gray-900">{label}</span>
    </a>
  );
}
