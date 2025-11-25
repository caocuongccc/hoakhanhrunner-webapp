"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, Edit, Trash2, UserPlus } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  event_id: string;
  captain_id: string;
  total_points: number;
  events: {
    name: string;
    event_type: string;
  };
  users: {
    username: string;
    avatar_url: string;
  };
  member_count: number;
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadEvents();
    loadTeams();
  }, []);

  useEffect(() => {
    loadTeams();
  }, [filter]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name")
        .eq("event_type", "team")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadTeams = async () => {
    setLoading(true);
    try {
      let query = supabase.from("teams").select(`
          *,
          events!inner(name, event_type)
        `);

      if (filter !== "all") {
        query = query.eq("event_id", filter);
      }

      const { data: teamsData, error } = await query.order("total_points", {
        ascending: false,
      });

      if (error) throw error;

      // Get member count for each team
      const teamsWithCount = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);

          return {
            ...team,
            member_count: count || 0,
          };
        })
      );

      setTeams(teamsWithCount);
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (id: string, name: string) => {
    if (
      !confirm(
        `Bạn có chắc muốn xóa đội "${name}"? Tất cả thành viên sẽ bị xóa khỏi đội.`
      )
    )
      return;

    try {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;

      setTeams(teams.filter((t) => t.id !== id));
      alert("Đã xóa đội thành công!");
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("Không thể xóa đội!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý đội</h1>
          <p className="text-gray-600 mt-1">Tạo và quản lý các đội thi đấu</p>
        </div>
        <Link
          href="/admin/teams/create"
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Tạo đội mới</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tất cả
          </button>
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => setFilter(event.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === event.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {event.name}
            </button>
          ))}
        </div>
      </div>

      {/* Teams List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Chưa có đội nào</p>
          <Link
            href="/admin/teams/create"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Tạo đội đầu tiên</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-600">{team.events.name}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <Link
                    href={`/admin/teams/edit/${team.id}`}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => deleteTeam(team.id, team.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Thành viên</p>
                    <p className="text-lg font-bold text-gray-900">
                      {team.member_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Điểm</p>
                    <p className="text-lg font-bold text-blue-600">
                      {team.total_points.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <Link
                  href={`/admin/teams/${team.id}/members`}
                  className="flex items-center justify-center space-x-2 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Quản lý thành viên</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
