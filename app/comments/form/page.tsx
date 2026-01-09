"use client";

import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function CommentsFormPage() {
  const [formData, setFormData] = useState({
    author_name: "",
    content: "",
    year: new Date().getFullYear(),
  });
  const [submitting, setSubmitting] = useState(false);
  const FUNNY_NAMES = [
    "Runner giấu tên 🏃",
    "Chạy cho vui 😆",
    "Vận động viên ngủ gật 😴",
    "PR hụt nhưng vui 😅",
    "Chạy không pace 📉",
    "Đồng run huyền thoại 😎",
    "Runner hệ ăn 😋",
    "Chạy xong mới nhớ 😵",
    "Người lạc nhịp 💨",
    "Anh/chị em HKR 💜",
  ];
  const getRandomName = () =>
    FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)];

  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      toast.error("Chưa nhập nội dung kìa 😅");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Đang gửi tâm sự...");

    try {
      const authorName = formData.author_name.trim()
        ? formData.author_name.trim()
        : getRandomName();
      console.log("Submitting comment by:", authorName);
      /* ✅ INSERT thẳng vào Supabase */
      const { error } = await supabase.from("post_comments").insert([
        {
          author_name: authorName,
          content: formData.content,
          year: formData.year,
        },
      ]);
      if (error) throw error;

      toast.success("🎉 Đã gửi thành công!", { id: toastId });

      setFormData({
        author_name: "",
        content: "",
        year: new Date().getFullYear(),
      });

      // Redirect to display page
      window.location.href = "/comments/display";
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("❌ Gửi thất bại, thử lại nhé!", error, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            💬 Chia Sẻ Tâm Sự
          </h1>
          <p className="text-xl text-gray-600">
            Hãy để lại những cảm xúc, kỷ niệm và mong ước của bạn về CLB
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Tên của bạn <span className="text-red-500">*</span>
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

            {/* Content Textarea */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Tâm sự của bạn <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={8}
                className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none resize-none transition-colors"
                placeholder="Chia sẻ những kỷ niệm đẹp, cảm xúc, hoặc mong ước của bạn về Hòa Khánh Runners trong năm qua..."
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
                <strong>💡 Gợi ý:</strong> Bạn có thể chia sẻ về những buổi chạy
                đáng nhớ, những người bạn mới, mục tiêu đã đạt được, hoặc ước mơ
                cho năm tới...
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
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
        <p className="text-center text-gray-500 mt-6">
          Tất cả tâm sự sẽ được hiển thị công khai trên tường tâm sự của CLB
        </p>
      </div>
    </div>
  );
}
