// components/CertificatePreview.tsx - Preview certificate before generating
"use client";

import { X } from "lucide-react";

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
  onClose: () => void;
};

export default function CertificatePreview({
  data,
  onClose,
}: CertificatePreviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Certificate Preview */}
        <div className="p-8">
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
              {/* Border decoration */}
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

              {/* Header */}
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
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
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

              {/* Presented To */}
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
                <p
                  style={{
                    fontSize: "18px",
                    color: "#64748b",
                    marginTop: "15px",
                  }}
                >
                  Event / Giải:{" "}
                  <strong style={{ color: "#1e293b" }}>{data.eventName}</strong>
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    margin: "10px 0",
                    fontStyle: "italic",
                  }}
                >
                  has successfully completed / đã hoàn thành
                </p>
              </div>

              {/* Stats Section */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "40px",
                  padding: "30px 60px",
                  margin: "20px 0",
                }}
              >
                {/* Active Days */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 30px",
                    background:
                      "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    borderRadius: "12px",
                    border: "2px solid #bfdbfe",
                    minWidth: "200px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Active Days
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {data.activeDays}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      color: "#64748b",
                      marginTop: "5px",
                    }}
                  >
                    Số ngày chạy: {data.activeDays}/{data.totalDays}
                  </div>
                </div>

                {/* Distance */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 30px",
                    background:
                      "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    borderRadius: "12px",
                    border: "2px solid #bfdbfe",
                    minWidth: "200px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Distance
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {data.totalDistance.toFixed(1)} KM
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      color: "#64748b",
                      marginTop: "5px",
                    }}
                  >
                    Thành tích: {data.totalDistance.toFixed(1)} KM
                  </div>
                </div>

                {/* Pace */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 30px",
                    background:
                      "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    borderRadius: "12px",
                    border: "2px solid #bfdbfe",
                    minWidth: "200px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Pace
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {data.averagePace}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      color: "#64748b",
                      marginTop: "5px",
                    }}
                  >
                    Pace: {data.averagePace} min/km
                  </div>
                </div>
              </div>

              {/* Completion Date */}
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 60px",
                  fontSize: "14px",
                  color: "#64748b",
                }}
              >
                <div style={{ fontWeight: 500, color: "#1e293b" }}>
                  Completed on / Hoàn thành ngày:{" "}
                  <strong>{data.completionDate}</strong>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  position: "absolute",
                  bottom: "40px",
                  left: "60px",
                  right: "60px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                {/* Signature */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "250px",
                      borderTop: "2px solid #2563eb",
                      marginBottom: "8px",
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "18px",
                      color: "#2563eb",
                      fontStyle: "italic",
                    }}
                  >
                    Running Club
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    Event Organizer
                  </div>
                </div>

                {/* Seal */}
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    border: "5px solid #bfdbfe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  <div style={{ fontSize: "11px", textAlign: "center" }}>
                    RUNNING
                    <br />
                    CLUB
                  </div>
                  <div style={{ fontSize: "18px", marginTop: "2px" }}>2025</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
