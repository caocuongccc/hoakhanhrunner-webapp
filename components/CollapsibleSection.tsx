import { ChevronDown, ChevronUp } from "lucide-react";

export function CollapsibleSection({
  title,
  children,
  isExpanded,
  onToggle,
  headerColor,
  icon,
  iconBg,
}: {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  headerColor: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${headerColor} rounded-2xl border-2 overflow-hidden`}
    >
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-6 w-6 text-gray-600" />
        ) : (
          <ChevronDown className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Content - Collapsible */}
      {isExpanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}
