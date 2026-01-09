// // app/comments/tv/page.tsx - PRODUCTION VERSION with Supabase Realtime
// "use client";

// import { useEffect, useRef, useState } from "react";
// import { createSupabaseClient } from "@/lib/supabase";

// type Comment = {
//   id: number;
//   author_name: string;
//   content: string;
//   created_at: string;
// };

// const EFFECTS = [
//   "effect-firework",
//   "effect-heart",
//   "effect-beer",
//   "effect-glow",
// ];

// const randomEffect = () => EFFECTS[Math.floor(Math.random() * EFFECTS.length)];

// export default function CommentsTVPage() {
//   const [comments, setComments] = useState<Comment[]>([]);
//   const [newItemIds, setNewItemIds] = useState<Set<number>>(new Set());
//   const [effectMap, setEffectMap] = useState<Record<number, string>>({});
//   const containerRef = useRef<HTMLDivElement>(null);
//   const loadedIdsRef = useRef<Set<number>>(new Set());
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const supabase = createSupabaseClient();

//   /* =========================
//      INITIAL LOAD
//   ========================== */
//   const loadComments = async () => {
//     const { data, error } = await supabase
//       .from("post_comments")
//       .select("*")
//       .order("created_at", { ascending: false });

//     if (error || !data) {
//       console.error("Error loading comments:", error);
//       return;
//     }

//     loadedIdsRef.current = new Set(data.map((c) => c.id));
//     setComments(data);
//   };

//   /* =========================
//      HANDLE NEW COMMENT
//   ========================== */
//   const handleNewComment = (newComment: Comment) => {
//     // Don't process if already loaded
//     if (loadedIdsRef.current.has(newComment.id)) return;

//     console.log("🆕 NEW COMMENT:", newComment.author_name);

//     // Add to loaded IDs
//     loadedIdsRef.current.add(newComment.id);

//     // Pick random effect
//     const effect = randomEffect();
//     setEffectMap((prev) => ({ ...prev, [newComment.id]: effect }));

//     // Mark as new
//     setNewItemIds((prev) => new Set(prev).add(newComment.id));

//     // Add to comments list (at top)
//     setComments((prev) => [newComment, ...prev]);

//     // Play sound
//     audioRef.current?.play().catch(() => {});

//     // Auto scroll to top
//     setTimeout(() => {
//       containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
//     }, 100);

//     // Remove "new" highlight after 5 seconds
//     setTimeout(() => {
//       setNewItemIds((prev) => {
//         const next = new Set(prev);
//         next.delete(newComment.id);
//         return next;
//       });
//       setEffectMap((prev) => {
//         const { [newComment.id]: _, ...rest } = prev;
//         return rest;
//       });
//     }, 5000);
//   };

//   /* =========================
//      REALTIME SUBSCRIPTION
//   ========================== */
//   // useEffect(() => {
//   //   loadComments();

//   //   // Subscribe to new inserts
//   //   const channel = supabase
//   //     .channel("post_comments_changes")
//   //     .on(
//   //       "postgres_changes",
//   //       {
//   //         event: "INSERT",
//   //         schema: "public",
//   //         table: "post_comments",
//   //       },
//   //       (payload) => {
//   //         console.log("📡 Realtime INSERT:", payload);
//   //         handleNewComment(payload.new as Comment);
//   //       }
//   //     )
//   //     .subscribe();

//   //   return () => {
//   //     supabase.removeChannel(channel);
//   //   };
//   // }, []);

//   useEffect(() => {
//     loadComments();

//     const channel = supabase
//       .channel("post_comments_tv")
//       .on(
//         "postgres_changes",
//         {
//           event: "INSERT",
//           schema: "public",
//           table: "post_comments",
//         },
//         (payload) => {
//           console.log("📡 INSERT RECEIVED:", payload.new);
//           handleNewComment(payload.new as Comment);
//         }
//       )
//       .subscribe((status) => {
//         console.log("📡 Channel status:", status);
//       });

//     return () => {
//       channel.unsubscribe();
//     };
//   }, []);

//   /* =========================
//      RENDER
//   ========================== */
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6 overflow-hidden">
//       {/* Audio notification */}
//       {/* <audio ref={audioRef} src="/sounds/notify.mp3" preload="auto" /> */}
//       <audio
//         ref={audioRef}
//         src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
//       />

//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">
//             🎭 TƯỜNG TÂM SỰ TRỰC TIẾP
//           </h1>
//           <p className="text-xl text-blue-200">
//             Realtime Wall • {comments.length} tâm sự
//           </p>
//         </div>

//         {/* Comments Wall */}
//         <div
//           ref={containerRef}
//           className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 max-h-[85vh] overflow-y-auto pb-20"
//         >
//           {comments.map((comment) => {
//             const isNew = newItemIds.has(comment.id);
//             const effect = effectMap[comment.id] || "";

//             return (
//               <div
//                 key={comment.id}
//                 className={`
//                   relative break-inside-avoid
//                   bg-white/95 backdrop-blur-sm
//                   rounded-2xl p-6 shadow-2xl
//                   transition-all duration-700
//                   ${isNew ? "animate-slideIn ring-4 ring-yellow-400" : ""}
//                   ${effect}
//                 `}
//               >
//                 {/* Timeline bar */}
//                 {isNew && (
//                   <div className="absolute top-0 left-0 h-1 w-full bg-gray-200 overflow-hidden rounded-t-2xl">
//                     <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-timeline" />
//                   </div>
//                 )}

//                 {/* NEW Badge */}
//                 {isNew && (
//                   <div className="absolute -top-3 -right-3 bg-gradient-to-r from-pink-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce">
//                     MỚI
//                   </div>
//                 )}

//                 {/* Quote */}
//                 <div className="text-5xl text-blue-200 leading-none mb-2">
//                   "
//                 </div>

//                 {/* Content */}
//                 <p className="text-lg text-gray-800 leading-relaxed mb-4">
//                   {comment.content}
//                 </p>

//                 {/* Footer */}
//                 <div className="flex items-center justify-between text-sm border-t pt-3">
//                   <span className="font-bold text-gray-900">
//                     — {comment.author_name}
//                   </span>
//                   <span className="text-gray-500">
//                     {new Date(comment.created_at).toLocaleTimeString("vi-VN", {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })}
//                   </span>
//                 </div>

//                 {/* Effects */}
//                 {effect === "effect-firework" && <FireworkEffect />}
//                 {effect === "effect-heart" && <HeartEffect />}
//                 {effect === "effect-beer" && <BeerEffect />}
//                 {effect === "effect-glow" && <GlowEffect />}
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

// /* =========================
//    EFFECT COMPONENTS
// ========================== */
// function FireworkEffect() {
//   return (
//     <>
//       {[...Array(8)].map((_, i) => (
//         <div
//           key={i}
//           className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
//           style={{ transform: `rotate(${i * 45}deg)` }}
//         >
//           <div className="firework-particle" />
//         </div>
//       ))}
//     </>
//   );
// }

// function HeartEffect() {
//   return (
//     <>
//       {[...Array(5)].map((_, i) => (
//         <div
//           key={i}
//           className="absolute bottom-0 text-4xl animate-floatUp pointer-events-none"
//           style={{
//             animationDelay: `${i * 0.3}s`,
//             left: `${30 + i * 15}%`,
//           }}
//         >
//           ❤️
//         </div>
//       ))}
//     </>
//   );
// }

// function BeerEffect() {
//   return (
//     <>
//       {[...Array(3)].map((_, i) => (
//         <div
//           key={i}
//           className="absolute bottom-0 text-5xl animate-beerPop pointer-events-none"
//           style={{
//             animationDelay: `${i * 0.4}s`,
//             left: `${20 + i * 30}%`,
//           }}
//         >
//           🍻
//         </div>
//       ))}
//     </>
//   );
// }

// function GlowEffect() {
//   return (
//     <div className="absolute inset-0 rounded-2xl pointer-events-none">
//       <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 opacity-30 animate-pulse rounded-2xl" />
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Heart } from "lucide-react";

type Comment = {
  id: number;
  author_name: string;
  content: string;
  likes: number;
  created_at: string;
};

const EFFECTS = ["firework", "heart", "beer", "glow"];
const randomEffect = () => EFFECTS[Math.floor(Math.random() * EFFECTS.length)];

export default function CommentsTVPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [effectMap, setEffectMap] = useState<Record<number, string>>({});
  const lastIdsRef = useRef<Set<number>>(new Set());

  /* Load comments */
  const loadComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) return;

    const newIds = new Set(data.map((c) => c.id));
    const oldIds = lastIdsRef.current;

    // 🔥 tìm comment mới
    const newComments = data.filter((c) => !oldIds.has(c.id));

    if (newComments.length > 0) {
      const newest = newComments[0];

      setComments((prev) => [
        ...newComments,
        ...prev.filter((c) => !newIds.has(c.id)),
      ]);

      setHighlightId(newest.id);
      setEffectMap((prev) => ({
        ...prev,
        [newest.id]: randomEffect(),
      }));

      // remove effect sau 6s
      setTimeout(() => {
        setHighlightId(null);
        setEffectMap((prev) => {
          const clone = { ...prev };
          delete clone[newest.id];
          return clone;
        });
      }, 6000);
    } else {
      setComments(data);
    }

    lastIdsRef.current = newIds;
  };

  useEffect(() => {
    loadComments();
    const interval = setInterval(loadComments, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 text-white">
      <h1 className="text-center text-6xl font-extrabold mb-14 drop-shadow-lg">
        🎉 TƯỜNG TÂM SỰ HÒA KHÁNH RUNNERS
      </h1>

      <div className="columns-3 gap-10 space-y-10">
        {comments.map((c) => {
          const isNew = c.id === highlightId;
          const effect = effectMap[c.id];

          return (
            <div
              key={c.id}
              className="break-inside-avoid rounded-3xl bg-white/95 text-gray-900 p-8 shadow-2xl relative overflow-hidden"
            >
              {/* ✨ NỘI DUNG CÓ HIỆU ỨNG */}
              <div
                className={`
                  rounded-2xl p-6 mb-6 transition-all duration-700 relative
                  ${
                    isNew
                      ? "bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 \
                         border-4 border-pink-400 shadow-[0_0_40px_rgba(236,72,153,0.8)] \
                         animate-slideIn"
                      : ""
                  }
                `}
              >
                {isNew && (
                  <div className="text-pink-600 font-extrabold mb-3 text-xl">
                    ✨ TÂM SỰ MỚI
                  </div>
                )}

                <p className="text-2xl leading-relaxed">{c.content}</p>

                {/* EFFECT LAYER */}
                {isNew && effect === "firework" && <Firework />}
                {isNew && effect === "heart" && <HeartEffect />}
                {isNew && effect === "beer" && <BeerEffect />}
                {isNew && effect === "glow" && <GlowEffect />}
              </div>

              <div className="flex justify-between items-center text-lg opacity-70">
                <span>👤 {c.author_name}</span>
                <span className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  {c.likes || 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= EFFECT COMPONENTS ================= */

function Firework() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          className="firework"
          style={{ transform: `rotate(${i * 60}deg)` }}
        />
      ))}
    </>
  );
}

function HeartEffect() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className="heart-float"
          style={{ left: `${20 + i * 15}%`, animationDelay: `${i * 0.3}s` }}
        >
          ❤️
        </span>
      ))}
    </>
  );
}

function BeerEffect() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <span
          key={i}
          className="beer-float"
          style={{ left: `${30 + i * 20}%`, animationDelay: `${i * 0.4}s` }}
        >
          🍻
        </span>
      ))}
    </>
  );
}

function GlowEffect() {
  return <div className="glow-effect" />;
}
