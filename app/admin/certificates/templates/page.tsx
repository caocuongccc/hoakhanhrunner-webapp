// =====================================================
// FILE 2: app/admin/certificates/templates/page.tsx - FIXED EDITOR
// =====================================================
"use client";
import React, { useState, useRef, useEffect } from "react";
import { Upload, Save, X, Plus, Trash2, AlertCircle } from "lucide-react";

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

export default function FixedPDFTemplateEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [scale, setScale] = useState(0.7);

  const fileInputRef = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0, startY: 0 });

  // ✅ FIX: Load PDF.js script FIRST
  useEffect(() => {
    loadPDFJSScript();
  }, []);

  // ✅ FIX: Render PDF only AFTER canvas is mounted AND PDF.js is loaded
  useEffect(() => {
    if (pdfFile && canvasRef.current && window.pdfjsLib) {
      renderPdfToCanvas(pdfFile);
    }
  }, [pdfFile]);

  const loadPDFJSScript = () => {
    if (window.pdfjsLib) {
      console.log("✅ PDF.js already loaded");
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      console.log("✅ PDF.js loaded successfully");
    };
    script.onerror = () => {
      setPdfError("Failed to load PDF.js library. Please refresh the page.");
    };
    document.head.appendChild(script);
  };

  const renderPdfToCanvas = async (file: File) => {
    try {
      setPdfLoading(true);
      setPdfError(null);
      console.log("📄 Starting PDF render...");

      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("PDF.js not loaded yet. Please wait...");
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas not ready yet. Please wait...");
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const desiredWidth = 1000;
      const viewport = page.getViewport({ scale: 1 });
      const scale = desiredWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context not available");
      }

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      const dataUrl = canvas.toDataURL("image/png");
      setPdfDataUrl(dataUrl);

      console.log("✅ PDF rendered successfully");
      setPdfLoading(false);
    } catch (error: any) {
      console.error("❌ PDF render error:", error);
      setPdfError(error.message);
      setPdfLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Vui lòng chọn file PDF");
      return;
    }

    console.log("📁 File selected:", file.name);
    setPdfFile(file);
    setFields([]);
    setSelectedField(null);
    setPdfDataUrl("");
    console.log("📁 File selected2222:", file.name);
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

  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedField(fieldId);
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
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
    setFields((prevFields) => prevFields.filter((f: any) => f.id !== fieldId));
    if (selectedField === fieldId) setSelectedField(null);
  };

  const selectedFieldData = fields.find((f: any) => f.id === selectedField);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      {/* Left: Field Palette */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold mb-4">Trường dữ liệu</h3>
        <div className="space-y-2">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.id}
              onClick={() => handleAddField(ft)}
              disabled={!pdfDataUrl}
              className={`w-full flex items-center gap-2 px-3 py-2 ${ft.color} text-white rounded text-sm hover:opacity-90 disabled:opacity-50`}
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

      {/* Center: Canvas */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Editor</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              -
            </button>
            <span className="px-3 py-1 bg-gray-100 rounded">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(Math.min(2, scale + 0.1))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              +
            </button>
          </div>
        </div>

        {/* Error State */}
        {pdfError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-700 font-semibold mb-2">❌ {pdfError}</p>
            <button
              onClick={() => pdfFile && renderPdfToCanvas(pdfFile)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading State */}
        {pdfLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Đang load PDF...</p>
          </div>
        )}

        {/* Canvas Container */}
        {!pdfLoading && pdfDataUrl && (
          <div className="relative border-2 border-gray-300 rounded-lg overflow-auto bg-gray-100">
            <div
              className="relative mx-auto"
              style={{
                width: `${1000 * scale}px`,
                height: `${707 * scale}px`,
              }}
            >
              {/* PDF Background */}
              <div
                className="absolute inset-0 bg-white"
                style={{
                  backgroundImage: `url(${pdfDataUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              {/* Hidden Canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Draggable Fields */}
              {fields.map((field: any) => (
                <div
                  key={field.id}
                  onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                  className={`absolute cursor-move border-2 border-dashed transition-all ${
                    selectedField === field.id
                      ? "border-blue-500 bg-blue-50 bg-opacity-50 z-10"
                      : "border-gray-400 bg-white bg-opacity-30"
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

        {/* Upload Prompt */}
        {!pdfFile && !pdfDataUrl && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Upload file PDF template</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Chọn file PDF
            </button>
          </div>
        )}
      </div>

      {/* Right: Properties */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold mb-4">Thuộc tính</h3>

        {selectedFieldData ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại</label>
              <input
                type="text"
                value={selectedFieldData.label}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">X</label>
                <input
                  type="number"
                  value={Math.round(selectedFieldData.x)}
                  onChange={(e) =>
                    handleFieldUpdate(selectedField!, {
                      x: parseInt(e.target.value) || 0,
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
                    handleFieldUpdate(selectedField!, {
                      y: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
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
              <label className="block text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                value={selectedFieldData.fontColor}
                onChange={(e) =>
                  handleFieldUpdate(selectedField!, {
                    fontColor: e.target.value,
                  })
                }
                className="w-full h-10 border rounded cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleRemoveField(selectedField!)}
              className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Xóa trường
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            Chọn một trường để chỉnh sửa
          </div>
        )}
      </div>
    </div>
  );
}
