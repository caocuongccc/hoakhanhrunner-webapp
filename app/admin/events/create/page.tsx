// app/admin/events/create/page.tsx - FIXED FOREIGN KEY ISSUE
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Save, X } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import RulesSelector from "@/components/RulesSelector";
import { useAdminAuth } from "@/components/AdminAuthProvider";

export default function CreateEventPage() {
  const router = useRouter();
  const { admin, loading: authLoading } = useAdminAuth();
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
    start_time: "00:00",
    end_date: "",
    end_time: "23:59",
    password: "",
    max_team_members: "",
    num_teams: "",
  });

  // Redirect if not admin
  if (!authLoading && !admin) {
    router.push("/admin-login");
    return null;
  }

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

    if (!admin) {
      alert("Bạn cần đăng nhập với tư cách admin!");
      router.push("/admin-login");
      return;
    }

    setLoading(true);

    try {
      // Validate dates
      const startDateTime = `${formData.start_date}T${formData.start_time}:00`;
      const endDateTime = `${formData.end_date}T${formData.end_time}:00`;

      if (new Date(endDateTime) < new Date(startDateTime)) {
        alert("Thời gian kết thúc phải sau thời gian bắt đầu!");
        setLoading(false);
        return;
      }

      // Auto-determine status based on dates
      const now = new Date();
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);

      let eventStatus: "pending" | "active" | "completed" | "cancelled" =
        "pending";
      if (now >= startDate && now <= endDate) {
        eventStatus = "active";
      } else if (now > endDate) {
        eventStatus = "completed";
      } else {
        eventStatus = "pending";
      }

      // Validate team event requirements
      if (formData.event_type === "team") {
        if (selectedRules.length === 0) {
          alert("Sự kiện theo đội phải chọn ít nhất 1 luật chơi!");
          setLoading(false);
          return;
        }
        if (!formData.num_teams || parseInt(formData.num_teams) < 2) {
          alert("Số đội phải ít nhất 2!");
          setLoading(false);
          return;
        }
        if (
          !formData.max_team_members ||
          parseInt(formData.max_team_members) < 1
        ) {
          alert("Số thành viên tối đa phải ít nhất 1!");
          setLoading(false);
          return;
        }
      }

      // Upload image if exists
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // FIXED: Set created_by to null and track admin separately
      const eventData: any = {
        name: formData.name,
        description: formData.description,
        event_type: formData.event_type,
        start_date: startDateTime,
        end_date: endDateTime,
        password: formData.password || null,
        max_team_members: formData.max_team_members
          ? parseInt(formData.max_team_members)
          : null,
        max_teams: formData.num_teams ? parseInt(formData.num_teams) : null,
        image_url: imageUrl,
        status: eventStatus, // Will use ENUM type
        created_by: null, // Set to null to avoid foreign key error
        created_by_admin_email: admin?.email || null, // Track which admin created
      };

      console.log("Creating event with data:", eventData);

      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert([eventData])
        .select()
        .single();

      if (eventError) {
        console.error("Event creation error:", eventError);
        throw new Error(eventError.message);
      }

      // Add selected rules for team events
      if (formData.event_type === "team" && selectedRules.length > 0) {
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

      // Auto-generate teams for team events
      if (formData.event_type === "team" && formData.num_teams) {
        const numTeams = parseInt(formData.num_teams);
        const teamsToCreate = [];

        for (let i = 1; i <= numTeams; i++) {
          teamsToCreate.push({
            event_id: event.id,
            name: `Team ${i}`,
            total_points: 0,
          });
        }

        const { error: teamsError } = await supabase
          .from("teams")
          .insert(teamsToCreate);

        if (teamsError) {
          console.error("Error creating teams:", teamsError);
          alert("Tạo sự kiện thành công nhưng có lỗi khi tạo các đội!");
        } else {
          alert(
            `✅ Tạo sự kiện thành công với ${numTeams} đội!\n📊 Trạng thái: ${eventStatus}`
          );
        }
      } else {
        alert(`✅ Tạo sự kiện thành công!\n📊 Trạng thái: ${eventStatus}`);
      }

      router.push("/admin/events");
    } catch (error: any) {
      console.error("Error creating event:", error);
      alert(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Tạo sự kiện mới</h1>
          <p className="text-gray-600 mt-1">
            Điền thông tin sự kiện và cấu hình
          </p>
        </div>
      </div>

      {/* Admin Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>👤 Đang tạo với tư cách:</strong> {admin?.email || "Admin"} (
          {admin?.role || "admin"})
        </p>
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

          {/* Team Settings */}
          {formData.event_type === "team" && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
              <h3 className="font-semibold text-purple-900">
                Cấu hình đội thi đấu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số đội <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    required
                    value={formData.num_teams}
                    onChange={(e) =>
                      setFormData({ ...formData, num_teams: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: 10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số người/đội <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.max_team_members}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_team_members: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="VD: 5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Start Date & Time */}
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
                Giờ bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giờ kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Trạng thái tự động:</strong> Hệ thống sẽ tự động xác
              định trạng thái sự kiện dựa trên ngày giờ:
              <br />• <strong>Pending:</strong> Chưa đến ngày bắt đầu
              <br />• <strong>Active:</strong> Đang trong thời gian diễn ra
              <br />• <strong>Completed:</strong> Đã kết thúc
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu (tùy chọn)
            </label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Để trống nếu không cần"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hình ảnh
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
                    <span className="font-semibold">Click để upload</span>
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
        {formData.event_type === "team" && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Luật chơi <span className="text-red-500">*</span>
            </h2>
            <RulesSelector
              selectedRules={selectedRules}
              onChange={setSelectedRules}
            />
          </div>
        )}

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
