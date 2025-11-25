"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

export default function CreateTeamPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    event_id: "",
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("event_type", "team")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create team
      const { error } = await supabase.from("teams").insert([
        {
          name: formData.name,
          event_id: formData.event_id,
        },
      ]);

      if (error) throw error;

      alert("Tạo đội thành công!");
      router.push("/admin/teams");
    } catch (error: any) {
      console.error("Error creating team:", error);
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
          href="/admin/teams"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tạo đội mới</h1>
          <p className="text-gray-600 mt-1">Tạo đội thi đấu cho sự kiện</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md p-6 space-y-6"
      >
        {/* Team Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên đội <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="VD: Team Rocket"
          />
        </div>

        {/* Select Event */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sự kiện <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.event_id}
            onChange={(e) =>
              setFormData({ ...formData, event_id: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Chọn sự kiện --</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Lưu ý:</strong> Sau khi tạo đội, bạn có thể thêm thành viên
            vào đội trong phần quản lý thành viên. Tất cả thành viên đều bình
            đẳng, không có vai trò đội trưởng.
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4 border-t pt-6">
          <Link
            href="/admin/teams"
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
                <span>Tạo đội</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
