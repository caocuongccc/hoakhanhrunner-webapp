"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Heart, Plus } from "lucide-react";
import toast from "react-hot-toast";

type Comment = {
  id: number;
  author_name: string;
  content: string;
  likes: number;
  created_at: string;
};

export default function CommentsDisplayPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  const isTVMode = pathname.includes("/comments/tv");

  /* Load comments ban đầu */
  const loadComments = async () => {
    const { data, error } = await supabase
      .from("post_comments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setComments(data || []);
  };
  function getDeviceId() {
    let id = localStorage.getItem("qr_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("qr_device_id", id);
    }
    return id;
  }
  async function initQuaySo() {
    const deviceId = getDeviceId();
    // toast.success("Tất cả mọi người đã trúng thưởng rồi! 🎉" + deviceId);
    const { error: quaysoError } = await supabase.from("quayso").upsert(
      {
        device_id: deviceId,
        author_name: null, // chưa nhập
      },
      { onConflict: "device_id" }
    );

    if (quaysoError) {
      toast.success("Error initializing quayso:" + JSON.stringify(quaysoError));
    }
  }
  useEffect(() => {
    toast.success(" ");
    initQuaySo();
  }, []);

  useEffect(() => {
    loadComments();

    /* 🔴 Realtime */
    const channel = supabase
      .channel("realtime-comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments" },
        (payload) => {
          const newComment = payload.new as Comment;

          setComments((prev) => [newComment, ...prev]);
          setHighlightId(newComment.id);

          setTimeout(() => setHighlightId(null), 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-yellow-100 to-blue-200 p-10 relative">
      {/* Header */}
      <h1 className="text-center text-5xl font-extrabold mb-12 drop-shadow">
        🎉 Tường Tâm Sự HKR
      </h1>

      {/* 👉 NÚT THÊM COMMENT (ẨN Ở TV MODE) */}
      {!isTVMode && (
        <div className="flex justify-center mb-10">
          <button
            onClick={() => router.push("/comments/form")}
            className="flex items-center gap-2 px-8 py-4
              bg-gradient-to-r from-pink-500 to-purple-600
              text-white font-bold rounded-full shadow-xl
              hover:scale-105 transition-transform"
          >
            <Plus className="w-5 h-5" />
            Gửi tâm sự của bạn
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {comments.map((c) => {
          const isNew = c.id === highlightId;

          return (
            <div
              key={c.id}
              className="break-inside-avoid rounded-3xl p-6 shadow-xl bg-white/90"
            >
              {/* ✨ CHỈ DIV NỘI DUNG CÓ HIỆU ỨNG */}
              <div
                className={`
                  rounded-2xl p-4 mb-4
                  transition-all duration-700 ease-out
                  ${
                    isNew
                      ? "bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 \
                         border-4 border-pink-400 \
                         shadow-[0_0_30px_rgba(236,72,153,0.6)] \
                         animate-[slideIn_0.6s_ease-out]"
                      : "bg-transparent border-0"
                  }
                `}
              >
                {isNew && (
                  <div className="text-pink-600 font-bold mb-2">
                    ✨ Tâm sự mới
                  </div>
                )}
                <p className="text-lg leading-relaxed">{c.content}</p>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center text-sm opacity-70">
                <span>👤 {c.author_name}</span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-pink-500" />
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
