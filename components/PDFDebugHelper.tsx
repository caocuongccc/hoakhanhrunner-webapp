// =====================================================
// FILE: components/PDFDebugHelper.tsx - Debug PDF Issues
// =====================================================
"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

export default function PDFDebugHelper() {
  const [status, setStatus] = useState({
    pdfjsLoaded: false,
    workerLoaded: false,
    error: null as string | null,
  });

  useEffect(() => {
    checkPDFJS();
  }, []);

  const checkPDFJS = () => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;

      if (!pdfjsLib) {
        setStatus({
          pdfjsLoaded: false,
          workerLoaded: false,
          error: "PDF.js library not found. Please refresh the page.",
        });
        return;
      }

      const workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc;

      setStatus({
        pdfjsLoaded: true,
        workerLoaded: !!workerSrc,
        error: workerSrc
          ? null
          : "Worker not configured. PDF rendering may fail.",
      });

      console.log("✅ PDF.js Status:", {
        loaded: true,
        version: pdfjsLib.version,
        workerSrc,
      });
    } catch (error: any) {
      setStatus({
        pdfjsLoaded: false,
        workerLoaded: false,
        error: error.message,
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200 max-w-sm z-50">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        PDF.js Status
      </h3>

      <div className="space-y-2 text-sm">
        <StatusRow
          label="PDF.js Library"
          status={status.pdfjsLoaded}
          error={!status.pdfjsLoaded ? status.error : null}
        />
        <StatusRow
          label="Worker Script"
          status={status.workerLoaded}
          error={!status.workerLoaded ? status.error : null}
        />
      </div>

      {status.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {status.error}
        </div>
      )}

      <button
        onClick={checkPDFJS}
        className="mt-3 w-full py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        Refresh Status
      </button>

      {/* Manual Load Button */}
      {!status.pdfjsLoaded && (
        <button
          onClick={() => {
            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              checkPDFJS();
            };
            document.head.appendChild(script);
          }}
          className="mt-2 w-full py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
        >
          Force Load PDF.js
        </button>
      )}
    </div>
  );
}

function StatusRow({
  label,
  status,
  error,
}: {
  label: string;
  status: boolean;
  error: string | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{label}:</span>
      <div className="flex items-center gap-1">
        {status ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className={status ? "text-green-600" : "text-red-600"}>
          {status ? "OK" : "Failed"}
        </span>
      </div>
    </div>
  );
}
