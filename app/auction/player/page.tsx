"use client";

import { useState, useEffect } from "react";
import { Gavel, TrendingUp, Clock, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type AuctionConfig = {
  id: string;
  item_name: string;
  item_image: string;
  starting_price: number;
  bid_increment: number;
  is_active: boolean;
};

export default function AuctionPlayerPage() {
  const [auction, setAuction] = useState<AuctionConfig | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [userLastBid, setUserLastBid] = useState<number | null>(null);
  const [lastBidTime, setLastBidTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [userName, setUserName] = useState("");
  const [cooldownTimer, setCooldownTimer] = useState(0);

  const COOLDOWN_SECONDS = 10; // 10 giây mới được đấu lại

  function getDeviceId() {
    let id = localStorage.getItem("qr_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("qr_device_id", id);
    }
    return id;
  }

  // Load auction config và bid info
  const loadAuction = async () => {
    try {
      const { data: auctionData, error: auctionError } = await supabase
        .from("auction_config")
        .select("*")
        .eq("is_active", true)
        .single();

      if (auctionError) {
        console.error("Error loading auction:", auctionError);
        setLoading(false);
        return;
      }

      setAuction(auctionData);

      // Lấy bid cao nhất hiện tại
      const { data: highestBid } = await supabase
        .from("auction_bids")
        .select("bid_amount, created_at")
        .eq("auction_id", auctionData.id)
        .order("bid_amount", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (highestBid) {
        setCurrentBid(highestBid.bid_amount);
        setLastBidTime(highestBid.created_at);
      } else {
        // Chưa có bid nào, dùng giá khởi điểm
        setCurrentBid(auctionData.starting_price);
        setLastBidTime(null);
      }

      // Lấy bid của user
      const deviceId = getDeviceId();
      const { data: userBid } = await supabase
        .from("auction_bids")
        .select("bid_amount, created_at")
        .eq("auction_id", auctionData.id)
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (userBid) {
        setUserLastBid(userBid.bid_amount);

        // Tính cooldown
        const lastBidDate = new Date(userBid.created_at);
        const now = new Date();
        const secondsElapsed = Math.floor(
          (now.getTime() - lastBidDate.getTime()) / 1000
        );
        const remainingCooldown = Math.max(
          0,
          COOLDOWN_SECONDS - secondsElapsed
        );

        setCooldownTimer(remainingCooldown);
      } else {
        setUserLastBid(null);
        setCooldownTimer(0);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading auction:", error);
      setLoading(false);
    }
  };

  // Load user name từ quayso
  const loadUserName = async () => {
    try {
      const deviceId = getDeviceId();

      const { data, error } = await supabase
        .from("quayso")
        .select("author_name")
        .eq("device_id", deviceId)
        .single();

      if (error) {
        console.error("Error loading user name:", error);
        return;
      }

      if (data?.author_name) {
        setUserName(data.author_name);
      }
    } catch (error) {
      console.error("Error loading user name:", error);
    }
  };

  useEffect(() => {
    loadAuction();
    loadUserName();

    // Polling mỗi 3 giây để cập nhật giá
    const interval = setInterval(loadAuction, 3000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldownTimer > 0) {
      const timer = setTimeout(() => {
        setCooldownTimer(cooldownTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTimer]);

  const handleBid = async () => {
    if (!auction || !userName) return;
    if (cooldownTimer > 0) return;

    setBidding(true);

    try {
      const deviceId = getDeviceId();
      const newBid = currentBid + auction.bid_increment;

      console.log("Placing bid:", {
        deviceId,
        userName,
        newBid,
      });

      const { error } = await supabase.from("auction_bids").insert([
        {
          auction_id: auction.id,
          device_id: deviceId,
          bidder_name: userName,
          bid_amount: newBid,
        },
      ]);

      if (error) throw error;

      toast.success(
        `🎉 Đấu giá thành công: ${newBid.toLocaleString("vi-VN")}đ`
      );

      // Update local state
      setCurrentBid(newBid);
      setUserLastBid(newBid);
      setLastBidTime(new Date().toISOString());

      // Bắt đầu cooldown
      setCooldownTimer(COOLDOWN_SECONDS);

      // Show success animation
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"
      );
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (error) {
      console.error("Error placing bid:", error);
      toast.error("❌ Đấu giá thất bại, thử lại!");
    } finally {
      setBidding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          Đang tải đấu giá...
        </div>
      </div>
    );
  }

  if (!auction || !auction.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <Gavel className="w-24 h-24 text-gray-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">
            Chưa có phiên đấu giá nào
          </h1>
          <p className="text-gray-400">Vui lòng quay lại sau</p>
        </div>
      </div>
    );
  }

  if (!userName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center">
          <Gavel className="w-20 h-20 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bạn chưa đủ điều kiện
          </h2>
          <p className="text-gray-600 mb-6">
            Vui lòng gửi tâm sự trước để tham gia đấu giá
          </p>
          <button
            onClick={() => (window.location.href = "/comments/form")}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-full hover:shadow-xl transition-all"
          >
            Gửi tâm sự ngay
          </button>
        </div>
      </div>
    );
  }

  const nextBid = currentBid + auction.bid_increment;
  const canBid = cooldownTimer === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-lg">
            🔥 Đấu Giá Online
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <Gavel className="w-12 h-12 text-white" />
            </div>
          </h1>
          <p className="text-white/90 text-lg">Chào {userName}! 👋</p>
        </div>

        {/* Item Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
          {/* Image */}
          <div className="relative h-64 md:h-80 bg-gray-200">
            <img
              src={auction.item_image}
              alt={auction.item_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full font-bold animate-pulse">
              🔴 ĐANG LIVE
            </div>
          </div>

          {/* Info */}
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {auction.item_name}
            </h2>

            {/* Current Price */}
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Giá hiện tại</p>
                  <p className="text-4xl font-black text-orange-600">
                    {currentBid.toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-500" />
              </div>

              {lastBidTime && (
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Lần đấu cuối:{" "}
                  {new Date(lastBidTime).toLocaleTimeString("vi-VN")}
                </div>
              )}
            </div>

            {/* Next Bid */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Giá đấu tiếp theo</p>
              <p className="text-2xl font-bold text-gray-900">
                {nextBid.toLocaleString("vi-VN")}đ
                <span className="text-sm text-green-600 ml-2">
                  (+{auction.bid_increment.toLocaleString("vi-VN")}đ)
                </span>
              </p>
            </div>

            {/* Bid Button */}
            <button
              onClick={handleBid}
              disabled={!canBid || bidding}
              className={`
                w-full py-6 rounded-2xl font-bold text-xl
                transition-all transform
                ${
                  canBid && !bidding
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 hover:shadow-2xl"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
            >
              {bidding ? (
                "Đang đấu giá..."
              ) : cooldownTimer > 0 ? (
                <>
                  <Zap className="inline-block w-6 h-6 mr-2" />
                  Chờ {cooldownTimer}s để đấu tiếp
                </>
              ) : (
                <>
                  <Gavel className="inline-block w-6 h-6 mr-2" />
                  Đấu giá {nextBid.toLocaleString("vi-VN")}đ
                </>
              )}
            </button>

            {userLastBid && (
              <p className="text-center text-sm text-green-600 mt-4 font-semibold">
                ✅ Bạn đã đấu giá: {userLastBid.toLocaleString("vi-VN")}đ
              </p>
            )}
          </div>
        </div>

        {/* View Leaderboard */}
        <div className="text-center">
          <a
            href="/auction/leaderboard"
            className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-white/30 transition-all"
          >
            📊 Xem bảng xếp hạng
          </a>
        </div>
      </div>
    </div>
  );
}
