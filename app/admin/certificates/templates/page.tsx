// =====================================================
// FILE 2: app/admin/certificates/templates/page.tsx - FIXED EDITOR
// =====================================================
"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Eye, Edit, Trash2, Upload, Save, X, Settings, ChevronLeft, FileText } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

const FIELD_TYPES = [
  { id: "athleteName", label: "Tên vận động viên", placeholder: "Nguyễn Văn A", color: "bg-blue-500" },
  { id: "eventName", label: "Tên giải", placeholder: "Marathon 2024", color: "bg-green-500" },
  { id: "activeDays", label: "Số ngày chạy", placeholder: "15", color: "bg-purple-500" },
  { id: "totalDays", label: "Tổng số ngày", placeholder: "30", color: "bg-orange-500" },
  { id: "totalDistance", label: "Tổng KM", placeholder: "125.5", color: "bg-pink-500" },
  { id: "averagePace", label: "Pace TB", placeholder: "5:30", color: "bg-indigo-500" },
  { id: "completionDate", label: "Ngày hoàn thành", placeholder: "December 01, 2024", color: "bg-red-500" },
];

export default function CertificateTemplatesPage() {
  const supabase = createSupabaseClient();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [scale, setScale] = useState(0.7);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0, startY: 0, field: null });

  useEffect(() => {
    loadTemplates();
  }, []);

  // ADDED: Render PDF on canvas when file changes
  useEffect(() => {
    if (pdfFile && canvasRef.current) {
      renderPdfToCanvas(pdfFile);
    }
  }, [pdfFile]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  // ADDED: Render PDF to canvas for preview
  const renderPdfToCanvas = async (file: File) => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        console.error("PDF.js not loaded");
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale: 1.4 });
      const context = canvas.getContext("2d");
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      console.log("✓ PDF rendered to canvas");
    } catch (error) {
      console.error("Error rendering PDF:", error);
      alert("Không thể hiển thị PDF. Vui lòng thử file khác.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  const handleAddField = (fieldType: any) => {
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

  // FIXED: Dragging logic
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedField(fieldId);
    
    const field = fields.find((f: any) => f.id === fieldId);
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      field: field,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging || !selectedField) return;

      const deltaX = (e.clientX - dragStateRef.current.startX) / scale;
      const deltaY = (e.clientY - dragStateRef.current.startY) / scale;

      setFields((prevFields) =>
        prevFields.map((field: any) =>
          field.id === selectedField
            ? {
                ...field,
                x: Math.max(0, Math.min(1000 - field.width, field.x + deltaX)),
                y: Math.max(0, Math.min(707 - field.height, field.y + deltaY)),
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [selectedField, scale]);

  const handleFieldUpdate = (fieldId: string, updates: any) => {
    setFields((prevFields) =>
      prevFields.map((field: any) =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const handleRemoveField = (fieldId: string) => {
    setFields((prevFields) => prevFields.filter((field: any) => field.id !== fieldId));
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

    const templateName = prompt("Nhập tên template:", currentTemplate?.name || "");
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
        setPdfPreviewUrl("");
        setFields([]);
        loadTemplates();
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert("Không thể lưu template: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTemplate = async (template: any) => {
    setCurrentTemplate(template);
    setPdfPreviewUrl(template.pdf_url);
    setFields(template.fields_config || []);
    setIsEditing(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Bạn có chắc muốn xóa template này?")) return;

    try {
      const { error } = await supabase
        .from("certificate_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      alert("Đã xóa template!");
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Không thể xóa template");
    }
  };

  const selectedFieldData = fields.find((f: any) => f.id === selectedField);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/certificates" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý Template</h1>
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

      {/* PDF.js Script */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <script>{`pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';`}</script>

      {/* Template List View */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
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
            templates.map((template: any) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <FileText className="h-16 w-16 text-gray-400" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2">{template.name}</h3>
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

      {/* Editor View */}
      {isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Field Palette */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-bold mb-4">Trường dữ liệu</h3>
            <div className="space-y-2">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.id}
                  onClick={() => handleAddField(ft)}
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
                {fields.map((field: any) => (
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
                        handleRemoveField(field.id);
                      }}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Canvas with PDF */}
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
                  onClick={handleSaveTemplate}
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
                  onClick={() => {
                    setIsEditing(false);
                    setCurrentTemplate(null);
                    setPdfFile(null);
                    setPdfPreviewUrl("");
                    setFields([]);
                  }}
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
                {/* PDF Canvas Background */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                />

                {/* Draggable Fields */}
                {fields.map((field: any) => (
                  <div
                    key={field.id}
                    onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                    className={`absolute cursor-move border-2 border-dashed transition-all ${
                      selectedField === field.id
                        ? "border-blue-500 bg-blue-50 z-10"
                        : "border-gray-400 bg-white bg-opacity-70"
                    }`}
                    style={{
                      left: `${field.x * scale}px`,
                      top: `${field.y * scale}
