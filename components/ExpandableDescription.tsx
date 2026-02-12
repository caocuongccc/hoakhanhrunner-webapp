// components/ExpandableDescription.tsx
// Component hiển thị description có nút "Xem thêm" / "Thu gọn"

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableDescriptionProps {
  description: string;
  maxLines?: number; // Số dòng tối đa khi collapsed (mặc định 2)
  className?: string;
}

export default function ExpandableDescription({
  description,
  maxLines = 2,
  className = "",
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) return null;

  // Detect if content is long enough to need expansion
  const needsExpansion =
    description.length > 150 || description.split("\n").length > maxLines;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Description Text */}
      <div
        className={`text-gray-700 whitespace-pre-wrap transition-all duration-300 ${
          !isExpanded && needsExpansion
            ? `line-clamp-${maxLines}` // Tailwind's line-clamp utility
            : ""
        }`}
        style={{
          // Fallback for line clamping if tailwind class doesn't work
          ...(!isExpanded && needsExpansion
            ? {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : {}),
        }}
        dangerouslySetInnerHTML={{
          __html: description
            .replace(/\n/g, "<br />")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/__(.*?)__/g, "<em>$1</em>"),
        }}
      />

      {/* Toggle Button */}
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
        >
          <span>{isExpanded ? "Thu gọn" : "Xem thêm"}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
