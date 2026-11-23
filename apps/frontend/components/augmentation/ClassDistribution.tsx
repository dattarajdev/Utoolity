import React from "react";
import { BarChart2 } from "lucide-react";

export const CLASS_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#84cc16",
];

interface Props {
  distribution: Record<string, number>;
  className?: string;
  maxHeight?: string;
}

export const ClassDistribution: React.FC<Props> = ({
  distribution,
  className = "",
  maxHeight = "max-h-56",
}) => {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const totalObjects = Object.values(distribution).reduce(
    (sum, val) => sum + val,
    0,
  );
  const totalClasses = entries.length;

  if (totalClasses === 0) {
    return (
      <div
        className={`p-3 rounded-lg border border-dashed border-[#454950] bg-[#27292D]/50 text-center ${className}`}
      >
        <p className="text-xs text-[#A5A9B0] font-medium">
          No annotated objects found
        </p>
        <p className="text-[11px] text-[#6B7280] mt-0.5">
          Scan a dataset with YOLO annotations to see class-wise distribution.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg bg-[#27292D] border border-[#454950] text-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#454950]">
        <div className="flex items-center gap-1.5 font-semibold text-[#E5E7EB]">
          <BarChart2 size={13} className="text-blue-500" />
          <span>Class Distribution</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#A5A9B0] font-medium">
          <span className="bg-[#32353A] border border-[#454950] px-1.5 py-0.5 rounded text-[10px] text-[#E5E7EB] font-mono">
            {totalClasses} {totalClasses === 1 ? "class" : "classes"}
          </span>
          <span>•</span>
          <span className="font-semibold text-[#E5E7EB]">
            {totalObjects.toLocaleString()}{" "}
            {totalObjects === 1 ? "object" : "objects"}
          </span>
        </div>
      </div>

      {/* Class distribution list */}
      <div className={`flex flex-col gap-2 overflow-y-auto pr-1 ${maxHeight}`}>
        {entries.map(([rawName, count], idx) => {
          const percentage =
            totalObjects > 0 ? (count / totalObjects) * 100 : 0;
          const color = CLASS_COLORS[idx % CLASS_COLORS.length];
          const displayName = /^\d+$/.test(rawName.trim())
            ? `Class ${rawName.trim()}`
            : rawName;

          return (
            <div key={rawName} className="flex flex-col gap-1 group">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="font-medium text-[#E5E7EB] truncate"
                    title={displayName}
                  >
                    {displayName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                  <span className="text-[#A5A9B0] font-semibold">
                    {count.toLocaleString()}{" "}
                    {count === 1 ? "object" : "objects"}
                  </span>
                  <span className="text-[#454950]">|</span>
                  <span className="text-blue-400 font-semibold w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Proportional horizontal bar */}
              <div className="h-1.5 w-full bg-[#3C4046] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(1, Math.min(100, percentage))}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassDistribution;
