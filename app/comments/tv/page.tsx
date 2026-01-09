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

export default function CommentsTVPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const lastIdsRef = useRef<Set<number>>(new Set());

  /* Load comments */
  const loadComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) return;
    console.log("Loaded comments:", data);
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
      setTimeout(() => setHighlightId(null), 6000);
    } else {
      setComments(data);
    }

    lastIdsRef.current = newIds;
  };

  useEffect(() => {
    loadComments();

    const interval = setInterval(loadComments, 3000); // ⏱ 3 giây

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

          return (
            <div
              key={c.id}
              className="break-inside-avoid rounded-3xl bg-white/95 text-gray-900 p-8 shadow-2xl"
            >
              {/* ✨ CHỈ NỘI DUNG CÓ HIỆU ỨNG */}
              <div
                className={`
                  rounded-2xl p-6 mb-6 transition-all duration-700
                  ${
                    isNew
                      ? "bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 \
                         border-4 border-pink-400 \
                         shadow-[0_0_40px_rgba(236,72,153,0.8)] \
                         animate-[slideIn_0.6s_ease-out]"
                      : "bg-transparent border-0"
                  }
                `}
              >
                {isNew && (
                  <div className="text-pink-600 font-extrabold mb-3 text-xl">
                    ✨ TÂM SỰ MỚI
                  </div>
                )}

                <p className="text-2xl leading-relaxed">{c.content}</p>
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
