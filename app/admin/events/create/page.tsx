"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Save, X } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import RulesSelector from "@/components/RulesSelector";

export default function CreateEventPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedRules, setSelectedRules] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    event_type: "individual" as "team" | "individual",
    start_date: "",
    end_date: "",
    password: "",
    max_team_members: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("folder", "events");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        return data.url;
      }
      throw new Error("Upload failed");
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate dates
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        alert("Ngày kết thúc phải sau ngày bắt đầu!");
        setLoading(false);
        return;
      }

      // Upload image if exists
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Get current user from cookie
      const sessionResponse = await fetch("/api/auth/session");
      const sessionData = await sessionResponse.json();

      if (!sessionData.user) {
        alert("Bạn cần đăng nhập!");
        setLoading(false);
        return;
      }

      // Create event
      const { data: event, error } = await supabase
        .from("events")
        .insert([
          {
            name: formData.name,
            description: formData.description,
            event_type: formData.event_type,
            start_date: formData.start_date,
            end_date: formData.end_date,
            password: formData.password || null,
            max_team_members: formData.max_team_members
              ? parseInt(formData.max_team_members)
              : null,
            image_url: imageUrl,
            created_by: sessionData.user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add selected rules
      if (selectedRules.length > 0) {
        const ruleInserts = selectedRules.map((ruleId) => ({
          event_id: event.id,
          rule_id: ruleId,
        }));

        const { error: rulesError } = await supabase
          .from("event_rules")
          .insert(ruleInserts);

        if (rulesError) {
          console.error("Error adding rules:", rulesError);
        }
      }

      alert("Tạo sự kiện thành công!");
      router.push("/admin/events");
    } catch (error: any) {
      console.error("Error creating event:", error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/events"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tạo sự kiện mới</h1>
          <p className="text-gray-600 mt-1">
            Điền thông tin sự kiện và chọn luật chơi
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md p-6 space-y-6"
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Thông tin cơ bản</h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên sự kiện <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="VD: Breaking PR Challenge 2024"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mô tả chi tiết về sự kiện..."
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại sự kiện <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="individual"
                  checked={formData.event_type === "individual"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      event_type: e.target.value as "individual",
                    })
                  }
                  className="w-4 h-4 text-blue-600"
                />
                <span>Cá nhân</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="team"
                  checked={formData.event_type === "team"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      event_type: e.target.value as "team",
                    })
                  }
                  className="w-4 h-4 text-blue-600"
                />
                <span>Theo đội</span>
              </label>
            </div>
          </div>

          {/* Max Team Members (only for team events) */}
          {formData.event_type === "team" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số thành viên tối đa mỗi đội
              </label>
              <input
                type="number"
                min="2"
                value={formData.max_team_members}
                onChange={(e) =>
                  setFormData({ ...formData, max_team_members: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: 10"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu tham gia (tùy chọn)
            </label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Để trống nếu không cần mật khẩu"
            />
            <p className="text-sm text-gray-500 mt-1">
              Nếu đặt mật khẩu, người dùng cần nhập mật khẩu để tham gia sự kiện
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hình ảnh sự kiện
            </label>

            {imagePreview ? (
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click để upload</span> hoặc
                    kéo thả
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF (MAX. 5MB)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>
        </div>

        {/* Rules Selection */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Luật chơi</h2>
          <RulesSelector
            selectedRules={selectedRules}
            onChange={setSelectedRules}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4 border-t pt-6">
          <Link
            href="/admin/events"
            className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Đang tạo...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Tạo sự kiện</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
