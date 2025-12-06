// app/admin/certificates/templates/page.tsx - WORKING VERSION
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  ChevronLeft,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

export default function CertificateTemplatesPage() {
  const supabase = createSupabaseClient();
  const [templates, setTemplates] = useState([]);
  const [fieldTypes, setFieldTypes] = useState([]);
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
  const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 707 });

  const fileInputRef = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    field: null,
  });

  useEffect(() => {
    loadTemplates();
    loadFieldTypes();
  }, []);

  useEffect(() => {
    if (pdfFile && canvasRef.current) {
      console.log("🎯 Canvas ready, rendering PDF...");
      renderPdfToCanvas(pdfFile);
    }
  }, [pdfFile, canvasRef.current]);

  const loadFieldTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("certificate_field_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setFieldTypes(data || []);
      console.log("✅ Loaded field types:", data?.length);
    } catch (error) {
      console.error("Error loading field types:", error);
    }
  };

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

  const renderPdfToCanvas = async (file: File) => {
    try {
      setPdfLoading(true);
      setPdfDataUrl(""); // Clear old data
      console.log("📄 Starting PDF render...", file.name);

      // Check if canvas exists
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("❌ Canvas element not found!");
        throw new Error("Canvas element not found. Please try again.");
      }

      console.log("✅ Canvas element found:", canvas);

      // Check PDF.js
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("PDF.js library not loaded. Please refresh the page.");
      }

      console.log("✅ PDF.js loaded");

      // Set worker
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      // Load PDF
      const arrayBuffer = await file.arrayBuffer();
      console.log("✅ File read, size:", arrayBuffer.byteLength, "bytes");

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      console.log("✅ PDF loaded, pages:", pdf.numPages);

      // Get first page
      const page = await pdf.getPage(1);
      console.log("✅ Page 1 loaded");

      // Get canvas context
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Cannot get canvas 2D context");
      }

      console.log("✅ Canvas context ready");

      // Calculate size
      const desiredWidth = 1000;
      const viewport = page.getViewport({ scale: 1 });
      const renderScale = desiredWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: renderScale });

      // Set canvas size
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      console.log("📏 Canvas dimensions:", {
        width: canvas.width,
        height: canvas.height,
        scale: renderScale,
      });

      // Save canvas size for field positioning
      setCanvasSize({
        width: canvas.width,
        height: canvas.height,
      });

      // Render PDF to canvas
      console.log("🎨 Rendering PDF to canvas...");
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      console.log("✅ PDF rendered to canvas");

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/png");
      setPdfDataUrl(dataUrl);

      console.log(
        "✅ PDF conversion complete, dataURL length:",
        dataUrl.length
      );
      setPdfLoading(false);
    } catch (error: any) {
      console.error("❌ PDF Render Error:", error);
      alert(
        `Không thể hiển thị PDF:\n\n${error.message}\n\nVui lòng thử:\n1. Chọn file PDF khác\n2. Refresh trang\n3. Kiểm tra file PDF có hợp lệ không`
      );
      setPdfLoading(false);
      setPdfDataUrl("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Vui lòng chọn file PDF");
      return;
    }

    console.log("📁 File selected:", file.name, file.size, "bytes");

    setPdfFile(file);
    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);
    setIsEditing(true);
    setFields([]);
    setSelectedField(null);
    setPdfDataUrl("");
  };

  const handleAddField = (fieldType: any) => {
    const newField = {
      id: `${fieldType.field_id}_${Date.now()}`,
      type: fieldType.field_id,
      label: fieldType.label,
      placeholder: fieldType.placeholder,
      color: fieldType.color,
      dataSource: fieldType.data_source,
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

  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedField(fieldId);
    const field = fields.find((f: any) => f.id === fieldId);
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      field,
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
                x: Math.max(
                  0,
                  Math.min(canvasSize.width - field.width, field.x + deltaX)
                ),
                y: Math.max(
                  0,
                  Math.min(canvasSize.height - field.height, field.y + deltaY)
                ),
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
  }, [selectedField, scale, canvasSize]);

  const handleFieldUpdate = (fieldId: string, updates: any) => {
    setFields((prevFields) =>
      prevFields.map((field: any) =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const handleRemoveField = (fieldId: string) => {
    setFields((prevFields) =>
      prevFields.filter((field: any) => field.id !== fieldId)
    );
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
      if (data.url) return data.url;
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
        if (!pdfUrl) throw new Error("Failed to upload PDF");
      }

      const templateData = {
        name: templateName,
        pdf_url: pdfUrl,
        fields_config: fields,
        is_active: true,
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
        alert(
          currentTemplate
            ? "Đã cập nhật template!"
            : "Đã tạo template thành công!"
        );
        setIsEditing(false);
        setCurrentTemplate(null);
        setPdfFile(null);
        setPdfPreviewUrl("");
        setFields([]);
        setSelectedField(null);
        setPdfDataUrl("");
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
    setSelectedField(null);

    if (template.pdf_url) {
      try {
        const response = await fetch(template.pdf_url);
        const blob = await response.blob();
        const file = new File([blob], "template.pdf", {
          type: "application/pdf",
        });
        setPdfFile(file);
        console.log("✅ Template loaded for editing:", template.name);
      } catch (error) {
        console.error("❌ Error loading template:", error);
        alert("Không thể load PDF template. Vui lòng thử lại.");
      }
    }
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

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentTemplate(null);
    setPdfFile(null);
    setPdfPreviewUrl("");
    setPdfDataUrl("");
    setFields([]);
    setSelectedField(null);
  };

  const selectedFieldData = fields.find((f: any) => f.id === selectedField);

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
            <p className="text-gray-600 mt-1">
              Tạo và chỉnh sửa mẫu chứng chỉ với PDF background
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/certificates/field-types"
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Settings className="w-5 h-5" />
            Quản lý Field Types
          </Link>
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Info Box */}
      {!isEditing && fieldTypes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">
            📖 Các Field Types hiện có ({fieldTypes.length}):
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
            {fieldTypes.map((ft: any) => (
              <div key={ft.id} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${ft.color}`}></span>
                <strong>{ft.label}</strong>
              </div>
            ))}
          </div>
          <Link
            href="/admin/certificates/field-types"
            className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            → Quản lý Field Types
          </Link>
        </div>
      )}

      {/* Template List */}
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
            templates.map((template: any) => (
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

      {/* Editor View */}
      {isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Field Palette */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-bold mb-4">Trường dữ liệu</h3>
            {fieldTypes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm mb-3">
                  Chưa có field types
                </p>
                <Link
                  href="/admin/certificates/field-types"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Thêm field types
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {fieldTypes.map((ft: any) => (
                  <button
                    key={ft.field_id}
                    onClick={() => handleAddField(ft)}
                    className={`w-full flex items-center gap-2 px-3 py-2 ${ft.color} text-white rounded text-sm hover:opacity-90`}
                  >
                    <Plus className="w-4 h-4" />
                    {ft.label}
                  </button>
                ))}
              </div>
            )}

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

          {/* Canvas Editor */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">PDF Editor</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setScale(Math.max(0.3, scale - 0.1))}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  -
                </button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(Math.min(2, scale + 0.1))}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  +
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving || uploading || pdfLoading}
                  className="flex items-center gap-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ml-4"
                >
                  {saving || uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving
                    ? "Đang lưu..."
                    : uploading
                      ? "Đang upload..."
                      : "Lưu"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
              </div>
            </div>

            {/* Loading State */}
            {pdfLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Đang load PDF...</p>
                <p className="text-xs text-gray-500 mt-2">
                  Vui lòng đợi trong giây lát
                </p>
              </div>
            )}

            {/* Error State */}
            {!pdfLoading && !pdfDataUrl && pdfFile && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
                <p className="text-red-700 mb-4 font-semibold">
                  ❌ Không thể hiển thị PDF
                </p>
                <p className="text-sm text-red-600 mb-4">
                  Vui lòng kiểm tra file PDF có hợp lệ không
                </p>
                <button
                  onClick={() => renderPdfToCanvas(pdfFile)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Canvas with PDF Background */}
            {!pdfLoading && pdfDataUrl && (
              <div className="border-2 border-gray-300 rounded-lg overflow-auto bg-gray-100 max-h-[600px]">
                <div
                  className="relative mx-auto bg-white"
                  style={{
                    width: `${canvasSize.width * scale}px`,
                    height: `${canvasSize.height * scale}px`,
                    minWidth: `${canvasSize.width * scale}px`,
                    minHeight: `${canvasSize.height * scale}px`,
                  }}
                >
                  {/* PDF Background */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `url(${pdfDataUrl})`,
                      backgroundSize: "100% 100%",
                      backgroundPosition: "0 0",
                      backgroundRepeat: "no-repeat",
                    }}
                  />

                  {/* Draggable Fields */}
                  {fields.map((field: any) => (
                    <div
                      key={field.id}
                      onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                      className={`absolute cursor-move border-2 border-dashed transition-all ${
                        selectedField === field.id
                          ? "border-blue-500 bg-blue-50 bg-opacity-50 z-10 shadow-lg"
                          : "border-gray-400 bg-white bg-opacity-30 hover:border-blue-300"
                      }`}
                      style={{
                        left: `${field.x * scale}px`,
                        top: `${field.y * scale}px`,
                        width: `${field.width * scale}px`,
                        height: `${field.height * scale}px`,
                      }}
                    >
                      <div
                        className="w-full h-full flex items-center justify-center p-1 overflow-hidden"
                        style={{
                          fontSize: `${field.fontSize * scale}px`,
                          fontWeight: field.fontWeight,
                          textAlign: field.textAlign as any,
                          color: field.fontColor,
                        }}
                      >
                        {field.placeholder}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden Canvas for PDF Rendering */}
            <canvas
              ref={canvasRef}
              className="hidden"
              style={{ display: "none" }}
            />

            {/* No PDF State */}
            {!pdfFile && !pdfDataUrl && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  📄 Vui lòng upload file PDF template
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Chọn file PDF
                </button>
              </div>
            )}
          </div>

          {/* Field Properties */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-bold mb-4">Thuộc tính trường</h3>

            {selectedFieldData ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại dữ liệu
                  </label>
                  <input
                    type="text"
                    value={selectedFieldData.label}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      X (px)
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedFieldData.x)}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField!, {
                          x: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Y (px)
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedFieldData.y)}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField!, {
                          y: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Width
                    </label>
                    <input
                      type="number"
                      value={selectedFieldData.width}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField!, {
                          width: parseInt(e.target.value) || 100,
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Height
                    </label>
                    <input
                      type="number"
                      value={selectedFieldData.height}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField!, {
                          height: parseInt(e.target.value) || 40,
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Size: {selectedFieldData.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="72"
                    value={selectedFieldData.fontSize}
                    onChange={(e) =>
                      handleFieldUpdate(selectedField!, {
                        fontSize: parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Weight
                  </label>
                  <select
                    value={selectedFieldData.fontWeight}
                    onChange={(e) =>
                      handleFieldUpdate(selectedField!, {
                        fontWeight: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="600">Semi Bold</option>
                    <option value="800">Extra Bold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Text Align
                  </label>
                  <select
                    value={selectedFieldData.textAlign}
                    onChange={(e) =>
                      handleFieldUpdate(selectedField!, {
                        textAlign: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedFieldData.fontColor}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField!, {
                          fontColor: e.target.value,
                        })
                      }
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedFieldData.fontColor}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField!, {
                          fontColor: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveField(selectedField!)}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa trường
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">
                  Chọn một trường để chỉnh sửa
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
