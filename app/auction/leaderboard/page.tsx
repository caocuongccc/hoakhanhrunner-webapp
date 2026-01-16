"use client";
import { useState, useEffect, useRef } from "react";
import { Trophy, TrendingUp, Clock, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";

type BidEntry = {
  id: string;
  bidder_name: string;
  bid_amount: number;
  created_at: string;
  rank: number;
  is_new?: boolean;
};

type AuctionConfig = {
  item_name: string;
  item_image: string;
};

export default function AuctionLeaderboardPage() {
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [auction, setAuction] = useState<AuctionConfig | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const lastIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadData = async () => {
    try {
      // Mock data

      // Production code:
      const { data: auctionData } = await supabase
        .from("auction_config")
        .select("item_name, item_image")
        .eq("is_active", true)
        .single();

      const { data: bidsData } = await supabase
        .from("auction_bids")
        .select("*")
        .order("bid_amount", { ascending: false })
        .order("created_at", { ascending: true });

      // // Group by bidder_name, lấy bid cao nhất
      const bidsByUser = new Map();
      bidsData.forEach((bid) => {
        const existing = bidsByUser.get(bid.bidder_name);
        if (!existing || bid.bid_amount > existing.bid_amount) {
          bidsByUser.set(bid.bidder_name, bid);
        }
      });
      //
      const sortedBids = Array.from(bidsByUser.values())
        .sort((a, b) => b.bid_amount - a.bid_amount)
        .map((bid, index) => ({ ...bid, rank: index + 1 }));

      const newIds = new Set(sortedBids.map((b) => b.id));
      const oldIds = lastIdsRef.current;

      // Detect new bids
      const newBids = sortedBids.filter((b) => !oldIds.has(b.id));

      if (newBids.length > 0) {
        const newest = newBids[0];
        setHighlightId(newest.id);

        // Play sound
        if (audioRef.current) {
          audioRef.current.src =
            "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3";
          audioRef.current.volume = 0.6;
          audioRef.current.play().catch(() => {});
        }

        // Clear highlight after 5s
        setTimeout(() => setHighlightId(null), 5000);
      }

      setAuction(auctionData);
      setBids(sortedBids);
      lastIdsRef.current = newIds;
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Get podium colors
  const getPodiumColor = (rank: number) => {
    if (rank === 1) return "from-yellow-400 to-yellow-600";
    if (rank === 2) return "from-gray-300 to-gray-500";
    if (rank === 3) return "from-amber-600 to-amber-800";
    return "from-blue-400 to-blue-600";
  };

  const getPodiumIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-6 md:p-10 relative overflow-hidden">
      <audio ref={audioRef} preload="auto" className="hidden" />

      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <Trophy className="w-16 h-16 text-yellow-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
            🔥 Bảng Xếp Hạng Đấu Giá
          </h1>
          {auction && (
            <p className="text-xl text-white/90">{auction.item_name}</p>
          )}
        </div>

        {/* Top 3 Podium */}
        {bids.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
            {/* 2nd Place */}
            <div className="mt-8">
              <div className="bg-gradient-to-b from-gray-300 to-gray-500 rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
                <div className="text-5xl mb-2">🥈</div>
                <div className="text-white font-bold text-lg mb-2">
                  {bids[1].bidder_name}
                </div>
                <div className="text-2xl font-black text-white">
                  {bids[1].bid_amount.toLocaleString("vi-VN")}đ
                </div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full font-bold text-sm animate-bounce">
                  👑 QUÁN QUÂN
                </div>
              </div>
              <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-2xl p-8 text-center transform hover:scale-105 transition-transform shadow-2xl">
                <div className="text-6xl mb-2 animate-pulse">🥇</div>
                <div className="text-white font-bold text-xl mb-2">
                  {bids[0].bidder_name}
                </div>
                <div className="text-3xl font-black text-white">
                  {bids[0].bid_amount.toLocaleString("vi-VN")}đ
                </div>
                <Flame className="w-8 h-8 text-red-500 mx-auto mt-2 animate-pulse" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="mt-8">
              <div className="bg-gradient-to-b from-amber-600 to-amber-800 rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
                <div className="text-5xl mb-2">🥉</div>
                <div className="text-white font-bold text-lg mb-2">
                  {bids[2].bidder_name}
                </div>
                <div className="text-2xl font-black text-white">
                  {bids[2].bid_amount.toLocaleString("vi-VN")}đ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Toàn bộ bảng xếp hạng
          </h2>

          <div className="space-y-3">
            {bids.map((bid, index) => {
              const isHighlight = bid.id === highlightId;
              const isTop3 = bid.rank <= 3;

              return (
                <div
                  key={bid.id}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl
                    transition-all duration-700 transform
                    ${
                      isHighlight
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 scale-105 shadow-2xl animate-pulse"
                        : isTop3
                          ? "bg-white/20"
                          : "bg-white/10"
                    }
                  `}
                  style={{
                    animation: isHighlight
                      ? "slideInRight 0.5s ease-out"
                      : "none",
                  }}
                >
                  {/* Rank Badge */}
                  <div
                    className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    text-2xl font-black text-white
                    bg-gradient-to-br ${getPodiumColor(bid.rank)}
                    ${isHighlight ? "animate-spin" : ""}
                  `}
                  >
                    {getPodiumIcon(bid.rank)}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        {bid.bidder_name}
                      </span>
                      {isHighlight && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                          MỚI!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(bid.created_at).toLocaleTimeString("vi-VN")}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div
                      className={`
                      text-2xl font-black
                      ${isHighlight ? "text-white" : "text-yellow-400"}
                    `}
                    >
                      {bid.bid_amount.toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <a
            href="/auction/player"
            className="inline-block px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-bold rounded-full hover:bg-white/30 transition-all"
          >
            ⬅️ Quay lại đấu giá
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
