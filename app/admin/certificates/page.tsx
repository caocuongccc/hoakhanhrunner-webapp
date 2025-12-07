// app/admin/certificates/page.tsx - FIXED VERSION
"use client";

import { useState, useEffect } from "react";
import { Award, Download, FileText, Users, Calendar, Eye } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import CertificatePreview from "@/components/CertificatePreview";
import Link from "next/link";

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

type Template = {
  id: string;
  name: string;
  description: string;
  pdf_url: string;
  fields_config: any[];
  is_active: boolean;
};

export default function AdminCertificatesPage() {
  const supabase = createSupabaseClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedEventData, setSelectedEventData] = useState<Event | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    loadEvents();
    loadTemplates();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const now = new Date();

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("event_type", "individual")
        .lt("end_date", now.toISOString())
        .order("end_date", { ascending: false });

      if (error) throw error;

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

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplate(data[0].id);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEvent(eventId);
    setLoading(true);

    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      setSelectedEventData(event);

      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const totalDays =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

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

      const participantsWithStats = await Promise.all(
        (participantsData || []).map(async (p) => {
          const { data: activities } = await supabase
            .from("activities")
            .select("activity_date, pace_min_per_km")
            .eq("event_id", eventId)
            .eq("user_id", p.user_id)
            .gt("points_earned", 0);

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

  const handlePreview = (participant: Participant) => {
    if (!selectedEventData) return;

    setPreviewData({
      athleteName: participant.full_name || participant.username,
      eventName: selectedEventData.name,
      activeDays: participant.active_days,
      totalDays: participant.total_days,
      totalDistance: participant.total_distance,
      averagePace: participant.average_pace,
      completionDate: format(
        new Date(selectedEventData.end_date),
        "MMMM dd, yyyy",
        { locale: vi }
      ),
      templateId: selectedTemplate, // ADDED: Pass template ID
    });
  };

  const handleGenerateAll = async () => {
    if (!selectedEvent || !selectedTemplate) {
      alert("Vui lòng chọn sự kiện và template!");
      return;
    }

    if (!confirm(`Tạo ${participants.length} chứng chỉ và tải về file ZIP?`)) {
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(
        `/api/events/${selectedEvent}/generate-certificates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template_id: selectedTemplate }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate certificates");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificates-${selectedEvent}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`Đã tạo và tải xuống ${participants.length} chứng chỉ thành công!`);
    } catch (error: any) {
      console.error("Error generating certificates:", error);
      alert("Không thể tạo chứng chỉ: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Quản lý chứng chỉ
          </h1>
          <p className="text-gray-600 mt-1">
            Xem trước và tạo chứng chỉ cho người tham gia sự kiện cá nhân đã kết
            thúc
          </p>
        </div>

        <Link
          href="/admin/certificates/templates"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <FileText className="h-5 w-5" />
          Quản lý Templates
        </Link>
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

      {/* Template Selection */}
      {selectedEvent && templates.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Chọn template chứng chỉ
          </h2>

          {templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Chưa có template nào</p>
              <Link
                href="/admin/certificates/templates"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FileText className="h-5 w-5" />
                Tạo Template Đầu Tiên
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`text-left p-4 border-2 rounded-lg transition-all ${
                    selectedTemplate === template.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FileText
                      className={`h-8 w-8 ${
                        selectedTemplate === template.id
                          ? "text-purple-600"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-xs text-gray-600">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {template.fields_config?.length || 0} trường dữ liệu
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warning if no template selected */}
      {selectedEvent && templates.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            ⚠️ Bạn cần tạo ít nhất 1 template trước khi generate certificates.
            <Link
              href="/admin/certificates/templates"
              className="underline font-medium ml-1"
            >
              Tạo template ngay
            </Link>
          </p>
        </div>
      )}

      {/* Participants List */}
      {selectedEvent && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Danh sách người tham gia
            </h2>
            <button
              onClick={handleGenerateAll}
              disabled={
                generating || participants.length === 0 || !selectedTemplate
              }
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Tạo tất cả & Tải ZIP</span>
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
              <p className="text-gray-500">Chưa có người tham gia hợp lệ</p>
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
                        <button
                          onClick={() => handlePreview(participant)}
                          disabled={!selectedTemplate}
                          className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Xem trước</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <CertificatePreview
          data={previewData}
          templateId={previewData.templateId}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}
