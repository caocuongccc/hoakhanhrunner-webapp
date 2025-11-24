"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Plus, Edit, Trash2, Users, Eye } from "lucide-react";
import { createSupabaseClient, Event } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "ongoing" | "past">(
    "all"
  );
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase.from("events").select("*");

      if (filter === "upcoming") {
        query = query.gt("start_date", today);
      } else if (filter === "ongoing") {
        query = query.lte("start_date", today).gte("end_date", today);
      } else if (filter === "past") {
        query = query.lt("end_date", today);
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

  const getEventStatus = (event: Event) => {
    const today = new Date().toISOString().split("T")[0];
    const start = event.start_date;
    const end = event.end_date;

    if (today < start) return { label: "Sắp diễn ra", color: "blue" };
    if (today >= start && today <= end)
      return { label: "Đang diễn ra", color: "green" };
    return { label: "Đã kết thúc", color: "gray" };
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
        <div className="flex space-x-2">
          {(["all", "upcoming", "ongoing", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f === "all" && "Tất cả"}
              {f === "upcoming" && "Sắp diễn ra"}
              {f === "ongoing" && "Đang diễn ra"}
              {f === "past" && "Đã kết thúc"}
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
          <p className="text-gray-500 text-lg mb-4">Chưa có sự kiện nào</p>
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
          {events.map((event) => {
            const status = getEventStatus(event);
            return (
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
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          status.color === "green"
                            ? "bg-green-100 text-green-800"
                            : status.color === "blue"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {status.label}
                      </span>
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
                          {format(new Date(event.start_date), "dd/MM/yyyy", {
                            locale: vi,
                          })}{" "}
                          -{" "}
                          {format(new Date(event.end_date), "dd/MM/yyyy", {
                            locale: vi,
                          })}
                        </span>
                      </div>
                      {event.event_type === "team" &&
                        event.max_team_members && (
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>
                              Tối đa {event.max_team_members} người/đội
                            </span>
                          </div>
                        )}
                    </div>
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
