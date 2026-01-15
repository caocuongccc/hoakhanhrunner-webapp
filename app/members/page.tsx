"use client";

import { useEffect, useState } from "react";
import { Search, TrendingUp, Activity, Award, Users } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type Member = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  pr_5k: string;
  pr_10k: string;
  pr_hm: string;
  pr_fm: string;
  created_at: string;
  total_distance: number;
  total_activities: number;
};

export default function MembersPage() {
  const supabase = createSupabaseClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "distance" | "activities">(
    "newest"
  );

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    filterAndSortMembers();
  }, [searchTerm, sortBy, members]);

  const loadMembers = async () => {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get stats for each member
      const membersWithStats = await Promise.all(
        (users || []).map(async (user) => {
          const { data: activities } = await supabase
            .from("activities")
            .select("distance_km")
            .eq("user_id", user.id);

          const totalDistance =
            activities?.reduce((sum, a) => sum + (a.distance_km || 0), 0) || 0;

          return {
            ...user,
            total_distance: totalDistance,
            total_activities: activities?.length || 0,
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

  const filterAndSortMembers = () => {
    let filtered = members;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "distance":
          return b.total_distance - a.total_distance;
        case "activities":
          return b.total_activities - a.total_activities;
        case "newest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    setFilteredMembers(filtered);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Thành viên câu lạc bộ
        </h1>
        <p className="text-xl text-gray-600">
          Cộng đồng {members.length} vận động viên đam mê chạy bộ
        </p>
      </div>

      {/* Search and Sort */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Mới nhất</option>
            <option value="distance">Tổng km</option>
            <option value="activities">Hoạt động nhiều nhất</option>
          </select>
        </div>
      </div>

      {/* Members Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md p-6 animate-pulse"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm
              ? "Không tìm thấy thành viên"
              : "Chưa có thành viên nào"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Profile */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-600">
                      {member.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {member.username}
                  </p>
                  {member.full_name && (
                    <p className="text-sm text-gray-600 truncate">
                      {member.full_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Tham gia{" "}
                    {format(new Date(member.created_at), "MM/yyyy", {
                      locale: vi,
                    })}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span>Tổng km</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {member.total_distance.toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Activity className="h-4 w-4 mr-2" />
                    <span>Hoạt động</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {member.total_activities}
                  </span>
                </div>
              </div>

              {/* Personal Records */}
              {(member.pr_5k ||
                member.pr_10k ||
                member.pr_hm ||
                member.pr_fm) && (
                <div className="border-t pt-3">
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <Award className="h-3 w-3 mr-1" />
                    <span>Thành tích cá nhân</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {member.pr_5k && (
                      <div>
                        <span className="text-gray-500">5K:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {member.pr_5k}
                        </span>
                      </div>
                    )}
                    {member.pr_10k && (
                      <div>
                        <span className="text-gray-500">10K:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {member.pr_10k}
                        </span>
                      </div>
                    )}
                    {member.pr_hm && (
                      <div>
                        <span className="text-gray-500">HM:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {member.pr_hm}
                        </span>
                      </div>
                    )}
                    {member.pr_fm && (
                      <div>
                        <span className="text-gray-500">FM:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {member.pr_fm}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
