// app/admin/certificates/page.tsx - FIXED VERSION
"use client";

import { useState, useEffect } from "react";
import { Award, Download, Send, FileText, Users, Calendar } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";

type Event = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  participants_count?: number;
};

type Participant = {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  email: string;
  active_days: number;
  total_days: number;
  total_distance: number;
  average_pace: string;
};

export default function AdminCertificatesPage() {
  const supabase = createSupabaseClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("event_type", "individual")
        .lt("end_date", today)
        .order("end_date", { ascending: false });

      if (error) throw error;

      // Get participant counts
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { count } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            participants_count: count || 0,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEvent(eventId);
    setLoading(true);

    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      // Calculate total days
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const totalDays =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

      // Get participants with their stats
      const { data: participantsData, error } = await supabase
        .from("event_participants")
        .select(
          `
          user_id,
          total_km,
          total_points,
          users!event_participants_user_id_fkey(username, full_name, avatar_url, email)
        `
        )
        .eq("event_id", eventId);

      if (error) throw error;

      // Get activity stats for each participant
      const participantsWithStats = await Promise.all(
        (participantsData || []).map(async (p) => {
          const { data: activities } = await supabase
            .from("activities")
            .select("activity_date, pace_min_per_km")
            .eq("event_id", eventId)
            .eq("user_id", p.user_id);

          const activeDays = new Set(
            activities?.map((a) => a.activity_date) || []
          ).size;
          const avgPace =
            activities && activities.length > 0
              ? activities.reduce(
                  (sum, a) => sum + (a.pace_min_per_km || 0),
                  0
                ) / activities.length
              : 0;

          const paceMinutes = Math.floor(avgPace);
          const paceSeconds = Math.round((avgPace - paceMinutes) * 60);

          return {
            user_id: p.user_id,
            username: p.users.username,
            full_name: p.users.full_name,
            avatar_url: p.users.avatar_url,
            email: p.users.email,
            active_days: activeDays,
            total_days: totalDays,
            total_distance: p.total_km || 0,
            average_pace: `${paceMinutes}:${paceSeconds.toString().padStart(2, "0")}`,
          };
        })
      );

      setParticipants(participantsWithStats);
    } catch (error) {
      console.error("Error loading participants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificates = async () => {
    if (!selectedEvent) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `/api/events/${selectedEvent}/generate-certificates`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(`Đã tạo ${data.data.length} chứng chỉ thành công!`);
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (error: any) {
      console.error("Error generating certificates:", error);
      alert("Không thể tạo chứng chỉ: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chứng chỉ</h1>
        <p className="text-gray-600 mt-1">
          Tạo và gửi chứng chỉ cho người tham gia sự kiện cá nhân
        </p>
      </div>

      {/* Event Selection */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Chọn sự kiện đã kết thúc
        </h2>

        {loading && !selectedEvent ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Chưa có sự kiện cá nhân nào đã kết thúc
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(event.id)}
                className={`text-left p-4 border-2 rounded-lg transition-all ${
                  selectedEvent === event.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <h3 className="font-bold text-gray-900 mb-2">{event.name}</h3>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{event.participants_count} người tham gia</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {new Date(event.end_date).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Participants List */}
      {selectedEvent && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Danh sách người tham gia
            </h2>
            <button
              onClick={handleGenerateCertificates}
              disabled={generating}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Award className="h-5 w-5" />
                  <span>Tạo tất cả chứng chỉ</span>
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có người tham gia</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vận động viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày chạy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tổng KM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pace TB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {participants.map((participant) => (
                    <tr key={participant.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            {participant.avatar_url ? (
                              <img
                                src={participant.avatar_url}
                                alt={participant.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-blue-600 font-bold">
                                {participant.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {participant.username}
                            </p>
                            <p className="text-sm text-gray-500">
                              {participant.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">
                          {participant.active_days}/{participant.total_days}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {participant.total_distance.toFixed(1)} km
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">
                          {participant.average_pace}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm">
                            <FileText className="h-4 w-4" />
                            <span>Xem</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
