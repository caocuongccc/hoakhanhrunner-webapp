// =====================================================
// FILE: app/admin/certificates/templates/page.tsx
// Admin page for managing certificate templates
// =====================================================

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Upload,
  Save,
  X,
  Settings,
  ChevronLeft,
  FileText,
  Download,
} from "lucide-react";
import Link from "next/link";

// Field types configuration
const FIELD_TYPES = [
  {
    id: "athleteName",
    label: "Tên vận động viên",
    placeholder: "Nguyễn Văn A",
    color: "bg-blue-500",
  },
  {
    id: "eventName",
    label: "Tên giải",
    placeholder: "Marathon 2024",
    color: "bg-green-500",
  },
  {
    id: "activeDays",
    label: "Số ngày chạy",
    placeholder: "15",
    color: "bg-purple-500",
  },
  {
    id: "totalDays",
    label: "Tổng số ngày",
    placeholder: "30",
    color: "bg-orange-500",
  },
  {
    id: "totalDistance",
    label: "Tổng KM",
    placeholder: "125.5",
    color: "bg-pink-500",
  },
  {
    id: "averagePace",
    label: "Pace TB",
    placeholder: "5:30",
    color: "bg-indigo-500",
  },
  {
    id: "completionDate",
    label: "Ngày hoàn thành",
    placeholder: "December 01, 2024",
    color: "bg-red-500",
  },
];

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [scale, setScale] = useState(0.7);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0, startY: 0 });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/certificate-templates");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      alert("Vui lòng chọn file PDF");
      return;
    }

    setPdfFile(file);
    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);
    setIsEditing(true);
    setFields([]);
    setSelectedField(null);
  };

  const handleAddField = (fieldType) => {
    const newField = {
      id: `${fieldType.id}_${Date.now()}`,
      type: fieldType.id,
      label: fieldType.label,
      placeholder: fieldType.placeholder,
      color: fieldType.color,
      x: 100,
      y: 100,
      width: 250,
      height: 40,
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
      fontColor: "#000000",
    };
    setFields([...fields, newField]);
    setSelectedField(newField.id);
  };

  const handleFieldMouseDown = (e, fieldId) => {
    e.stopPropagation();
    setSelectedField(fieldId);
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragStateRef.current.isDragging || !selectedField) return;

      const deltaX = (e.clientX - dragStateRef.current.startX) / scale;
      const deltaY = (e.clientY - dragStateRef.current.startY) / scale;

      setFields(
        fields.map((field) =>
          field.id === selectedField
            ? {
                ...field,
                x: Math.max(0, field.x + deltaX),
                y: Math.max(0, field.y + deltaY),
              }
            : field
        )
      );

      dragStateRef.current.startX = e.clientX;
      dragStateRef.current.startY = e.clientY;
    };

    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
    };

    if (dragStateRef.current.isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [selectedField, fields, scale]);

  const handleFieldUpdate = (fieldId, updates) => {
    setFields(
      fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const handleRemoveField = (fieldId) => {
    setFields(fields.filter((field) => field.id !== fieldId));
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
  };

  const uploadPdfToCloudinary = async () => {
    if (!pdfFile) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("folder", "certificate-templates");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        return data.url;
      }
      throw new Error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!pdfFile && !currentTemplate) {
      alert("Vui lòng upload PDF template");
      return;
    }

    if (fields.length === 0) {
      alert("Vui lòng thêm ít nhất 1 trường");
      return;
    }

    const templateName = prompt(
      "Nhập tên template:",
      currentTemplate?.name || ""
    );
    if (!templateName) return;

    setSaving(true);
    try {
      let pdfUrl = currentTemplate?.pdf_url;

      if (pdfFile && !currentTemplate) {
        pdfUrl = await uploadPdfToCloudinary();
        if (!pdfUrl) {
          throw new Error("Failed to upload PDF");
        }
      }

      const templateData = {
        name: templateName,
        pdf_url: pdfUrl,
        fields_config: fields,
      };

      const url = currentTemplate
        ? `/api/admin/certificate-templates/${currentTemplate.id}`
        : "/api/admin/certificate-templates";

      const method = currentTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });

      const data = await response.json();

      if (data.success) {
        alert("Đã lưu template thành công!");
        setIsEditing(false);
        setCurrentTemplate(null);
        setPdfFile(null);
        setPdfPreviewUrl(null);
        setFields([]);
        loadTemplates();
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Không thể lưu template: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTemplate = async (template) => {
    setCurrentTemplate(template);
    setPdfPreviewUrl(template.pdf_url);
    setFields(template.fields_config || []);
    setIsEditing(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm("Bạn có chắc muốn xóa template này?")) return;

    try {
      const response = await fetch(
        `/api/admin/certificate-templates/${templateId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("Đã xóa template!");
        loadTemplates();
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Không thể xóa template");
    }
  };

  const selectedFieldData = fields.find((f) => f.id === selectedField);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/certificates"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lý Template
            </h1>
            <p className="text-gray-600 mt-1">Tạo và chỉnh sửa mẫu chứng chỉ</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Tạo Template Mới
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Template List View */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-md p-6 animate-pulse"
              >
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))
          ) : templates.length === 0 ? (
            <div className="col-span-3 bg-white rounded-lg shadow-md p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">Chưa có template nào</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tạo Template Đầu Tiên
              </button>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <FileText className="h-16 w-16 text-gray-400" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {template.fields_config?.length || 0} trường
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Editor View - Continue in next artifact due to length */}
      {isEditing && (
        <EditorView
          fields={fields}
          selectedField={selectedField}
          selectedFieldData={selectedFieldData}
          pdfPreviewUrl={pdfPreviewUrl}
          scale={scale}
          saving={saving}
          uploading={uploading}
          fileInputRef={fileInputRef}
          onAddField={handleAddField}
          onFieldMouseDown={handleFieldMouseDown}
          onFieldUpdate={handleFieldUpdate}
          onRemoveField={handleRemoveField}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setIsEditing(false);
            setCurrentTemplate(null);
            setPdfFile(null);
            setPdfPreviewUrl(null);
            setFields([]);
          }}
          setScale={setScale}
          setSelectedField={setSelectedField}
        />
      )}
    </div>
  );
}

// Editor View Component (split for readability)
function EditorView({
  fields,
  selectedField,
  selectedFieldData,
  pdfPreviewUrl,
  scale,
  saving,
  uploading,
  fileInputRef,
  onAddField,
  onFieldMouseDown,
  onFieldUpdate,
  onRemoveField,
  onSave,
  onCancel,
  setScale,
  setSelectedField,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left: Field Palette */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold mb-4">Trường dữ liệu</h3>
        <div className="space-y-2">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.id}
              onClick={() => onAddField(ft)}
              className={`w-full flex items-center gap-2 px-3 py-2 ${ft.color} text-white rounded text-sm hover:opacity-90`}
            >
              <Plus className="w-4 h-4" />
              {ft.label}
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold mb-3">Đã thêm ({fields.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {fields.map((field) => (
              <div
                key={field.id}
                onClick={() => setSelectedField(field.id)}
                className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                  selectedField === field.id
                    ? "bg-blue-50 border border-blue-300"
                    : "bg-gray-50"
                }`}
              >
                <span className="text-sm">{field.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveField(field.id);
                  }}
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center: Canvas - See next part */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Editor</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              -
            </button>
            <span className="px-3 py-1 bg-gray-100 rounded">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(Math.min(2, scale + 0.1))}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              +
            </button>
            <button
              onClick={onSave}
              disabled={saving || uploading}
              className="flex items-center gap-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ml-4"
            >
              {saving || uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Đang lưu..." : uploading ? "Đang upload..." : "Lưu"}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-1 bg-gray-200 rounded"
            >
              Hủy
            </button>
          </div>
        </div>

        <div className="relative border-2 border-gray-300 rounded-lg overflow-auto bg-gray-100">
          <div
            className="relative mx-auto bg-white"
            style={{ width: `${1000 * scale}px`, height: `${707 * scale}px` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-2" />
                <p className="text-sm">PDF Template Preview</p>
              </div>
            </div>

            {fields.map((field) => (
              <div
                key={field.id}
                onMouseDown={(e) => onFieldMouseDown(e, field.id)}
                className={`absolute cursor-move border-2 border-dashed transition-all ${
                  selectedField === field.id
                    ? "border-blue-500 bg-blue-50 z-10"
                    : "border-gray-400 bg-white bg-opacity-70"
                }`}
                style={{
                  left: `${field.x * scale}px`,
                  top: `${field.y * scale}px`,
                  width: `${field.width * scale}px`,
                  height: `${field.height * scale}px`,
                  fontSize: `${field.fontSize * scale * 0.6}px`,
                  fontWeight: field.fontWeight,
                  textAlign: field.textAlign,
                  color: field.fontColor,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                  {field.placeholder}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Properties Panel */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Thuộc tính
        </h3>

        {selectedFieldData ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Label</label>
              <input
                type="text"
                value={selectedFieldData.label}
                disabled
                className="w-full px-3 py-2 border rounded text-sm bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">X</label>
                <input
                  type="number"
                  value={Math.round(selectedFieldData.x)}
                  onChange={(e) =>
                    onFieldUpdate(selectedField, {
                      x: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Y</label>
                <input
                  type="number"
                  value={Math.round(selectedFieldData.y)}
                  onChange={(e) =>
                    onFieldUpdate(selectedField, {
                      y: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Width</label>
              <input
                type="number"
                value={selectedFieldData.width}
                onChange={(e) =>
                  onFieldUpdate(selectedField, {
                    width: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Font Size
              </label>
              <input
                type="number"
                value={selectedFieldData.fontSize}
                onChange={(e) =>
                  onFieldUpdate(selectedField, {
                    fontSize: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Font Weight
              </label>
              <select
                value={selectedFieldData.fontWeight}
                onChange={(e) =>
                  onFieldUpdate(selectedField, { fontWeight: e.target.value })
                }
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Align</label>
              <select
                value={selectedFieldData.textAlign}
                onChange={(e) =>
                  onFieldUpdate(selectedField, { textAlign: e.target.value })
                }
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Color</label>
              <input
                type="color"
                value={selectedFieldData.fontColor}
                onChange={(e) =>
                  onFieldUpdate(selectedField, { fontColor: e.target.value })
                }
                className="w-full h-10 border rounded"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Chọn trường để chỉnh sửa
          </p>
        )}
      </div>
    </div>
  );
}
