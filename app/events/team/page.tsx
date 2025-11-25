"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  Clock,
  Lock,
  Activity as ActivityIcon,
} from "lucide-react";
import { createSupabaseClient, Event } from "@/lib/supabase";
import { format, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";

export default function TeamEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "ongoing">("all");
  const [eventTeamCounts, setEventTeamCounts] = useState<{
    [key: string]: number;
  }>({});
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("events")
        .select("*")
        .eq("event_type", "team")
        .gte("end_date", today);

      if (filter === "upcoming") {
        query = query.gt("start_date", today);
      } else if (filter === "ongoing") {
        query = query.lte("start_date", today).gte("end_date", today);
      }

      const { data, error } = await query.order("start_date", {
        ascending: true,
      });
      if (error) throw error;

      const counts: { [key: string]: number } = {};
      for (const event of data || []) {
        const { count } = await supabase
          .from("teams")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);
        counts[event.id] = count || 0;
      }
      setEventTeamCounts(counts);
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: Event) => {
    const today = new Date().toISOString().split("T")[0];
    const start = event.start_date;
    const end = event.end_date;

    if (today < start) {
      const daysUntil = differenceInDays(new Date(start), new Date(today));
      return {
        label: daysUntil === 0 ? "Bắt đầu hôm nay" : `Còn ${daysUntil} ngày`,
        color: "blue",
        icon: Clock,
      };
    }
    if (today >= start && today <= end) {
      const daysLeft = differenceInDays(new Date(end), new Date(today));
      return {
        label: daysLeft === 0 ? "Kết thúc hôm nay" : `Còn ${daysLeft} ngày`,
        color: "green",
        icon: ActivityIcon,
      };
    }
    return { label: "Đã kết thúc", color: "gray", icon: Calendar };
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Sự kiện đội</h1>
        <p className="text-xl text-gray-600">
          Thi đấu theo nhóm, chiến thắng cùng đội
        </p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex bg-white rounded-lg shadow-md p-1">
          {(["all", "ongoing", "upcoming"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f === "all" && "Tất cả"}
              {f === "ongoing" && "Đang diễn ra"}
              {f === "upcoming" && "Sắp diễn ra"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse"
            >
              <div className="h-48 bg-gray-200" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Không có sự kiện đội nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const status = getEventStatus(event);
            const StatusIcon = status.icon;

            return (
              <Link key={event.id} href={`/events/${event.id}`}>
                <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer h-full flex flex-col">
                  <div className="relative h-48 bg-gradient-to-br from-purple-400 to-purple-600">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Users className="h-20 w-20 text-white opacity-50" />
                      </div>
                    )}

                    <div className="absolute top-4 right-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                          status.color === "green"
                            ? "bg-green-500 text-white"
                            : status.color === "blue"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-500 text-white"
                        }`}
                      >
                        <StatusIcon className="h-4 w-4" />
                        <span>{status.label}</span>
                      </span>
                    </div>

                    {event.password && (
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-semibold">
                          <Lock className="h-3 w-3" />
                          <span>Có mật khẩu</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {event.name}
                    </h3>
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center text-gray-600 text-sm">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
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

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          <span>Thi đấu đội</span>
                        </div>
                        <div className="text-purple-600 font-semibold">
                          {eventTeamCounts[event.id] || 0} đội
                        </div>
                      </div>

                      {event.max_team_members && (
                        <div className="text-xs text-gray-500">
                          Tối đa {event.max_team_members} người/đội
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <button className="w-full py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
