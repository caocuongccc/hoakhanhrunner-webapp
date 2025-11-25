"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus, Trash2, Search, Crown } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

type Member = {
  id: string;
  user_id: string;
  users: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
};

export default function TeamMembersPage() {
  const params = useParams();
  const teamId = params.id as string;
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadTeamAndMembers();
  }, [teamId]);

  const loadTeamAndMembers = async () => {
    try {
      // Load team info
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select(
          `
          *,
          events(id, name, max_team_members)
        `
        )
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select(
          `
          id,
          user_id,
          users!team_members_user_id_fkey(id, username, full_name, avatar_url)
        `
        )
        .eq("team_id", teamId);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Load available users (not in this team)
      const memberIds = (membersData || []).map((m) => m.user_id);

      let query = supabase
        .from("users")
        .select("id, username, full_name, avatar_url")
        .order("username", { ascending: true });

      if (memberIds.length > 0) {
        query = query.not("id", "in", `(${memberIds.join(",")})`);
      }

      const { data: usersData, error: usersError } = await query;
      if (usersError) throw usersError;
      setAvailableUsers(usersData || []);
    } catch (error) {
      console.error("Error loading team members:", error);
      alert("Không thể tải thông tin đội");
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (userId: string) => {
    try {
      // Check max members limit
      if (
        team.events.max_team_members &&
        members.length >= team.events.max_team_members
      ) {
        alert(`Đội đã đủ ${team.events.max_team_members} thành viên!`);
        return;
      }

      // Add to team_members
      const { error: memberError } = await supabase
        .from("team_members")
        .insert([
          {
            team_id: teamId,
            user_id: userId,
          },
        ]);

      if (memberError) throw memberError;

      // Add to event_participants
      const { error: participantError } = await supabase
        .from("event_participants")
        .insert([
          {
            event_id: team.event_id,
            user_id: userId,
            team_id: teamId,
          },
        ]);

      if (participantError && participantError.code !== "23505") {
        throw participantError;
      }

      alert("Đã thêm thành viên thành công!");
      setShowAddMember(false);
      setSearchTerm("");
      loadTeamAndMembers();
    } catch (error: any) {
      console.error("Error adding member:", error);
      alert(`Lỗi: ${error.message}`);
    }
  };

  const removeMember = async (
    memberId: string,
    userId: string,
    username: string
  ) => {
    if (!confirm(`Bạn có chắc muốn xóa ${username} khỏi đội?`)) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Update event_participants to remove team
      await supabase
        .from("event_participants")
        .update({ team_id: null })
        .eq("user_id", userId)
        .eq("event_id", team.event_id);

      alert("Đã xóa thành viên khỏi đội!");
      loadTeamAndMembers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      alert(`Lỗi: ${error.message}`);
    }
  };

  const filteredUsers = availableUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/teams"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{team?.name}</h1>
            <p className="text-gray-600 mt-1">
              {members.length} thành viên
              {team?.events?.max_team_members &&
                ` / ${team.events.max_team_members} tối đa`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddMember(!showAddMember)}
          disabled={
            team?.events?.max_team_members &&
            members.length >= team.events.max_team_members
          }
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          <span>Thêm thành viên</span>
        </button>
      </div>

      {/* Add Member Panel */}
      {showAddMember && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm
                  ? "Không tìm thấy người dùng"
                  : "Không còn người dùng khả dụng"}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.username}
                      </p>
                      {user.full_name && (
                        <p className="text-sm text-gray-600">
                          {user.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addMember(user.id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Thêm vào đội
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Danh sách thành viên
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Chưa có thành viên nào</p>
          </div>
        ) : (
          <div className="divide-y">
            {members.map((member) => {
              const isCaptain = member.user_id === team.captain_id;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-6 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                      {member.users.avatar_url ? (
                        <img
                          src={member.users.avatar_url}
                          alt={member.users.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-bold text-lg">
                          {member.users.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {member.users.username}
                        </p>
                        {isCaptain && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                            <Crown className="h-3 w-3" />
                            <span>Đội trưởng</span>
                          </span>
                        )}
                      </div>
                      {member.users.full_name && (
                        <p className="text-sm text-gray-600">
                          {member.users.full_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isCaptain && (
                    <button
                      onClick={() =>
                        removeMember(
                          member.id,
                          member.user_id,
                          member.users.username
                        )
                      }
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa khỏi đội"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
