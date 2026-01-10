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

// 🔊 Danh sách âm thanh thông báo
const NOTIFICATION_SOUNDS = [
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", // Bell notification
  "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3", // Success notification
  "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3", // Positive notification
  "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3", // Ding sound
];

const TITLES = [
  "CHUYỆN CHẠY CỦA ANH EM HKR",
  "CHẠY XONG KỂ CHUYỆN",
  "HKR – CHẠY LÀ CHÍNH, KỂ LÀ PHỤ",
  "MẤY CHUYỆN SAU BUỔI CHẠY",
  "ANH EM HKR NÓI GÌ NÈ",
  "PACE TỤT NHƯNG TÂM SỰ TĂNG",
  "CHẠY CHẬM NHƯNG KỂ NHIỀU",
  "CHUYỆN ĐỜI RUNNERS HÒA KHÁNH",
  "SAU GIỜ CHẠY, TỚI GIỜ KỂ",
  "HKR – CHẠY CHUNG, VUI CHUNG",
];

const randomSound = () =>
  NOTIFICATION_SOUNDS[Math.floor(Math.random() * NOTIFICATION_SOUNDS.length)];

export default function CommentsTVPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [effectMap, setEffectMap] = useState<Record<number, string>>({});
  const lastIdsRef = useRef<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);

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

      // 🔊 Chọn random âm thanh và play
      if (audioRef.current) {
        audioRef.current.src = randomSound();
        audioRef.current.volume = 0.7; // Âm lượng 70%
        audioRef.current.play().catch((err) => {
          console.log("Audio play blocked:", err);
        });
      }

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
    const timer = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % TITLES.length);
    }, 15000); // 15s

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadComments();
    const interval = setInterval(loadComments, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 text-white">
      {/* 🔊 AUDIO TAG - ĐẶT Ở NGOÀI VÒNG LẶP */}
      <audio ref={audioRef} preload="auto" className="hidden" />

      <h1 className="text-center text-6xl font-extrabold mb-14 drop-shadow-lg">
        🎉 {TITLES[titleIndex]}
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
                  <div className="text-pink-600 font-extrabold mb-3 text-xl animate-pulse">
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
