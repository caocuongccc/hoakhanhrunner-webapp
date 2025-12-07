// components/CertificatePreview.tsx - FIXED VERSION
"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

type CertificatePreviewProps = {
  data: {
    athleteName: string;
    eventName: string;
    activeDays: number;
    totalDays: number;
    totalDistance: number;
    averagePace: string;
    completionDate: string;
  };
  templateId?: string; // ADDED: Template ID for preview
  onClose: () => void;
};

export default function CertificatePreview({
  data,
  templateId,
  onClose,
}: CertificatePreviewProps) {
  const [template, setTemplate] = useState<any>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load template from API
      const response = await fetch(
        `/api/admin/certificate-templates/${templateId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load template");
      }

      const result = await response.json();

      if (!result.success || !result.template) {
        throw new Error("Template not found");
      }

      setTemplate(result.template);

      // Load PDF as background image
      if (result.template.pdf_url) {
        await loadPdfAsImage(result.template.pdf_url);
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading template:", err);
      setError(err.message || "Failed to load template");
      setLoading(false);
    }
  };

  const loadPdfAsImage = async (pdfUrl: string) => {
    try {
      // Check if PDF.js is loaded
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("PDF.js not loaded");
      }

      // Load PDF
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      // Create canvas
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Cannot get canvas context");

      // Calculate size
      const desiredWidth = 1000;
      const viewport = page.getViewport({ scale: 1 });
      const renderScale = desiredWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: renderScale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      // Render PDF to canvas
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      // Convert to data URL
      setPdfDataUrl(canvas.toDataURL("image/png"));
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      setError(err.message || "Failed to load PDF");
    }
  };

  // Data mapping
  const dataMap: Record<string, string> = {
    athleteName: data.athleteName,
    eventName: data.eventName,
    activeDays: data.activeDays.toString(),
    totalDays: data.totalDays.toString(),
    totalDistance: data.totalDistance.toFixed(1),
    averagePace: data.averagePace,
    completionDate: data.completionDate,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Xem trước Certificate
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <strong>Lỗi:</strong> {error}
            </div>
          ) : template ? (
            // Preview with template
            <div
              style={{
                width: "1000px",
                height: "707px",
                margin: "0 auto",
                position: "relative",
                transform: "scale(0.8)",
                transformOrigin: "top center",
                backgroundImage: pdfDataUrl ? `url(${pdfDataUrl})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "1px solid #e5e7eb",
              }}
            >
              {/* Overlay fields according to config */}
              {template.fields_config?.map((field: any, index: number) => {
                const value = dataMap[field.type] || field.placeholder || "";
                return (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      left: `${field.x}px`,
                      top: `${field.y}px`,
                      width: `${field.width}px`,
                      height: `${field.height}px`,
                      fontSize: `${field.fontSize}px`,
                      fontWeight: field.fontWeight,
                      textAlign: field.textAlign as any,
                      color: field.fontColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        field.textAlign === "center"
                          ? "center"
                          : field.textAlign === "right"
                            ? "flex-end"
                            : "flex-start",
                      padding: "4px",
                    }}
                  >
                    {value}
                  </div>
                );
              })}
            </div>
          ) : (
            // Default preview (fallback)
            <DefaultCertificatePreview data={data} />
          )}
        </div>
      </div>
    </div>
  );
}

// Fallback default preview
function DefaultCertificatePreview({ data }: { data: any }) {
  return (
    <div
      style={{
        width: "1000px",
        height: "707px",
        margin: "0 auto",
        background: "white",
        position: "relative",
        transform: "scale(0.8)",
        transformOrigin: "top center",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          right: "20px",
          bottom: "20px",
          border: "3px solid #2563eb",
          background: "linear-gradient(135deg, #f8faff 0%, #ffffff 100%)",
        }}
      >
        <div style={{ textAlign: "center", padding: "40px 60px 20px" }}>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#1e3a8a",
              marginBottom: "20px",
            }}
          >
            CERTIFICATE OF COMPLETION
          </h1>
          <h3
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#1e293b",
              margin: "15px 0",
            }}
          >
            {data.athleteName}
          </h3>
          <p style={{ fontSize: "18px", color: "#64748b", marginTop: "15px" }}>
            Event: <strong>{data.eventName}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
