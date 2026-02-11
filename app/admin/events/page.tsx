// app/admin/events/page.tsx - WITH STATUS MANAGEMENT
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import { createSupabaseClient, Event } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type EventWithStatus = Event & {
  status: "pending" | "active" | "completed" | "cancelled";
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "active" | "completed" | "cancelled"
  >("all");
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let query = supabase.from("events").select("*");

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query.order("start_date", {
        ascending: false,
      });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (
    eventId: string,
    newStatus: "pending" | "active" | "completed" | "cancelled",
  ) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", eventId);

      if (error) throw error;

      alert(`Đã cập nhật trạng thái sự kiện thành "${newStatus}"`);
      loadEvents();
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert("Không thể cập nhật trạng thái: " + error.message);
    }
  };

  const deleteEvent = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa sự kiện "${name}"?`)) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;

      setEvents(events.filter((e) => e.id !== id));
      alert("Đã xóa sự kiện thành công!");
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Không thể xóa sự kiện!");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: {
        label: "Chờ bắt đầu",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      active: {
        label: "Đang diễn ra",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      completed: {
        label: "Đã kết thúc",
        color: "bg-gray-100 text-gray-800",
        icon: CheckCircle,
      },
      cancelled: {
        label: "Đã hủy",
        color: "bg-red-100 text-red-800",
        icon: XCircle,
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}
      >
        <Icon className="h-4 w-4" />
        <span>{badge.label}</span>
      </span>
    );
  };

  const downloadCSV = async (eventId: string) => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/export?format=csv&type=all`,
      );
      if (!res.ok) throw new Error("Failed" + res.statusText);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `event_${eventId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("❌ Error downloading JSON: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý sự kiện</h1>
          <p className="text-gray-600 mt-1">
            Tạo và quản lý các sự kiện chạy bộ
          </p>
        </div>
        <Link
          href="/admin/events/create"
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Tạo sự kiện mới</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex space-x-2 overflow-x-auto">
          {(
            ["all", "pending", "active", "completed", "cancelled"] as const
          ).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f === "all" && "Tất cả"}
              {f === "pending" && "Chờ bắt đầu"}
              {f === "active" && "Đang diễn ra"}
              {f === "completed" && "Đã kết thúc"}
              {f === "cancelled" && "Đã hủy"}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">
            {filter === "all"
              ? "Chưa có sự kiện nào"
              : `Không có sự kiện ${filter}`}
          </p>
          <Link
            href="/admin/events/create"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Tạo sự kiện đầu tiên</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {event.name}
                    </h3>
                    {getStatusBadge(event.status)}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        event.event_type === "team"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {event.event_type === "team" ? "Theo đội" : "Cá nhân"}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-gray-600 mb-3">{event.description}</p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(
                          new Date(event.start_date),
                          "dd/MM/yyyy HH:mm",
                          { locale: vi },
                        )}
                        {" - "}
                        {format(new Date(event.end_date), "dd/MM/yyyy HH:mm", {
                          locale: vi,
                        })}
                      </span>
                    </div>
                    {event.event_type === "team" && event.max_team_members && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Tối đa {event.max_team_members} người/đội</span>
                      </div>
                    )}
                  </div>

                  {/* Status Actions */}
                  {event.status !== "cancelled" && (
                    <div className="mt-4 flex items-center space-x-2">
                      {event.status === "pending" && (
                        <button
                          onClick={() => updateEventStatus(event.id, "active")}
                          className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Kích hoạt ngay
                        </button>
                      )}
                      {event.status === "active" && (
                        <button
                          onClick={() =>
                            updateEventStatus(event.id, "completed")
                          }
                          className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Đánh dấu hoàn thành
                        </button>
                      )}
                      <button
                        onClick={() => updateEventStatus(event.id, "cancelled")}
                        className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Hủy sự kiện
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    href={`/events/${event.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/admin/events/edit/${event.id}`}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => deleteEvent(event.id, event.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>

                  <button onClick={() => downloadCSV(event.id)}>
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
