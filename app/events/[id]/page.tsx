// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import {
//   ArrowLeft,
//   Calendar,
//   Users,
//   Lock,
//   Info,
//   UserPlus,
//   CheckCircle,
//   TrendingUp,
//   Trophy,
//   Award,
//   Activity as ActivityIcon,
// } from "lucide-react";
// import { createSupabaseClient, Event } from "@/lib/supabase";
// import { format, differenceInDays } from "date-fns";
// import { vi } from "date-fns/locale";
// import Link from "next/link";
// import { useAuth } from "@/components/AuthProvider";
// import EventDashboard from "@/components/EventDashboard";
// import UserBadges from "@/components/UserBadges";
// import MinActiveDaysProgress from "@/components/MinActiveDaysProgress";
// import UserTracklogModal from "@/components/UserTracklogModal";

// export default function EventDetailPage() {
//   const params = useParams();
//   const eventId = params.id as string;
//   const router = useRouter();
//   const { user } = useAuth();
//   const supabase = createSupabaseClient();

//   const [event, setEvent] = useState<Event | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isParticipating, setIsParticipating] = useState(false);
//   const [participantCount, setParticipantCount] = useState(0);
//   const [teams, setTeams] = useState<any[]>([]);
//   const [rules, setRules] = useState<any[]>([]);
//   const [showJoinModal, setShowJoinModal] = useState(false);

//   // NEW: Track auth loading state
//   const [authChecked, setAuthChecked] = useState(false);

//   const [tracklogModal, setTracklogModal] = useState<{
//     isOpen: boolean;
//     userId: string;
//     userName: string;
//   }>({
//     isOpen: false,
//     userId: "",
//     userName: "",
//   });

//   useEffect(() => {
//     loadEvent();
//   }, [eventId]);

//   // FIXED: Check participation when user state changes
//   useEffect(() => {
//     if (user && event) {
//       checkParticipation();
//     }
//     setAuthChecked(true);
//   }, [user, event]); // Re-run when user or event changes

//   // NEW: Separate function to check participation
//   const checkParticipation = async () => {
//     if (!user || !event) return;

//     try {
//       const { data: participant, error } = await supabase
//         .from("event_participants")
//         .select("*")
//         .eq("event_id", eventId)
//         .eq("user_id", user.id)
//         .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when not found

//       if (error) {
//         console.error("Error checking participation:", error);
//         return;
//       }

//       setIsParticipating(!!participant);
//     } catch (error) {
//       console.error("Error checking participation:", error);
//     }
//   };

//   const loadEvent = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("events")
//         .select("*")
//         .eq("id", eventId)
//         .single();

//       if (error) throw error;
//       setEvent(data);

//       // Load participant count
//       const { count } = await supabase
//         .from("event_participants")
//         .select("*", { count: "exact", head: true })
//         .eq("event_id", eventId);
//       setParticipantCount(count || 0);

//       // Check if user is participating
//       if (user) {
//         const { data: participant } = await supabase
//           .from("event_participants")
//           .select("*")
//           .eq("event_id", eventId)
//           .eq("user_id", user.id)
//           .single();
//         setIsParticipating(!!participant);
//       }

//       // Load teams if team event
//       if (data.event_type === "team") {
//         const { data: teamsData } = await supabase
//           .from("teams")
//           .select("*, users!teams_captain_id_fkey(username)")
//           .eq("event_id", eventId);
//         setTeams(teamsData || []);
//       }

//       // Load rules
//       const { data: eventRules } = await supabase
//         .from("event_rules")
//         .select("*, rules(*)")
//         .eq("event_id", eventId);
//       setRules(eventRules?.map((er) => er.rules) || []);
//     } catch (error) {
//       console.error("Error loading event:", error);
//       alert("Không thể tải thông tin sự kiện");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleJoinClick = () => {
//     if (!user) {
//       router.push("/login");
//       return;
//     }
//     setShowJoinModal(true);
//   };

//   // Handler to open tracklog modal
//   const handleViewTracklog = (userId: string, userName: string) => {
//     setTracklogModal({
//       isOpen: true,
//       userId,
//       userName,
//     });
//   };

//   // Handler to close tracklog modal
//   const handleCloseTracklog = () => {
//     setTracklogModal({
//       isOpen: false,
//       userId: "",
//       userName: "",
//     });
//   };

//   if (loading || !authChecked) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   if (!event) {
//     return (
//       <div className="text-center py-12">
//         <p className="text-gray-500 text-lg">Không tìm thấy sự kiện</p>
//       </div>
//     );
//   }

//   const today = new Date().toISOString().split("T")[0];
//   const isOngoing = today >= event.start_date && today <= event.end_date;
//   const isUpcoming = today < event.start_date;
//   const isEnded = today > event.end_date;

//   const eventDurationDays =
//     differenceInDays(new Date(event.end_date), new Date(event.start_date)) + 1;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
//         {/* Back Button */}
//         <Link
//           href="/events"
//           className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
//         >
//           <ArrowLeft className="h-5 w-5" />
//           <span className="font-medium">Quay lại danh sách sự kiện</span>
//         </Link>

//         {/* Event Header Card */}
//         <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
//           {/* Cover Image with Gradient Overlay */}
//           {event.image_url && (
//             <div className="relative h-64 md:h-80 overflow-hidden">
//               <img
//                 src={event.image_url}
//                 alt={event.name}
//                 className="w-full h-full object-cover"
//               />
//               <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

//               {/* Floating Status Badge on Image */}
//               <div className="absolute top-4 right-4">
//                 {isOngoing && (
//                   <div className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg flex items-center space-x-2 animate-pulse">
//                     <div className="w-2 h-2 bg-white rounded-full"></div>
//                     <span>ĐANG DIỄN RA</span>
//                   </div>
//                 )}
//                 {isUpcoming && (
//                   <div className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg">
//                     SẮP DIỄN RA
//                   </div>
//                 )}
//                 {isEnded && (
//                   <div className="px-4 py-2 bg-gray-500 text-white rounded-full text-sm font-bold shadow-lg">
//                     ĐÃ KẾT THÚC
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           <div className="p-6 md:p-8">
//             <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
//               <div className="flex-1">
//                 <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
//                   {event.name}
//                 </h1>

//                 {/* Event Meta Info */}
//                 <div className="flex flex-wrap items-center gap-2 mb-6">
//                   <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-full text-sm font-semibold flex items-center space-x-1">
//                     <Users className="h-3.5 w-3.5" />
//                     <span>
//                       {event.event_type === "team" ? "Theo đội" : "Cá nhân"}
//                     </span>
//                   </span>
//                   {event.password && (
//                     <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-full text-sm font-semibold flex items-center space-x-1">
//                       <Lock className="h-3.5 w-3.5" />
//                       <span>Có mật khẩu</span>
//                     </span>
//                   )}
//                   <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-sm font-semibold">
//                     {eventDurationDays} ngày
//                   </span>
//                 </div>

//                 {/* Event Details Grid */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
//                     <div className="p-2 bg-blue-100 rounded-lg">
//                       <Calendar className="h-5 w-5 text-blue-600" />
//                     </div>
//                     <div>
//                       <div className="text-xs text-gray-500 font-medium">
//                         Thời gian
//                       </div>
//                       <div className="text-sm font-semibold text-gray-900">
//                         {format(new Date(event.start_date), "dd/MM/yyyy", {
//                           locale: vi,
//                         })}{" "}
//                         -{" "}
//                         {format(new Date(event.end_date), "dd/MM/yyyy", {
//                           locale: vi,
//                         })}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
//                     <div className="p-2 bg-green-100 rounded-lg">
//                       <Users className="h-5 w-5 text-green-600" />
//                     </div>
//                     <div>
//                       <div className="text-xs text-gray-500 font-medium">
//                         Người tham gia
//                       </div>
//                       <div className="text-sm font-semibold text-gray-900">
//                         {participantCount} người
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Description */}
//                 {event.description && (
//                   <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
//                     <p className="text-gray-700 leading-relaxed">
//                       {event.description}
//                     </p>
//                   </div>
//                 )}
//               </div>

//               {/* Join Button Section */}
//               {!isEnded && (
//                 <div className="md:ml-6 flex-shrink-0">
//                   {isParticipating ? (
//                     <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-xl flex items-center space-x-3 border-2 border-green-200 shadow-lg">
//                       <CheckCircle className="h-6 w-6" />
//                       <div>
//                         <div className="font-bold text-lg">Đã tham gia</div>
//                         <div className="text-xs text-green-600">
//                           Bạn là thành viên
//                         </div>
//                       </div>
//                     </div>
//                   ) : (
//                     <button
//                       onClick={handleJoinClick}
//                       className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl flex items-center space-x-3"
//                     >
//                       <UserPlus className="h-6 w-6" />
//                       <div className="text-left">
//                         <div className="text-lg">Tham gia ngay</div>
//                         <div className="text-xs opacity-90">
//                           Miễn phí • Không giới hạn
//                         </div>
//                       </div>
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Rules Section */}
//         {/* {rules.length > 0 && (
//           <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
//             <div className="flex items-center space-x-3 mb-4">
//               <div className="p-2 bg-orange-100 rounded-lg">
//                 <Info className="h-6 w-6 text-orange-600" />
//               </div>
//               <h2 className="text-2xl font-bold text-gray-900">Luật chơi</h2>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {rules.map((rule: any) => (
//                 <div
//                   key={rule.id}
//                   className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
//                 >
//                   <h3 className="font-bold text-gray-900 mb-2 flex items-center space-x-2">
//                     <span className="text-lg">
//                       {getRuleIcon(rule.rule_type)}
//                     </span>
//                     <span>{rule.name}</span>
//                   </h3>
//                   <p className="text-sm text-gray-600 mb-2">
//                     {rule.description}
//                   </p>
//                   <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
//                     {formatRuleConfig(rule)}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )} */}

//         {/* Progress Card - Only show if user is participating */}
//         {user && isParticipating && (
//           <MinActiveDaysProgress eventId={eventId} defaultExpanded={false} />
//         )}

//         {/* Statistics Card */}
//         <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
//           <div className="flex items-center space-x-3 mb-6">
//             <div className="p-2 bg-purple-100 rounded-lg">
//               <TrendingUp className="h-6 w-6 text-purple-600" />
//             </div>
//             <h2 className="text-2xl font-bold text-gray-900">
//               Thống kê sự kiện
//             </h2>
//           </div>
//           <EventStatistics eventId={eventId} eventType={event.event_type} />
//         </div>

//         {/* Dashboard with Tracklog Modal Integration */}
//         {user && isParticipating && (
//           <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
//             <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600">
//               <div className="flex items-center space-x-3">
//                 <div className="p-2 bg-white/20 rounded-lg">
//                   <Trophy className="h-6 w-6 text-white" />
//                 </div>
//                 <h2 className="text-2xl font-bold text-white">
//                   Bảng xếp hạng & Hoạt động
//                 </h2>
//               </div>
//             </div>
//             <div className="p-6">
//               <EventDashboard
//                 eventId={eventId}
//                 onViewTracklog={handleViewTracklog}
//               />
//             </div>
//           </div>
//         )}

//         {/* Badges Section - Only show if user is participating */}
//         {user && isParticipating && (
//           <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
//             <div className="flex items-center space-x-3 mb-6">
//               <div className="p-2 bg-yellow-100 rounded-lg">
//                 <Award className="h-6 w-6 text-yellow-600" />
//               </div>
//               <h2 className="text-2xl font-bold text-gray-900">
//                 Huy hiệu của bạn
//               </h2>
//             </div>
//             <UserBadges eventId={eventId} showLocked={true} />
//           </div>
//         )}

//         {/* CTA for non-participants */}
//         {!isParticipating && !isEnded && (
//           <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-center">
//             <Trophy className="h-16 w-16 text-white mx-auto mb-4 opacity-90" />
//             <h3 className="text-2xl font-bold text-white mb-2">
//               Tham gia để xem bảng xếp hạng
//             </h3>
//             <p className="text-blue-100 mb-6">
//               Theo dõi tiến độ, cạnh tranh với bạn bè và nhận huy hiệu
//             </p>
//             <button
//               onClick={handleJoinClick}
//               className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
//             >
//               Tham gia ngay
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Join Modal */}
//       {showJoinModal && (
//         <JoinEventModal
//           event={event}
//           teams={teams}
//           onClose={() => setShowJoinModal(false)}
//           onSuccess={() => {
//             setShowJoinModal(false);
//             loadEvent();
//             checkParticipation(); // Re-check after joining
//           }}
//         />
//       )}

//       {/* Tracklog Modal */}
//       <UserTracklogModal
//         eventId={eventId}
//         userId={tracklogModal.userId}
//         userName={tracklogModal.userName}
//         isOpen={tracklogModal.isOpen}
//         onClose={handleCloseTracklog}
//       />
//     </div>
//   );
// }

// // Helper functions
// function getRuleIcon(ruleType: string) {
//   switch (ruleType) {
//     case "daily_increase_individual":
//       return "📈";
//     case "daily_increase_team":
//       return "👥";
//     case "min_participants":
//       return "🎯";
//     case "pace_range":
//       return "⚡";
//     case "multiplier_day":
//       return "✖️";
//     case "time_range":
//       return "⏰";
//     case "min_active_days":
//       return "📅";
//     default:
//       return "📋";
//   }
// }

// function formatRuleConfig(rule: any) {
//   const config = rule.config as any;

//   switch (rule.rule_type) {
//     case "daily_increase_individual":
//       return `Tăng ${config.increase_km} km mỗi ngày`;
//     case "daily_increase_team":
//       return `Đội tăng ${config.team_increase_km} km mỗi ngày`;
//     case "min_participants":
//       return `Tối thiểu ${config.min_participants} người/ngày`;
//     case "pace_range":
//       return `Pace: ${config.min_pace} - ${config.max_pace} phút/km`;
//     case "multiplier_day":
//       const days = [
//         "Chủ nhật",
//         "Thứ 2",
//         "Thứ 3",
//         "Thứ 4",
//         "Thứ 5",
//         "Thứ 6",
//         "Thứ 7",
//       ];
//       return `${days[config.multiplier_day]} x${config.multiplier}`;
//     case "time_range":
//       return `${config.start_time} - ${config.end_time}`;
//     case "min_active_days":
//       const percentage = config.min_percentage?.toFixed(0) || "67";
//       const grace = config.grace_days || 0;
//       const graceText = grace > 0 ? `, cho phép nghỉ ${grace} ngày` : "";
//       return `Cần ${percentage}% ngày có tracklog${graceText}`;
//     default:
//       return "";
//   }
// }

// // Join Modal Component
// function JoinEventModal({
//   event,
//   teams,
//   onClose,
//   onSuccess,
// }: {
//   event: Event;
//   teams: any[];
//   onClose: () => void;
//   onSuccess: () => void;
// }) {
//   const { user } = useAuth();
//   const supabase = createSupabaseClient();
//   const [password, setPassword] = useState("");
//   const [selectedTeam, setSelectedTeam] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleJoin = async () => {
//     if (!user) return;

//     setLoading(true);
//     setError("");

//     try {
//       // Validate password
//       if (event.password && password !== event.password) {
//         throw new Error("Mật khẩu không đúng");
//       }

//       // Validate team selection
//       if (event.event_type === "team" && !selectedTeam) {
//         throw new Error("Vui lòng chọn đội");
//       }

//       // Add to event_participants
//       const { error: participantError } = await supabase
//         .from("event_participants")
//         .insert([
//           {
//             event_id: event.id,
//             user_id: user.id,
//             team_id: selectedTeam || null,
//           },
//         ]);

//       if (participantError) throw participantError;

//       // Add to team_members if team event
//       if (selectedTeam) {
//         const { error: memberError } = await supabase
//           .from("team_members")
//           .insert([
//             {
//               team_id: selectedTeam,
//               user_id: user.id,
//             },
//           ]);

//         if (memberError) throw memberError;
//       }

//       alert("Tham gia sự kiện thành công!");
//       onSuccess();
//     } catch (error: any) {
//       console.error("Error joining event:", error);
//       setError(error.message || "Không thể tham gia sự kiện");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
//       <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all">
//         <h3 className="text-2xl font-bold text-gray-900 mb-4">
//           Tham gia sự kiện
//         </h3>

//         {error && (
//           <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
//             {error}
//           </div>
//         )}

//         {/* Password Input */}
//         {event.password && (
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Mật khẩu sự kiện
//             </label>
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               placeholder="Nhập mật khẩu"
//             />
//           </div>
//         )}

//         {/* Team Selection */}
//         {event.event_type === "team" && (
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Chọn đội
//             </label>
//             <select
//               value={selectedTeam}
//               onChange={(e) => setSelectedTeam(e.target.value)}
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             >
//               <option value="">-- Chọn đội --</option>
//               {teams.map((team) => (
//                 <option key={team.id} value={team.id}>
//                   {team.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         {/* Buttons */}
//         <div className="flex items-center space-x-3">
//           <button
//             onClick={onClose}
//             className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
//           >
//             Hủy
//           </button>
//           <button
//             onClick={handleJoin}
//             disabled={loading}
//             className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
//           >
//             {loading ? "Đang xử lý..." : "Tham gia"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Statistics Component
// function EventStatistics({
//   eventId,
//   eventType,
// }: {
//   eventId: string;
//   eventType: string;
// }) {
//   const [stats, setStats] = useState({
//     totalParticipants: 0,
//     totalActivities: 0,
//     totalDistance: 0,
//     totalPoints: 0,
//     averagePace: 0,
//     topRunner: null as { username: string; distance: number } | null,
//   });
//   const [loading, setLoading] = useState(true);
//   const supabase = createSupabaseClient();

//   useEffect(() => {
//     loadStats();
//   }, [eventId]);

//   const loadStats = async () => {
//     try {
//       // Get all participants
//       const { data: participants, error: participantsError } = await supabase
//         .from("event_participants")
//         .select("user_id, total_km, total_points, users(username)")
//         .eq("event_id", eventId);

//       if (participantsError) throw participantsError;

//       // Get all activities
//       const { data: activities, error: activitiesError } = await supabase
//         .from("activities")
//         .select("distance_km, points_earned, pace_min_per_km")
//         .eq("event_id", eventId);

//       if (activitiesError) throw activitiesError;

//       // Calculate stats
//       const totalDistance =
//         participants?.reduce((sum, p) => sum + (p.total_km || 0), 0) || 0;
//       const totalPoints =
//         participants?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;

//       const validPaces =
//         activities
//           ?.filter((a) => a.pace_min_per_km)
//           .map((a) => a.pace_min_per_km!) || [];
//       const averagePace =
//         validPaces.length > 0
//           ? validPaces.reduce((sum, p) => sum + p, 0) / validPaces.length
//           : 0;

//       // Find top runner
//       const topRunner =
//         participants && participants.length > 0
//           ? participants.reduce((top, p) =>
//               p.total_km > (top?.total_km || 0) ? p : top,
//             )
//           : null;

//       setStats({
//         totalParticipants: participants?.length || 0,
//         totalActivities: activities?.length || 0,
//         totalDistance,
//         totalPoints,
//         averagePace,
//         topRunner: topRunner
//           ? {
//               username: topRunner.users.username,
//               distance: topRunner.total_km,
//             }
//           : null,
//       });
//     } catch (error) {
//       console.error("Error loading stats:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-8">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         <StatCard
//           icon={<Users className="h-6 w-6" />}
//           value={stats.totalParticipants}
//           label="Người tham gia"
//           color="blue"
//         />
//         <StatCard
//           icon={<ActivityIcon className="h-6 w-6" />}
//           value={stats.totalDistance.toFixed(1)}
//           label="Tổng km"
//           color="green"
//         />
//         <StatCard
//           icon={<Trophy className="h-6 w-6" />}
//           value={stats.totalPoints.toFixed(0)}
//           label="Tổng điểm"
//           color="purple"
//         />
//         <StatCard
//           icon={<TrendingUp className="h-6 w-6" />}
//           value={stats.totalActivities}
//           label="Hoạt động"
//           color="orange"
//         />
//       </div>

//       {/* Additional Stats */}
//       {(stats.averagePace > 0 || stats.topRunner) && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {stats.averagePace > 0 && (
//             <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
//               <div className="text-sm text-blue-600 font-medium mb-1">
//                 Pace trung bình
//               </div>
//               <div className="text-2xl font-bold text-blue-900">
//                 {Math.floor(stats.averagePace)}:
//                 {Math.round((stats.averagePace % 1) * 60)
//                   .toString()
//                   .padStart(2, "0")}{" "}
//                 <span className="text-lg">/km</span>
//               </div>
//             </div>
//           )}
//           {stats.topRunner && (
//             <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl">
//               <div className="text-sm text-yellow-600 font-medium mb-1">
//                 Top runner
//               </div>
//               <div className="text-2xl font-bold text-yellow-900">
//                 {stats.topRunner.username}
//               </div>
//               <div className="text-sm text-yellow-700">
//                 {stats.topRunner.distance.toFixed(1)} km
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // Stat Card Component
// function StatCard({
//   icon,
//   value,
//   label,
//   color,
// }: {
//   icon: React.ReactNode;
//   value: string | number;
//   label: string;
//   color: "blue" | "green" | "purple" | "orange";
// }) {
//   const colorClasses = {
//     blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-600",
//     green: "from-green-50 to-green-100 border-green-200 text-green-600",
//     purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-600",
//     orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-600",
//   };

//   const valueColorClasses = {
//     blue: "text-blue-900",
//     green: "text-green-900",
//     purple: "text-purple-900",
//     orange: "text-orange-900",
//   };

//   return (
//     <div
//       className={`p-4 bg-gradient-to-br ${colorClasses[color]} border rounded-xl text-center transform hover:scale-105 transition-all`}
//     >
//       <div className="flex justify-center mb-2">{icon}</div>
//       <div className={`text-3xl font-bold ${valueColorClasses[color]} mb-1`}>
//         {value}
//       </div>
//       <div className="text-sm text-gray-600 font-medium">{label}</div>
//     </div>
//   );
// }
// app/events/[id]/page-complete.tsx
// Complete event detail page with comprehensive rules display and dashboard

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Users,
  TrendingUp,
  Trophy,
  Award,
  Activity as ActivityIcon,
  Flame,
  Target,
} from "lucide-react";
import { createSupabaseClient, Event } from "@/lib/supabase";
import { format, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import EventDashboard from "@/components/EventDashboard";
import UserBadges from "@/components/UserBadges";
import MinActiveDaysProgress from "@/components/MinActiveDaysProgress";
import UserTracklogModal from "@/components/UserTracklogModal";
import DualLeaderboard from "@/components/DualLeaderboard";
import PenaltyTracker from "@/components/PenaltyTracker";
import EventRulesDisplay from "@/components/EventRulesDisplay";

export default function EventDetailPageComplete() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createSupabaseClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipating, setIsParticipating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [rules, setRules] = useState<any[]>([]);

  const [open, setOpen] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "overview" | "rules" | "leaderboard" | "dashboard"
  >("overview");

  const [tracklogModal, setTracklogModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
  });

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (user && event) {
      checkParticipation();
    }
    setAuthChecked(true);
  }, [user, event]);

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

      // Load rules
      const { data: eventRules } = await supabase
        .from("event_rules")
        .select("rules(*)")
        .eq("event_id", eventId);

      const loadedRules = (eventRules || []).map((er) => ({
        rule_type: er.rules.rule_type,
        name: er.rules.name,
        description: er.rules.description,
        config: er.rules.config,
      }));
      setRules(loadedRules);
    } catch (error) {
      console.error("Error loading event:", error);
      alert("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const checkParticipation = async () => {
    if (!user || !event) return;

    try {
      const { data: participant, error } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking participation:", error);
        return;
      }

      setIsParticipating(!!participant);
    } catch (error) {
      console.error("Error checking participation:", error);
    }
  };

  if (loading || !authChecked) {
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

  const eventDurationDays =
    differenceInDays(new Date(event.end_date), new Date(event.start_date)) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Button */}
        <Link
          href="/events"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Quay lại danh sách sự kiện</span>
        </Link>

        {/* Event Header Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {event.image_url && (
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img
                src={event.image_url}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {isOngoing && (
                  <div className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg flex items-center space-x-2 animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>ĐANG DIỄN RA</span>
                  </div>
                )}
                {isUpcoming && (
                  <div className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg">
                    SẮP DIỄN RA
                  </div>
                )}
                {isEnded && (
                  <div className="px-4 py-2 bg-gray-500 text-white rounded-full text-sm font-bold shadow-lg">
                    ĐÃ KẾT THÚC
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {event.name}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Thời gian</div>
                  <div className="text-sm font-semibold">
                    {format(new Date(event.start_date), "dd/MM/yyyy")} -{" "}
                    {format(new Date(event.end_date), "dd/MM/yyyy")}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Người tham gia</div>
                  <div className="text-sm font-semibold">
                    {participantCount} người
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <ActivityIcon className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-xs text-gray-500">Thể lệ</div>
                  <div className="text-sm font-semibold">
                    {rules.length} quy tắc
                  </div>
                </div>
              </div>
            </div>

            {event.description && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-gray-700">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-2 border border-gray-200">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Tổng quan</span>
            </button>

            <button
              onClick={() => setActiveTab("rules")}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeTab === "rules"
                  ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Thể lệ & Phần thưởng</span>
            </button>

            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeTab === "leaderboard"
                  ? "bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Bảng xếp hạng</span>
            </button>

            {isParticipating && (
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeTab === "dashboard"
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Dashboard của tôi</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users className="h-6 w-6" />}
                  label="Người tham gia"
                  value={participantCount.toString()}
                  color="blue"
                />
                <StatCard
                  icon={<Calendar className="h-6 w-6" />}
                  label="Số ngày"
                  value={eventDurationDays.toString()}
                  color="green"
                />
                <StatCard
                  icon={<Trophy className="h-6 w-6" />}
                  label="Quy tắc"
                  value={rules.length.toString()}
                  color="purple"
                />
                <StatCard
                  icon={<Award className="h-6 w-6" />}
                  label="Phần thưởng"
                  value={rules
                    .filter((r) =>
                      [
                        "tet_bonus",
                        "lucky_distance",
                        "multiplier_day",
                      ].includes(r.rule_type),
                    )
                    .length.toString()}
                  color="orange"
                />
              </div>

              {/* Progress for participating users */}
              {isParticipating && user && (
                <MinActiveDaysProgress eventId={eventId} userId={user.id} />
              )}

              {/* Quick Rules Preview */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                  <Flame className="h-6 w-6 text-orange-600" />
                  <span>Điểm nổi bật</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rules
                    .filter((r) =>
                      [
                        "tet_bonus",
                        "lucky_distance",
                        "penalty_missed_day",
                      ].includes(r.rule_type),
                    )
                    .slice(0, 4)
                    .map((rule, idx) => (
                      <QuickRuleCard key={idx} rule={rule} />
                    ))}
                </div>
                <button
                  onClick={() => setActiveTab("rules")}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Xem đầy đủ thể lệ →
                </button>
              </div>
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === "rules" && <EventRulesDisplay rules={rules} />}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <div className="space-y-6">
              <DualLeaderboard eventId={eventId} />

              {/* Penalty Summary */}
              {user && isParticipating && (
                <PenaltyTracker
                  eventId={eventId}
                  userId={user.id}
                  isExpanded={open}
                  onToggle={() => setOpen(!open)}
                />
              )}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && isParticipating && user && (
            <div className="space-y-6">
              {/* User Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Thống kê của bạn</h3>
                <EventDashboard
                  eventId={eventId}
                  onViewTracklog={(userId, userName) => {
                    setTracklogModal({ isOpen: true, userId, userName });
                  }}
                />
              </div>

              {/* Badges */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Huy hiệu</h3>
                <UserBadges eventId={eventId} userId={user.id} />
              </div>

              {/* Penalty Tracker */}
              <PenaltyTracker eventId={eventId} userId={user.id} />
            </div>
          )}
        </div>
      </div>

      {/* Tracklog Modal */}
      <UserTracklogModal
        eventId={eventId}
        userId={tracklogModal.userId}
        userName={tracklogModal.userName}
        isOpen={tracklogModal.isOpen}
        onClose={() =>
          setTracklogModal({ isOpen: false, userId: "", userName: "" })
        }
      />
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600",
    green: "from-green-500 to-green-600 text-green-600",
    purple: "from-purple-500 to-purple-600 text-purple-600",
    orange: "from-orange-500 to-orange-600 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
      <div
        className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} bg-opacity-10 mb-3`}
      >
        <div className={`${colorClasses[color].split(" ")[2]}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

// Quick Rule Card
function QuickRuleCard({ rule }: { rule: any }) {
  const getIcon = () => {
    if (rule.rule_type === "tet_bonus") return "🧧";
    if (rule.rule_type === "lucky_distance") return "🎯";
    if (rule.rule_type === "penalty_missed_day") return "💰";
    return "✨";
  };

  const getColor = () => {
    if (rule.rule_type === "tet_bonus")
      return "from-red-50 to-orange-50 border-red-200";
    if (rule.rule_type === "lucky_distance")
      return "from-yellow-50 to-amber-50 border-yellow-200";
    if (rule.rule_type === "penalty_missed_day")
      return "from-red-50 to-pink-50 border-red-200";
    return "from-blue-50 to-indigo-50 border-blue-200";
  };

  return (
    <div className={`p-4 rounded-lg border-2 bg-gradient-to-br ${getColor()}`}>
      <div className="flex items-start space-x-3">
        <span className="text-3xl">{getIcon()}</span>
        <div>
          <h4 className="font-bold text-gray-900 mb-1">{rule.name}</h4>
          <p className="text-sm text-gray-600">{rule.description}</p>
        </div>
      </div>
    </div>
  );
}
