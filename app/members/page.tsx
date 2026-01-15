// "use client";

// import { useEffect, useState } from "react";
// import { Search, TrendingUp, Activity, Award, Users } from "lucide-react";
// import { createSupabaseClient } from "@/lib/supabase";
// import { format } from "date-fns";
// import { vi } from "date-fns/locale";

// type Member = {
//   id: string;
//   username: string;
//   full_name: string;
//   avatar_url: string;
//   pr_5k: string;
//   pr_10k: string;
//   pr_hm: string;
//   pr_fm: string;
//   created_at: string;
//   total_distance: number;
//   total_activities: number;
// };

// export default function MembersPage() {
//   const supabase = createSupabaseClient();
//   const [members, setMembers] = useState<Member[]>([]);
//   const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [sortBy, setSortBy] = useState<"newest" | "distance" | "activities">(
//     "newest"
//   );

//   useEffect(() => {
//     loadMembers();
//   }, []);

//   useEffect(() => {
//     filterAndSortMembers();
//   }, [searchTerm, sortBy, members]);

//   const loadMembers = async () => {
//     try {
//       const { data: users, error } = await supabase
//         .from("users")
//         .select("*")
//         .order("created_at", { ascending: false });

//       if (error) throw error;

//       // Get stats for each member
//       const membersWithStats = await Promise.all(
//         (users || []).map(async (user) => {
//           const { data: activities } = await supabase
//             .from("activities")
//             .select("distance_km")
//             .eq("user_id", user.id);

//           const totalDistance =
//             activities?.reduce((sum, a) => sum + (a.distance_km || 0), 0) || 0;

//           return {
//             ...user,
//             total_distance: totalDistance,
//             total_activities: activities?.length || 0,
//           };
//         })
//       );

//       setMembers(membersWithStats);
//     } catch (error) {
//       console.error("Error loading members:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filterAndSortMembers = () => {
//     let filtered = members;

//     // Filter by search term
//     if (searchTerm) {
//       filtered = filtered.filter(
//         (member) =>
//           member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           member.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//     }

//     // Sort
//     filtered = [...filtered].sort((a, b) => {
//       switch (sortBy) {
//         case "distance":
//           return b.total_distance - a.total_distance;
//         case "activities":
//           return b.total_activities - a.total_activities;
//         case "newest":
//         default:
//           return (
//             new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//           );
//       }
//     });

//     setFilteredMembers(filtered);
//   };

//   return (
//     <div className="space-y-8">
//       {/* Header */}
//       <div className="text-center">
//         <h1 className="text-4xl font-bold text-gray-900 mb-4">
//           Thành viên câu lạc bộ
//         </h1>
//         <p className="text-xl text-gray-600">
//           Cộng đồng {members.length} vận động viên đam mê chạy bộ
//         </p>
//       </div>

//       {/* Search and Sort */}
//       <div className="bg-white rounded-xl shadow-md p-6">
//         <div className="flex flex-col md:flex-row gap-4">
//           {/* Search */}
//           <div className="flex-1 relative">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Tìm kiếm thành viên..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             />
//           </div>

//           {/* Sort */}
//           <select
//             value={sortBy}
//             onChange={(e) => setSortBy(e.target.value as any)}
//             className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//           >
//             <option value="newest">Mới nhất</option>
//             <option value="distance">Tổng km</option>
//             <option value="activities">Hoạt động nhiều nhất</option>
//           </select>
//         </div>
//       </div>

//       {/* Members Grid */}
//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {[1, 2, 3, 4, 5, 6].map((i) => (
//             <div
//               key={i}
//               className="bg-white rounded-xl shadow-md p-6 animate-pulse"
//             >
//               <div className="flex items-center space-x-4 mb-4">
//                 <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
//                 <div className="flex-1 space-y-2">
//                   <div className="h-4 bg-gray-200 rounded w-3/4"></div>
//                   <div className="h-3 bg-gray-200 rounded w-1/2"></div>
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <div className="h-3 bg-gray-200 rounded"></div>
//                 <div className="h-3 bg-gray-200 rounded"></div>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : filteredMembers.length === 0 ? (
//         <div className="bg-white rounded-xl shadow-md p-12 text-center">
//           <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
//           <p className="text-gray-500 text-lg">
//             {searchTerm
//               ? "Không tìm thấy thành viên"
//               : "Chưa có thành viên nào"}
//           </p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {filteredMembers.map((member) => (
//             <div
//               key={member.id}
//               className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
//             >
//               {/* Profile */}
//               <div className="flex items-center space-x-4 mb-4">
//                 <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
//                   {member.avatar_url ? (
//                     <img
//                       src={member.avatar_url}
//                       alt={member.username}
//                       className="w-full h-full object-cover"
//                     />
//                   ) : (
//                     <span className="text-2xl font-bold text-gray-600">
//                       {member.username.charAt(0).toUpperCase()}
//                     </span>
//                   )}
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p className="font-bold text-gray-900 truncate">
//                     {member.username}
//                   </p>
//                   {member.full_name && (
//                     <p className="text-sm text-gray-600 truncate">
//                       {member.full_name}
//                     </p>
//                   )}
//                   <p className="text-xs text-gray-500">
//                     Tham gia{" "}
//                     {format(new Date(member.created_at), "MM/yyyy", {
//                       locale: vi,
//                     })}
//                   </p>
//                 </div>
//               </div>

//               {/* Stats */}
//               <div className="space-y-3 mb-4">
//                 <div className="flex items-center justify-between text-sm">
//                   <div className="flex items-center text-gray-600">
//                     <TrendingUp className="h-4 w-4 mr-2" />
//                     <span>Tổng km</span>
//                   </div>
//                   <span className="font-bold text-gray-900">
//                     {member.total_distance.toFixed(1)} km
//                   </span>
//                 </div>
//                 <div className="flex items-center justify-between text-sm">
//                   <div className="flex items-center text-gray-600">
//                     <Activity className="h-4 w-4 mr-2" />
//                     <span>Hoạt động</span>
//                   </div>
//                   <span className="font-bold text-gray-900">
//                     {member.total_activities}
//                   </span>
//                 </div>
//               </div>

//               {/* Personal Records */}
//               {(member.pr_5k ||
//                 member.pr_10k ||
//                 member.pr_hm ||
//                 member.pr_fm) && (
//                 <div className="border-t pt-3">
//                   <div className="flex items-center text-xs text-gray-500 mb-2">
//                     <Award className="h-3 w-3 mr-1" />
//                     <span>Thành tích cá nhân</span>
//                   </div>
//                   <div className="grid grid-cols-2 gap-2 text-xs">
//                     {member.pr_5k && (
//                       <div>
//                         <span className="text-gray-500">5K:</span>{" "}
//                         <span className="font-medium text-gray-900">
//                           {member.pr_5k}
//                         </span>
//                       </div>
//                     )}
//                     {member.pr_10k && (
//                       <div>
//                         <span className="text-gray-500">10K:</span>{" "}
//                         <span className="font-medium text-gray-900">
//                           {member.pr_10k}
//                         </span>
//                       </div>
//                     )}
//                     {member.pr_hm && (
//                       <div>
//                         <span className="text-gray-500">HM:</span>{" "}
//                         <span className="font-medium text-gray-900">
//                           {member.pr_hm}
//                         </span>
//                       </div>
//                     )}
//                     {member.pr_fm && (
//                       <div>
//                         <span className="text-gray-500">FM:</span>{" "}
//                         <span className="font-medium text-gray-900">
//                           {member.pr_fm}
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { X, Users, Megaphone, TrendingUp, Package, Crown } from "lucide-react";

export default function CoreTeamPage() {
  const [activeTab, setActiveTab] = useState("core");
  const [selectedMember, setSelectedMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      // Load từ storage hoặc API
      // Tạm thời dùng data mẫu
      const sampleData = [
        // Core Team
        {
          id: 1,
          name: "Lãng Tử",
          position: "Chủ nhiệm CLB",
          role: "core",
          avatar:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
          image:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
        },
        {
          id: 2,
          name: "Lê Trần",
          position: "Phó chủ nhiệm CLB",
          role: "core",
          avatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          image:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        },
        {
          id: 3,
          name: "Xa Trục Thảo",
          position: "Phó chủ nhiệm CLB",
          role: "core",
          avatar:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
          image:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
        },
        {
          id: 4,
          name: "Lã Ngọc Ánh",
          position: "Trưởng ban Truyền thông",
          role: "core",
          avatar:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
          image:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800",
        },
        {
          id: 5,
          name: "Nguyễn Hòa",
          position: "Phó chủ nhiệm thường trực",
          role: "core",
          avatar:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
          image:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800",
        },
        {
          id: 6,
          name: "Lê Cao Cường",
          position: "Tổng thư ký",
          role: "core",
          avatar:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
          image:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
        },
        {
          id: 7,
          name: "Phạm Đình Nga",
          position: "Phó tổng thư ký",
          role: "core",
          avatar:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
          image:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
        },

        // Truyền thông
        {
          id: 8,
          name: "Phạm Trang",
          position: "Phụ trách nội dung",
          role: "media",
          avatar:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
          image:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
        },
        {
          id: 9,
          name: "Tố Trinh Trần",
          position: "Phụ trách nội dung",
          role: "media",
          avatar:
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
          image:
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
        },
        {
          id: 10,
          name: "Linh Trần",
          position: "Phụ trách nội dung",
          role: "media",
          avatar:
            "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400",
          image:
            "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800",
        },
        {
          id: 11,
          name: "Cống Kiên",
          position: "Phụ trách nội dung",
          role: "media",
          avatar:
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400",
          image:
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800",
        },

        // Hậu cần
        {
          id: 12,
          name: "Nhật Trường",
          position: "Uỷ viên",
          role: "logistics",
          avatar:
            "https://images.unsplash.com/photo-1507081323647-4d250478b919?w=400",
          image:
            "https://images.unsplash.com/photo-1507081323647-4d250478b919?w=800",
        },
        {
          id: 13,
          name: "Hữu Trân",
          position: "Uỷ viên",
          role: "logistics",
          avatar:
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
          image:
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
        },
        {
          id: 14,
          name: "Việt Tuấn",
          position: "Uỷ viên",
          role: "logistics",
          avatar:
            "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400",
          image:
            "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800",
        },

        // Chuyên môn
        {
          id: 15,
          name: "Goon Trần",
          position: "Phụ trách hình ảnh",
          role: "technical",
          avatar:
            "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400",
          image:
            "https://images.unsplash.com/photo-1463453091185-61582044d556?w=800",
        },
        {
          id: 16,
          name: "Cao Cường",
          position: "Uỷ viên",
          role: "technical",
          avatar:
            "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400",
          image:
            "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800",
        },
        {
          id: 17,
          name: "Lương Nguyễn",
          position: "Uỷ viên",
          role: "technical",
          avatar:
            "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400",
          image:
            "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=800",
        },
      ];

      setMembers(sampleData);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: "core",
      label: "CORE TEAM",
      icon: Crown,
      color: "from-blue-600 to-blue-700",
    },
    {
      id: "media",
      label: "BAN TRUYỀN THÔNG",
      icon: Megaphone,
      color: "from-purple-600 to-purple-700",
    },
    {
      id: "logistics",
      label: "BAN HẬU CẦN",
      icon: Package,
      color: "from-green-600 to-green-700",
    },
    {
      id: "technical",
      label: "BAN CHUYÊN MÔN",
      icon: TrendingUp,
      color: "from-orange-600 to-orange-700",
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab);
  const filteredMembers = members.filter((m) => m.role === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
            BAN CHẤP HÀNH
          </h1>
          <p className="text-2xl text-blue-200 font-semibold">
            HÒA KHÁNH RUNNERS
          </p>
        </div>

        {/* Tabs - Compact Pills Style */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative px-8 py-3 rounded-full font-bold text-sm tracking-wider transition-all transform hover:scale-105 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-2xl`
                    : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                }`}
              >
                <Icon
                  className={`inline-block mr-2 h-5 w-5 ${
                    activeTab === tab.id ? "animate-pulse" : ""
                  }`}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Members Grid - Photo Grid Style (như hình mẫu) */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
          </div>
        ) : (
          {activeTab === "core" ? (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
    {/* LEFT – LEADER */}
    {leader && (
      <div
        onClick={() => setSelectedMember(leader)}
        className="cursor-pointer text-center group"
      >
        <div className="relative mx-auto w-72 h-72 rounded-full overflow-hidden shadow-2xl">
          <img
            src={leader.avatar}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <h2 className="mt-6 text-3xl font-black text-white">
          {leader.name.toUpperCase()}
        </h2>
        <p className="text-xl text-blue-200 mt-2">
          {leader.position}
        </p>
      </div>
    )}

    {/* RIGHT – MEMBERS */}
    <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-8">
      {restMembers.map((member) => (
        <div
          key={member.id}
          onClick={() => setSelectedMember(member)}
          className="cursor-pointer text-center group"
        >
          <div className="relative mx-auto w-40 h-40 rounded-full overflow-hidden shadow-xl">
            <img
              src={member.avatar}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>

          <h3 className="mt-4 text-lg font-bold text-white">
            {member.name}
          </h3>
          <p className="text-sm text-blue-200">
            {member.position}
          </p>
        </div>
      ))}
    </div>
  </div>
) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="group cursor-pointer relative overflow-hidden rounded-2xl aspect-[3/4] bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm"
              >
                {/* Image */}
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-bold text-lg mb-1 drop-shadow-lg">
                    {member.name}
                  </h3>
                  <p className="text-sm opacity-90 drop-shadow">
                    {member.position}
                  </p>
                </div>

                {/* Hover Ring Effect */}
                <div className="absolute inset-0 border-4 border-white/0 group-hover:border-white/30 transition-all rounded-2xl" />
              </div>
            ))}
          </div>
)}
        )}

        {/* Info Note */}
        <div className="mt-12 text-center">
          <p className="text-blue-200 text-sm">
            ✨ Click vào ảnh để xem chi tiết
          </p>
        </div>
      </div>

      {/* Modal - Full Screen Image */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute -top-16 right-0 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Image Card */}
            <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-3xl overflow-hidden shadow-2xl">
              {/* Large Image */}
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={selectedMember.image}
                  alt={selectedMember.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info Footer */}
              <div className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-4xl font-black mb-2">
                      {selectedMember.name}
                    </h2>
                    <p className="text-xl font-semibold opacity-90">
                      {selectedMember.position}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                    {currentTab && <currentTab.icon className="h-5 w-5" />}
                    <span className="font-bold text-sm">
                      {currentTab?.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
