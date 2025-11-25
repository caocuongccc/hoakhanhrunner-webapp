"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Award, Users, TrendingUp } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";

type TeamRanking = {
  id: string;
  name: string;
  total_points: number;
  total_km: number;
  member_count: number;
};

type IndividualRanking = {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  team_name?: string;
  total_km: number;
  total_points: number;
  activities_count: number;
};

type EventDashboardProps = {
  eventId: string;
  eventType: "team" | "individual";
};

export default function EventDashboard({
  eventId,
  eventType,
}: EventDashboardProps) {
  const [view, setView] = useState<"team" | "individual">(
    eventType === "team" ? "team" : "individual"
  );
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const [individualRankings, setIndividualRankings] = useState<
    IndividualRanking[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadRankings();
  }, [eventId, view, selectedTeam]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      if (view === "team" && eventType === "team") {
        await loadTeamRankings();
      } else {
        await loadIndividualRankings();
      }
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamRankings = async () => {
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .eq("event_id", eventId)
      .order("total_points", { ascending: false });

    if (error) throw error;

    // Get member count and total km for each team
    const teamsWithStats = await Promise.all(
      (teams || []).map(async (team) => {
        const { count } = await supabase
          .from("team_members")
          .select("*", { count: "exact", head: true })
          .eq("team_id", team.id);

        const { data: activities } = await supabase
          .from("activities")
          .select("distance_km, user_id")
          .eq("event_id", eventId)
          .in("user_id", [
            supabase
              .from("team_members")
              .select("user_id")
              .eq("team_id", team.id),
          ]);

        const totalKm =
          activities?.reduce((sum, a) => sum + (a.distance_km || 0), 0) || 0;

        return {
          ...team,
          member_count: count || 0,
          total_km: totalKm,
        };
      })
    );

    setTeamRankings(teamsWithStats);
  };

  const loadIndividualRankings = async () => {
    let query = supabase
      .from("event_participants")
      .select(
        `
        user_id,
        total_km,
        total_points,
        team_id,
        users!event_participants_user_id_fkey(username, full_name, avatar_url),
        teams(name)
      `
      )
      .eq("event_id", eventId);

    if (selectedTeam) {
      query = query.eq("team_id", selectedTeam);
    }

    const { data, error } = await query.order("total_points", {
      ascending: false,
    });

    if (error) throw error;

    // Get activity count for each participant
    const participantsWithCount = await Promise.all(
      (data || []).map(async (participant) => {
        const { count } = await supabase
          .from("activities")
          .select("*", { count: "exact", head: true })
          .eq("user_id", participant.user_id)
          .eq("event_id", eventId);

        return {
          user_id: participant.user_id,
          username: participant.users.username,
          full_name: participant.users.full_name,
          avatar_url: participant.users.avatar_url,
          team_name: participant.teams?.name,
          total_km: participant.total_km || 0,
          total_points: participant.total_points || 0,
          activities_count: count || 0,
        };
      })
    );

    setIndividualRankings(participantsWithCount);
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      {eventType === "team" && (
        <div className="flex justify-center">
          <div className="inline-flex bg-white rounded-lg shadow-md p-1">
            <button
              onClick={() => {
                setView("team");
                setSelectedTeam(null);
              }}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                view === "team"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Xếp hạng đội
            </button>
            <button
              onClick={() => setView("individual")}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                view === "individual"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Xếp hạng cá nhân
            </button>
          </div>
        </div>
      )}

      {/* Team Filter (for individual view in team events) */}
      {eventType === "team" &&
        view === "individual" &&
        teamRankings.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedTeam(null)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                !selectedTeam
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Tất cả
            </button>
            {teamRankings.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedTeam === team.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        )}

      {/* Rankings */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : view === "team" ? (
        <TeamRankingsTable
          rankings={teamRankings}
          getMedalIcon={getMedalIcon}
        />
      ) : (
        <IndividualRankingsTable
          rankings={individualRankings}
          getMedalIcon={getMedalIcon}
        />
      )}
    </div>
  );
}

function TeamRankingsTable({
  rankings,
  getMedalIcon,
}: {
  rankings: TeamRanking[];
  getMedalIcon: (rank: number) => React.ReactNode;
}) {
  if (rankings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Chưa có đội nào tham gia</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hạng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đội
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thành viên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tổng km
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Điểm
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rankings.map((team, index) => (
              <tr key={team.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getMedalIcon(index + 1) || (
                      <span className="text-lg font-bold text-gray-600 w-6 text-center">
                        {index + 1}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{team.name}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{team.member_count}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-gray-600">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      {team.total_km.toFixed(2)} km
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-lg font-bold text-blue-600">
                    {team.total_points.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IndividualRankingsTable({
  rankings,
  getMedalIcon,
}: {
  rankings: IndividualRanking[];
  getMedalIcon: (rank: number) => React.ReactNode;
}) {
  if (rankings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Chưa có người tham gia</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hạng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vận động viên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hoạt động
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tổng km
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Điểm
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rankings.map((participant, index) => (
              <tr key={participant.user_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getMedalIcon(index + 1) || (
                      <span className="text-lg font-bold text-gray-600 w-6 text-center">
                        {index + 1}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                      {participant.avatar_url ? (
                        <img
                          src={participant.avatar_url}
                          alt={participant.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-bold">
                          {participant.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {participant.username}
                      </p>
                      {participant.team_name && (
                        <p className="text-xs text-gray-500">
                          {participant.team_name}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-600">
                    {participant.activities_count}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">
                    {participant.total_km.toFixed(2)} km
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-lg font-bold text-blue-600">
                    {participant.total_points.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
