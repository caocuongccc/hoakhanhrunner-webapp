"use client";

import { useState, useEffect, useRef } from "react";
import { Trophy, RotateCw, Sparkles, Gift, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

type Participant = {
  id: string;
  author_name: string;
  created_at: string;
};

// 🔊 Danh sách âm thanh thông báo
const NOTIFICATION_SOUNDS = [
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", // Bell notification
  "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3", // Success notification
  "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3", // Positive notification
];

const randomSound = () =>
  NOTIFICATION_SOUNDS[Math.floor(Math.random() * NOTIFICATION_SOUNDS.length)];

export default function LuckyDrawPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [winner, setWinner] = useState("");
  const [winners, setWinners] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newParticipant, setNewParticipant] = useState<string | null>(null);

  const lastIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load participants từ database
  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("quayso")
        .select("*")
        .not("author_name", "is", null) // Chỉ lấy những người đã điểm danh (có tên)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const newIds = new Set(data.map((p) => p.id));
        const oldIds = lastIdsRef.current;

        // 🔥 Tìm người mới điểm danh
        const newPeople = data.filter((p) => !oldIds.has(p.id));

        if (newPeople.length > 0) {
          const newest = newPeople[0];

          // 🔊 Phát âm thanh
          if (audioRef.current) {
            audioRef.current.src = randomSound();
            audioRef.current.volume = 0.7;
            audioRef.current.play().catch((err) => {
              console.log("Audio play blocked:", err);
            });
          }

          // Hiển thị thông báo người mới
          setNewParticipant(newest.author_name);
          toast.success(`🎉 ${newest.author_name} vừa điểm danh!`, {
            duration: 100,
            icon: "👋",
          });

          // Tắt hiệu ứng sau 5 giây
          setTimeout(() => {
            setNewParticipant(null);
          }, 5000);
        }

        setParticipants(data);
        lastIdsRef.current = newIds;
      }
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  useEffect(() => {
    loadParticipants();

    // Polling để đảm bảo luôn update (backup cho realtime)
    const pollInterval = setInterval(loadParticipants, 3000);

    // Realtime subscription
    const channel = supabase
      .channel("realtime-quayso")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quayso",
        },
        (payload) => {
          console.log("Quayso INSERT:", payload);
          loadParticipants();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quayso",
        },
        (payload) => {
          console.log("Quayso UPDATE:", payload);
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const spinWheel = () => {
    if (isSpinning || participants.length === 0) return;

    setIsSpinning(true);
    setWinner("");
    setShowConfetti(false);

    // Lọc những người chưa trúng
    const availableParticipants = participants.filter(
      (p) => !winners.includes(p.author_name)
    );

    if (availableParticipants.length === 0) {
      toast.success("Tất cả mọi người đã trúng thưởng rồi! 🎉");
      setIsSpinning(false);
      return;
    }

    let counter = 0;
    const maxSpins = 30; // Số lần quay tên
    const interval = setInterval(() => {
      const randomIndex = Math.floor(
        Math.random() * availableParticipants.length
      );
      setCurrentName(availableParticipants[randomIndex].author_name);
      counter++;

      if (counter >= maxSpins) {
        clearInterval(interval);

        // Chọn người trúng thưởng cuối cùng
        const finalIndex = Math.floor(
          Math.random() * availableParticipants.length
        );
        const winnerName = availableParticipants[finalIndex].author_name;

        setTimeout(() => {
          setWinner(winnerName);
          setWinners((prev) => [...prev, winnerName]);
          setIsSpinning(false);
          setShowConfetti(true);

          // Tắt confetti sau 5 giây
          setTimeout(() => setShowConfetti(false), 5000);
        }, 500);
      }
    }, 100);
  };

  const resetDraw = () => {
    if (confirm("Bạn có chắc muốn reset toàn bộ kết quả quay số?")) {
      setWinners([]);
      setWinner("");
      setCurrentName("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-6 md:p-10 relative overflow-hidden">
      {/* 🔊 AUDIO TAG */}
      <audio ref={audioRef} preload="auto" className="hidden" />

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10px",
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              {["🎉", "🎊", "⭐", "✨", "🏆"][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* New Participant Notification */}
      {newParticipant && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3">
            <UserPlus className="w-6 h-6" />
            <span className="text-xl font-bold">
              👋 {newParticipant} vừa điểm danh!
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-4">
          <Trophy className="h-16 w-16 text-white" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
          🎰 Quay Số May Mắn HKR
        </h1>
        <p className="text-xl text-white/90">
          {participants.length} người tham gia • {winners.length} đã trúng
          thưởng
        </p>
      </div>

      {/* Main Spin Area */}
      <div className="max-w-4xl mx-auto">
        {/* Wheel Display */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-12 mb-8 shadow-2xl">
          <div className="relative">
            {/* Spinning Name Display */}
            <div
              className={`
              bg-gradient-to-r from-yellow-400 to-orange-500
              rounded-2xl p-12 md:p-16
              transform transition-all duration-300
              ${isSpinning ? "scale-105 shadow-2xl" : "scale-100"}
            `}
            >
              <div className="text-center">
                {!currentName && !winner && (
                  <div className="text-white/70 text-3xl font-bold">
                    Nhấn nút để bắt đầu! 🎯
                  </div>
                )}

                {(isSpinning || currentName) && !winner && (
                  <div
                    className={`
                    text-white text-4xl md:text-6xl font-black
                    ${isSpinning ? "animate-pulse" : ""}
                  `}
                  >
                    {currentName}
                  </div>
                )}

                {winner && (
                  <div className="space-y-4 animate-bounce">
                    <Sparkles className="w-16 h-16 text-white mx-auto" />
                    <div className="text-white text-5xl md:text-7xl font-black">
                      {winner}
                    </div>
                    <div className="text-white/90 text-2xl font-semibold">
                      🎊 Chúc mừng! 🎊
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <button
              onClick={spinWheel}
              disabled={isSpinning || participants.length === 0}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-6
                bg-gradient-to-r from-green-500 to-emerald-600
                text-white text-2xl font-bold rounded-2xl
                hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed
                transition-all transform hover:scale-105 active:scale-95"
            >
              <RotateCw
                className={`w-7 h-7 ${isSpinning ? "animate-spin" : ""}`}
              />
              {isSpinning ? "Đang quay..." : "Quay số"}
            </button>

            <button
              onClick={resetDraw}
              className="px-6 py-4 bg-white/20 backdrop-blur-sm text-white
                font-semibold rounded-2xl hover:bg-white/30 transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Winners List */}
        {winners.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-6 h-6" />
              Danh sách trúng thưởng
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {winners.map((name, index) => (
                <div
                  key={index}
                  className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-purple-900">
                    {index + 1}
                  </div>
                  <div className="text-white font-semibold text-lg">{name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants Preview */}
        <div className="mt-8 text-center">
          <details className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
            <summary className="text-white font-semibold cursor-pointer hover:text-yellow-300 transition-colors">
              Xem danh sách {participants.length} người tham gia
            </summary>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className={`
                    p-2 rounded-lg text-sm
                    ${
                      winners.includes(p.author_name)
                        ? "bg-yellow-400/30 text-yellow-100 line-through"
                        : p.author_name === newParticipant
                          ? "bg-green-400/50 text-white font-bold animate-pulse"
                          : "bg-white/20 text-white"
                    }
                  `}
                >
                  {p.author_name}
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
