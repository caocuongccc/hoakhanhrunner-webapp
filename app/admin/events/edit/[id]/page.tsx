"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Upload, Save, X } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import RulesSelector from "@/components/RulesSelector";

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    image_url: "",
  });

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;

      setFormData({
        name: event.name,
        description: event.description || "",
        event_type: event.event_type,
        start_date: event.start_date,
        end_date: event.end_date,
        password: event.password || "",
        max_team_members: event.max_team_members?.toString() || "",
        image_url: event.image_url || "",
      });

      if (event.image_url) {
        setImagePreview(event.image_url);
      }

      // Load event rules
      const { data: eventRules } = await supabase
        .from("event_rules")
        .select("rule_id")
        .eq("event_id", eventId);

      if (eventRules) {
        setSelectedRules(eventRules.map((er) => er.rule_id));
      }
    } catch (error) {
      console.error("Error loading event:", error);
      alert("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

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
      const formDataUpload = new FormData();
      formDataUpload.append("file", imageFile);
      formDataUpload.append("folder", "events");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
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
    setSaving(true);

    try {
      // Validate dates
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        alert("Ngày kết thúc phải sau ngày bắt đầu!");
        setSaving(false);
        return;
      }

      // Upload new image if exists
      let imageUrl = formData.image_url;
      if (imageFile) {
        const newImageUrl = await uploadImage();
        if (newImageUrl) {
          imageUrl = newImageUrl;
        }
      }

      // Update event
      const { error } = await supabase
        .from("events")
        .update({
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) throw error;

      // Update rules - delete old and insert new
      await supabase.from("event_rules").delete().eq("event_id", eventId);

      if (selectedRules.length > 0) {
        const ruleInserts = selectedRules.map((ruleId) => ({
          event_id: eventId,
          rule_id: ruleId,
        }));

        const { error: rulesError } = await supabase
          .from("event_rules")
          .insert(ruleInserts);

        if (rulesError) {
          console.error("Error updating rules:", rulesError);
        }
      }

      alert("Cập nhật sự kiện thành công!");
      router.push("/admin/events");
    } catch (error: any) {
      console.error("Error updating event:", error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">
            Chỉnh sửa sự kiện
          </h1>
          <p className="text-gray-600 mt-1">Cập nhật thông tin sự kiện</p>
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

          {/* Max Team Members */}
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
            />
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
                    setFormData({ ...formData, image_url: "" });
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
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
