// =====================================================
// FILE: components/PDFPreview.tsx - NEW COMPONENT FOR PREVIEW
// =====================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type PDFPreviewProps = {
  pdfUrl: string;
  fieldsConfig: any[];
  sampleData: Record<string, string>;
  onClose: () => void;
};

export default function PDFPreview({
  pdfUrl,
  fieldsConfig,
  sampleData,
  onClose,
}: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAndRenderPDF();
  }, [pdfUrl]);

  const loadAndRenderPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load PDF.js
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("PDF.js not loaded");
      }

      // Load PDF
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      // Get canvas context
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      // Set canvas size
      const viewport = page.getViewport({ scale: 1.4 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      console.log("✅ PDF rendered successfully");
      setLoading(false);
    } catch (err: any) {
      console.error("❌ Error rendering PDF:", err);
      setError(err.message || "Failed to load PDF");
      setLoading(false);
    }
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

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              <strong>Lỗi:</strong> {error}
            </div>
          )}

          {!loading && !error && (
            <div className="relative inline-block">
              {/* PDF Canvas Background */}
              <canvas
                ref={canvasRef}
                className="border border-gray-300 rounded"
              />

              {/* Overlay Fields */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: "1000px",
                  height: "707px",
                }}
              >
                {fieldsConfig.map((field: any, index: number) => {
                  const value =
                    sampleData[field.type] || field.placeholder || "";
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
                      }}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF.js Script Loader */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </div>
  );
}
