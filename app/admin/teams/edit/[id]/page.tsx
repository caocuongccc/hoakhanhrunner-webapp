"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

export default function EditTeamPage() {
  const params = useParams();
  const teamId = params.id as string;
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    event_id: "",
  });

  const [eventName, setEventName] = useState("");

  useEffect(() => {
    loadTeam();
  }, [teamId]);

  const loadTeam = async () => {
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .select(
          `
          *,
          events(name)
        `
        )
        .eq("id", teamId)
        .single();

      if (error) throw error;

      setFormData({
        name: team.name,
        event_id: team.event_id,
      });
      setEventName(team.events.name);
    } catch (error) {
      console.error("Error loading team:", error);
      alert("Không thể tải thông tin đội");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("teams")
        .update({
          name: formData.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId);

      if (error) throw error;

      alert("Cập nhật đội thành công!");
      router.push("/admin/teams");
    } catch (error: any) {
      console.error("Error updating team:", error);
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
          href="/admin/teams"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa đội</h1>
          <p className="text-gray-600 mt-1">Cập nhật thông tin đội</p>
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
          />
        </div>

        {/* Event (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sự kiện
          </label>
          <input
            type="text"
            value={eventName}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Không thể thay đổi sự kiện sau khi tạo đội
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
