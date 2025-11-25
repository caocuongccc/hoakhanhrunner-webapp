"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Users,
  Lock,
  Info,
  UserPlus,
  CheckCircle,
} from "lucide-react";
import { createSupabaseClient, Event } from "@/lib/supabase";
import { format, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import EventDashboard from "@/components/EventDashboard";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createSupabaseClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipating, setIsParticipating] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [teams, setTeams] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setEvent(data);

      // Load participant count
      const { count } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      setParticipantCount(count || 0);

      // Check if user is participating
      if (user) {
        const { data: participant } = await supabase
          .from("event_participants")
          .select("*")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .single();
        setIsParticipating(!!participant);
      }

      // Load teams if team event
      if (data.event_type === "team") {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("*, users!teams_captain_id_fkey(username)")
          .eq("event_id", eventId);
        setTeams(teamsData || []);
      }

      // Load rules
      const { data: eventRules } = await supabase
        .from("event_rules")
        .select("*, rules(*)")
        .eq("event_id", eventId);
      setRules(eventRules?.map((er) => er.rules) || []);
    } catch (error) {
      console.error("Error loading event:", error);
      alert("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setShowJoinModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Không tìm thấy sự kiện</p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const isOngoing = today >= event.start_date && today <= event.end_date;
  const isUpcoming = today < event.start_date;
  const isEnded = today > event.end_date;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/events"
        className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Quay lại danh sách sự kiện</span>
      </Link>

      {/* Event Header */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Cover Image */}
        {event.image_url && (
          <div className="h-64 md:h-96 overflow-hidden">
            <img
              src={event.image_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {event.name}
              </h1>

              {/* Status Badges */}
              <div className="flex items-center space-x-2 mb-4">
                {isOngoing && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    Đang diễn ra
                  </span>
                )}
                {isUpcoming && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    Sắp diễn ra
                  </span>
                )}
                {isEnded && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                    Đã kết thúc
                  </span>
                )}
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                  {event.event_type === "team" ? "Theo đội" : "Cá nhân"}
                </span>
                {event.password && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold inline-flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    Có mật khẩu
                  </span>
                )}
              </div>

              {/* Event Info */}
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
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
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>{participantCount} người đã tham gia</span>
                </div>
              </div>
            </div>

            {/* Join Button */}
            {!isEnded && (
              <div className="ml-6">
                {isParticipating ? (
                  <div className="px-6 py-3 bg-green-50 text-green-700 rounded-lg flex items-center space-x-2 border border-green-200">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Đã tham gia</span>
                  </div>
                ) : (
                  <button
                    onClick={handleJoinClick}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Tham gia ngay</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="prose max-w-none">
              <p className="text-gray-700 text-lg">{event.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rules */}
      {rules.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Info className="h-6 w-6 mr-2 text-blue-600" />
            Luật chơi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {rule.name}
                </h3>
                <p className="text-sm text-gray-600">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams List (for team events) */}
      {event.event_type === "team" && teams.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Các đội tham gia
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <h3 className="font-bold text-gray-900 mb-2">{team.name}</h3>
                <p className="text-sm text-gray-600">
                  Đội trưởng: {team.users.username}
                </p>
                <p className="text-sm text-gray-600">
                  Điểm: {team.total_points.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Bảng xếp hạng</h2>
        <EventDashboard eventId={eventId} eventType={event.event_type} />
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <JoinEventModal
          event={event}
          teams={teams}
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            setIsParticipating(true);
            loadEvent();
          }}
        />
      )}
    </div>
  );
}

function JoinEventModal({
  event,
  teams,
  onClose,
  onSuccess,
}: {
  event: Event;
  teams: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const supabase = createSupabaseClient();
  const [password, setPassword] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!user) return;

    setError("");
    setLoading(true);

    try {
      // Check password
      if (event.password && password !== event.password) {
        setError("Mật khẩu không đúng!");
        setLoading(false);
        return;
      }

      // Check team selection for team events
      if (event.event_type === "team" && !selectedTeam) {
        setError("Vui lòng chọn đội!");
        setLoading(false);
        return;
      }

      // Add to event_participants
      const { error: participantError } = await supabase
        .from("event_participants")
        .insert([
          {
            event_id: event.id,
            user_id: user.id,
            team_id: selectedTeam || null,
          },
        ]);

      if (participantError) throw participantError;

      // Add to team_members if team event
      if (selectedTeam) {
        const { error: memberError } = await supabase
          .from("team_members")
          .insert([
            {
              team_id: selectedTeam,
              user_id: user.id,
            },
          ]);

        if (memberError) throw memberError;
      }

      alert("Tham gia sự kiện thành công!");
      onSuccess();
    } catch (error: any) {
      console.error("Error joining event:", error);
      setError(error.message || "Không thể tham gia sự kiện");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Tham gia sự kiện
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Password Input */}
        {event.password && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu sự kiện
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập mật khẩu"
            />
          </div>
        )}

        {/* Team Selection */}
        {event.event_type === "team" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn đội
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Chọn đội --</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleJoin}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Tham gia"}
          </button>
        </div>
      </div>
    </div>
  );
}
