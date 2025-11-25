"use client";

import { useEffect, useState } from "react";
import { Search, User, Award, Calendar, Activity } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type MemberWithStats = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url: string;
  pr_5k: string;
  pr_10k: string;
  pr_hm: string;
  pr_fm: string;
  created_at: string;
  total_activities: number;
  total_distance: number;
  total_events: number;
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get stats for each user
      const membersWithStats = await Promise.all(
        (users || []).map(async (user) => {
          // Get total activities
          const { count: activityCount } = await supabase
            .from("activities")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          // Get total distance
          const { data: activities } = await supabase
            .from("activities")
            .select("distance_km")
            .eq("user_id", user.id);

          const totalDistance =
            activities?.reduce((sum, a) => sum + (a.distance_km || 0), 0) || 0;

          // Get total events participated
          const { count: eventCount } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          return {
            ...user,
            total_activities: activityCount || 0,
            total_distance: totalDistance,
            total_events: eventCount || 0,
          };
        })
      );

      setMembers(membersWithStats);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý thành viên</h1>
        <p className="text-gray-600 mt-1">
          Danh sách tất cả thành viên trong hệ thống
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, username hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng thành viên</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.reduce((sum, m) => sum + m.total_activities, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng km</p>
              <p className="text-2xl font-bold text-gray-900">
                {members
                  .reduce((sum, m) => sum + m.total_distance, 0)
                  .toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Thành viên mới (tuần)</p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  members.filter((m) => {
                    const created = new Date(m.created_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return created > weekAgo;
                  }).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 border-b last:border-b-0 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm
              ? "Không tìm thấy thành viên"
              : "Chưa có thành viên nào"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thành viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thành tích
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thống kê
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tham gia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 font-bold text-lg">
                              {member.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.username}
                          </p>
                          {member.full_name && (
                            <p className="text-sm text-gray-600">
                              {member.full_name}
                            </p>
                          )}
                          {member.email &&
                            !member.email.includes("@temp.local") && (
                              <p className="text-xs text-gray-500">
                                {member.email}
                              </p>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {member.pr_5k && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">5K:</span>
                            <span className="font-medium">{member.pr_5k}</span>
                          </div>
                        )}
                        {member.pr_10k && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">10K:</span>
                            <span className="font-medium">{member.pr_10k}</span>
                          </div>
                        )}
                        {member.pr_hm && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">HM:</span>
                            <span className="font-medium">{member.pr_hm}</span>
                          </div>
                        )}
                        {member.pr_fm && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">FM:</span>
                            <span className="font-medium">{member.pr_fm}</span>
                          </div>
                        )}
                        {!member.pr_5k &&
                          !member.pr_10k &&
                          !member.pr_hm &&
                          !member.pr_fm && (
                            <span className="text-gray-400">Chưa cập nhật</span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-gray-400" />
                          <span>{member.total_activities} hoạt động</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-gray-400" />
                          <span>{member.total_distance.toFixed(0)} km</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{member.total_events} sự kiện</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {format(new Date(member.created_at), "dd/MM/yyyy", {
                          locale: vi,
                        })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
