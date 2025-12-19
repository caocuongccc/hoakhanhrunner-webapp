"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Users, Award, ArrowRight, Activity } from "lucide-react";
import { createSupabaseClient, Event } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("end_date", today)
        // .filter("status", "active")
        .eq("status", "active")
        .order("start_date", { ascending: true })
        .limit(6);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-8 md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Chào mừng đến với Hòa Khánh Runners!
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            Cộng đồng chạy bộ nhiệt huyết - Kết nối, thi đấu và vượt qua giới
            hạn bản thân
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/events"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Xem tất cả sự kiện
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors border-2 border-white"
            >
              Tham gia ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Calendar className="h-8 w-8" />}
          title="Sự kiện"
          value={events.length.toString()}
          description="Đang hoặc sắp diễn ra"
          color="blue"
        />
        <StatCard
          icon={<Users className="h-8 w-8" />}
          title="Vận động viên"
          value="200+"
          description="Thành viên tích cực"
          color="green"
        />
        <StatCard
          icon={<Award className="h-8 w-8" />}
          title="Cự ly"
          value="10,000+"
          description="Km đã hoàn thành"
          color="purple"
        />
      </section>

      {/* Events Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Sự kiện đang diễn ra
          </h2>
          <Link
            href="/events"
            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center"
          >
            Xem tất cả
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
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
            <p className="text-gray-500 text-lg">
              Chưa có sự kiện nào đang diễn ra
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  color: "blue" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-600 font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const today = new Date();
  const isOngoing = startDate <= today && today <= endDate;
  const isUpcoming = startDate > today;

  return (
    <Link href={`/events/${event.id}`}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
        {/* Event Image */}
        <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-20 w-20 text-white opacity-50" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isOngoing ? (
              <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                Đang diễn ra
              </span>
            ) : isUpcoming ? (
              <span className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
                Sắp diễn ra
              </span>
            ) : null}
          </div>
        </div>

        {/* Event Details */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {event.name}
          </h3>

          <div className="flex items-center text-gray-600 mb-2">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {format(startDate, "dd/MM/yyyy", { locale: vi })} -{" "}
              {format(endDate, "dd/MM/yyyy", { locale: vi })}
            </span>
          </div>

          <div className="flex items-center text-gray-600 mb-4">
            <Users className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {event.event_type === "team" ? "Thi đấu theo đội" : "Cá nhân"}
            </span>
          </div>

          {event.description && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-4">
              {event.description}
            </p>
          )}

          <button className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Xem chi tiết
          </button>
        </div>
      </div>
    </Link>
  );
}
