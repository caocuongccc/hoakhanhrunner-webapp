// app/admin/certificates/field-types/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, ChevronLeft, Tag } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

interface FieldType {
  id: string;
  field_id: string;
  label: string;
  placeholder: string;
  color: string;
  data_source: string;
  is_active: boolean;
  sort_order: number;
}

const AVAILABLE_COLORS = [
  { value: "bg-blue-500", label: "Blue" },
  { value: "bg-green-500", label: "Green" },
  { value: "bg-purple-500", label: "Purple" },
  { value: "bg-orange-500", label: "Orange" },
  { value: "bg-pink-500", label: "Pink" },
  { value: "bg-indigo-500", label: "Indigo" },
  { value: "bg-red-500", label: "Red" },
  { value: "bg-yellow-500", label: "Yellow" },
  { value: "bg-teal-500", label: "Teal" },
  { value: "bg-cyan-500", label: "Cyan" },
];

export default function FieldTypesPage() {
  const supabase = createSupabaseClient();
  const [fieldTypes, setFieldTypes] = useState<FieldType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentField, setCurrentField] = useState<FieldType | null>(null);
  const [formData, setFormData] = useState({
    field_id: "",
    label: "",
    placeholder: "",
    color: "bg-blue-500",
    data_source: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFieldTypes();
  }, []);

  const loadFieldTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("certificate_field_types")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setFieldTypes(data || []);
    } catch (error) {
      console.error("Error loading field types:", error);
      alert("Không thể tải danh sách field types");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fieldType: FieldType) => {
    setCurrentField(fieldType);
    setFormData({
      field_id: fieldType.field_id,
      label: fieldType.label,
      placeholder: fieldType.placeholder,
      color: fieldType.color,
      data_source: fieldType.data_source,
      is_active: fieldType.is_active,
    });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentField(null);
    setFormData({
      field_id: "",
      label: "",
      placeholder: "",
      color: "bg-blue-500",
      data_source: "",
      is_active: true,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!formData.field_id || !formData.label || !formData.data_source) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setSaving(true);
    try {
      if (currentField) {
        // Update existing
        const { error } = await supabase
          .from("certificate_field_types")
          .update({
            label: formData.label,
            placeholder: formData.placeholder,
            color: formData.color,
            data_source: formData.data_source,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentField.id);

        if (error) throw error;
        alert("Đã cập nhật field type!");
      } else {
        // Create new
        const maxOrder = Math.max(...fieldTypes.map((f) => f.sort_order), 0);
        const { error } = await supabase
          .from("certificate_field_types")
          .insert({
            field_id: formData.field_id,
            label: formData.label,
            placeholder: formData.placeholder,
            color: formData.color,
            data_source: formData.data_source,
            is_active: formData.is_active,
            sort_order: maxOrder + 1,
          });

        if (error) throw error;
        alert("Đã tạo field type mới!");
      }

      setIsEditing(false);
      setCurrentField(null);
      loadFieldTypes();
    } catch (error: any) {
      console.error("Error saving field type:", error);
      alert("Lỗi: " + (error.message || "Không thể lưu"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa field type này?")) return;

    try {
      const { error } = await supabase
        .from("certificate_field_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
      alert("Đã xóa field type!");
      loadFieldTypes();
    } catch (error) {
      console.error("Error deleting field type:", error);
      alert("Không thể xóa field type");
    }
  };

  const toggleActive = async (fieldType: FieldType) => {
    try {
      const { error } = await supabase
        .from("certificate_field_types")
        .update({ is_active: !fieldType.is_active })
        .eq("id", fieldType.id);

      if (error) throw error;
      loadFieldTypes();
    } catch (error) {
      console.error("Error toggling active:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/certificates/templates"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lý Field Types
            </h1>
            <p className="text-gray-600 mt-1">
              Cấu hình các trường dữ liệu cho certificate template
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Thêm Field Type
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">
          📖 Hướng dẫn Data Source:
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>participant.*</strong> - Dữ liệu từ bảng event_participants
            (full_name, username, total_distance, active_days, average_pace)
          </li>
          <li>
            <strong>event.*</strong> - Dữ liệu từ bảng events (name, start_date,
            end_date, total_days)
          </li>
          <li>
            <strong>team.*</strong> - Dữ liệu từ bảng teams (name)
          </li>
          <li>
            Sử dụng <code>||</code> để fallback:{" "}
            <code>participant.full_name || participant.username</code>
          </li>
        </ul>
      </div>

      {/* Editor Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {currentField ? "Chỉnh sửa Field Type" : "Tạo Field Type mới"}
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.field_id}
                onChange={(e) =>
                  setFormData({ ...formData, field_id: e.target.value })
                }
                disabled={!!currentField}
                placeholder="athleteName, eventName..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tên kỹ thuật (camelCase, không dấu)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label hiển thị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="Tên vận động viên"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placeholder (ví dụ)
              </label>
              <input
                type="text"
                value={formData.placeholder}
                onChange={(e) =>
                  setFormData({ ...formData, placeholder: e.target.value })
                }
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Màu sắc
              </label>
              <select
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {AVAILABLE_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Source <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.data_source}
                onChange={(e) =>
                  setFormData({ ...formData, data_source: e.target.value })
                }
                placeholder="participant.full_name || participant.username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Expression để lấy dữ liệu từ database
              </p>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Kích hoạt
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Field Types List */}
      {!isEditing && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Field ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Placeholder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : fieldTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>Chưa có field type nào</p>
                  </td>
                </tr>
              ) : (
                fieldTypes.map((ft) => (
                  <tr key={ft.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {ft.field_id}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${ft.color}`}
                        ></span>
                        <span className="font-medium">{ft.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ft.placeholder}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {ft.data_source}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(ft)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ft.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ft.is_active ? "Hoạt động" : "Tắt"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(ft)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ft.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
