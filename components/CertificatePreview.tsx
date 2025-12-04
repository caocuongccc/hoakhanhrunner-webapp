// =====================================================
// FILE 1: components/CertificatePreview.tsx - UPDATED WITH TEMPLATE
// =====================================================
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
    template?: {
      pdf_url: string;
      fields_config: any[];
    };
  };
  onClose: () => void;
};

export default function CertificatePreview({
  data,
  onClose,
}: CertificatePreviewProps) {
  const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data.template?.pdf_url) {
      loadPdfAsImage();
    } else {
      setLoading(false);
    }
  }, [data.template?.pdf_url]);

  const loadPdfAsImage = async () => {
    try {
      // Convert PDF to image for preview
      const response = await fetch(
        `/api/pdf-to-image?url=${encodeURIComponent(data.template!.pdf_url)}`
      );
      if (response.ok) {
        const blob = await response.blob();
        setPdfDataUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
    } finally {
      setLoading(false);
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
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : data.template ? (
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
              }}
            >
              {/* Overlay fields according to config */}
              {data.template.fields_config.map((field: any, index: number) => {
                const value = dataMap[field.type] || "";
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
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            right: "10px",
            bottom: "10px",
            border: "1px solid #93c5fd",
          }}
        />

        <div style={{ textAlign: "center", padding: "40px 60px 20px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 15px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "36px",
              fontWeight: "bold",
            }}
          >
            RC
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "36px",
              fontWeight: 700,
              color: "#1e3a8a",
              letterSpacing: "2px",
              marginBottom: "5px",
            }}
          >
            CERTIFICATE OF COMPLETION
          </h1>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#2563eb",
              marginBottom: "20px",
            }}
          >
            GIẤY CHỨNG NHẬN
          </h2>
        </div>

        <div style={{ textAlign: "center", padding: "20px 60px" }}>
          <p
            style={{
              fontSize: "16px",
              color: "#64748b",
              marginBottom: "10px",
              fontStyle: "italic",
            }}
          >
            This Certificate is Presented to / Trao tặng
          </p>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "48px",
              fontWeight: 700,
              color: "#1e293b",
              margin: "15px 0 20px",
              paddingBottom: "10px",
              borderBottom: "2px solid #2563eb",
              display: "inline-block",
              minWidth: "400px",
            }}
          >
            {data.athleteName}
          </h3>
          <p style={{ fontSize: "18px", color: "#64748b", marginTop: "15px" }}>
            Event / Giải:{" "}
            <strong style={{ color: "#1e293b" }}>{data.eventName}</strong>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "40px",
            padding: "30px 60px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "20px 30px",
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              borderRadius: "12px",
              border: "2px solid #bfdbfe",
              minWidth: "200px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "8px",
              }}
            >
              ACTIVE DAYS
            </div>
            <div
              style={{ fontSize: "32px", fontWeight: 700, color: "#2563eb" }}
            >
              {data.activeDays}
            </div>
            <div
              style={{ fontSize: "16px", color: "#64748b", marginTop: "5px" }}
            >
              {data.activeDays}/{data.totalDays} ngày
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "20px 30px",
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              borderRadius: "12px",
              border: "2px solid #bfdbfe",
              minWidth: "200px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "8px",
              }}
            >
              DISTANCE
            </div>
            <div
              style={{ fontSize: "32px", fontWeight: 700, color: "#2563eb" }}
            >
              {data.totalDistance.toFixed(1)} KM
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "20px 30px",
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              borderRadius: "12px",
              border: "2px solid #bfdbfe",
              minWidth: "200px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "8px",
              }}
            >
              PACE
            </div>
            <div
              style={{ fontSize: "32px", fontWeight: 700, color: "#2563eb" }}
            >
              {data.averagePace}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
