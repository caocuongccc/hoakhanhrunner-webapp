"use client";

import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { set } from "date-fns";

export default function CommentsFormPage() {
  const [formData, setFormData] = useState({
    author_name: "",
    content: "",
    year: new Date().getFullYear(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const FUNNY_NAMES = [
    "Runner giấu tên 🏃",
    "Chạy cho vui 😆",
    "Vận động viên ngủ gật 😴",
    "PR hụt nhưng vui 😅",
    "Chạy không pace 📉",
    "Đồng run huyền thoại 😎",
    "Chạy xong mới nhớ 😵",
    "Người lạc nhịp 💨",
    "Anh/chị em HKR 💜",
    "PR hụt 3 giây 😭",
    "Chạy tạch nhưng vẫn cười 😅",
    "Pace bay màu 💨",
    "Sub đâu không thấy 🤡",
    "Người về nhì… từ dưới lên",
    "Suýt nữa thì PR 🤏",
    "Chạy cho biết mùi đời chạy bộ 🖥️",
    "Ngủ quên giờ chạy ⏰💤",
    "Báo thức kêu cho vui",
    "Runner hệ ngủ 😴",
    "Dậy rồi lại ngủ tiếp",
    "Chạy để ăn 🍜",
    "Ăn rồi chạy 🥢",
    "Hẹn buổi sau chạy bù",
    "Chạy trong giấc mơ 🌙",
    "Gãy bài từ km thứ 2 💀",
    "Runner hệ ăn 😋",
    "Chạy xong là kiếm quán",
    "Uống nước mạnh hơn chạy",
    "Ông vua support 👑",
    "Người giữ trạm nước huyền thoại",
    "Đồng run quốc dân",
    "Tới cho đủ hình 📸",
  ];
  function getDeviceId() {
    let id = localStorage.getItem("qr_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("qr_device_id", id);
    }
    return id;
  }
  const getRandomName = () =>
    FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)];

  const handleSubmit = async () => {
    // Validate tên (bắt buộc)
    if (!formData.author_name.trim() && !userName) {
      toast.error("⚠️ Vui lòng nhập tên để tham gia quay số may mắn! 😅");
      return;
    }

    // Validate nội dung
    if (!formData.content.trim()) {
      toast.error("⚠️ Chưa nhập nội dung kìa 😅");
      return;
    }

    setSubmitting(true);

    try {
      const realName = formData.author_name.trim();
      const displayName = getRandomName();

      console.log("Submitting with:");
      console.log("- Real name (for quayso):", realName);
      console.log("- Display name (for post_comments):", displayName);

      // 👉 CHƯA CÓ TÊN → THÊM VAO BẢNG
      if (!userName) {
        // 1️⃣ Lưu tên THẬT vào bảng quayso
        const { error: quaysoError } = await supabase
          .from("quayso")
          .update({ author_name: realName })
          .eq("device_id", getDeviceId());

        if (quaysoError) throw quaysoError;
      }
      // 2️⃣ Lưu comment với tên NGẪU NHIÊN vào post_comments
      const { error: commentError } = await supabase
        .from("post_comments")
        .insert([
          {
            author_name: displayName,
            content: formData.content,
            year: formData.year,
          },
        ]);

      if (commentError) throw commentError;

      toast.success(
        "🎉 Đã gửi thành công! Bạn đã được tham gia quay số may mắn"
      );
      // Reset form
      setFormData({
        author_name: "",
        content: "",
        year: new Date().getFullYear(),
      });

      // Redirect về display page
      setTimeout(() => {
        window.location.href = "/comments/display";
      }, 500);
    } catch (error) {
      toast.error("❌ Gửi thất bại, thử lại nhé!" + JSON.stringify(error), {
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };
  const loadData = async () => {
    const deviceId = getDeviceId();
    const { data, error } = await supabase
      .from("quayso")
      .select("author_name")
      .eq("device_id", deviceId)
      .single();
    if (error) {
      console.error(error);
      return;
    }
    setUserName(data?.author_name || "");
    return data;
  };
  useState(() => {
    loadData();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            💬 Chia Sẻ Tâm Sự
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Hãy để lại những cảm xúc, kỷ niệm và mong ước của bạn về CLB
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10">
          <div className="space-y-6">
            {/* Name Input */}
            {!userName ? (
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Nhập tên của bạn (để tham gia quay số may mắn){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) =>
                    setFormData({ ...formData, author_name: e.target.value })
                  }
                  className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
            ) : (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl">
                <p className="text-green-800">
                  🎉 Bạn đã đăng ký tên "<strong>{userName}</strong>" để tham
                  gia quay số may mắn!
                </p>
              </div>
            )}
            {/* Content Textarea */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Nhập chia sẻ của bạn <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={5}
                className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none resize-none transition-colors"
                placeholder="Bạn có thể chia sẻ về những buổi chạy đáng nhớ, những người bạn mới, mục tiêu đã đạt được, hoặc ước mơ cho năm tới..."
              />
              <div className="flex justify-between mt-2">
                <p className="text-sm text-gray-500">
                  {formData.content.length} ký tự
                </p>
                <p className="text-sm text-gray-400">Năm {formData.year}</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Lưu ý:</strong> Tên của bạn sẽ được dùng để tham gia
                quay số may mắn. Tâm sự sẽ hiển thị với tên ngẫu nhiên để BẢO
                MẬT danh tính.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={() => (window.location.href = "/comments/display")}
                className="flex-1 px-8 py-4 text-lg border-2 border-gray-300 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-colors"
              >
                Xem tất cả tâm sự
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:shadow-2xl disabled:opacity-50 transition-all transform hover:scale-105"
              >
                {submitting ? (
                  <span>Đang gửi...</span>
                ) : (
                  <>
                    <Send className="inline-block mr-2 h-5 w-5" />
                    Gửi tâm sự
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <p className="text-center text-gray-500 mt-6 text-sm md:text-base">
          Tên của bạn được dùng để tham gia quay số. Tâm sự sẽ hiển thị ẨN DANH.
        </p>
      </div>
    </div>
  );
}
