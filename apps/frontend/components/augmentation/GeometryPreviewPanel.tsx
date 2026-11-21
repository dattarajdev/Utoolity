"use client";

import React, { useState } from "react";
import {
  Columns2,
  Rows2,
  Maximize2,
  Sparkles,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { Badge, Alert } from "./ui";
import type {
  VerifyGeometryResponseDto,
  YoloBoxDto,
} from "../../api/augmentation.api";

interface Props {
  data: VerifyGeometryResponseDto | null;
  loading: boolean;
}

const CLASS_COLORS = [
  "#10B981", // 0: Emerald
  "#3B82F6", // 1: Blue
  "#F59E0B", // 2: Amber
  "#8B5CF6", // 3: Purple
  "#EC4899", // 4: Pink
  "#06B6D4", // 5: Cyan
  "#EF4444", // 6: Red
  "#6366F1", // 7: Indigo
];

export const GeometryPreviewPanel: React.FC<Props> = ({ data, loading }) => {
  const [layoutMode, setLayoutMode] = useState<"side-by-side" | "stacked">(
    "side-by-side",
  );
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTransformed, setCopiedTransformed] = useState(false);

  const copyToClipboard = (text: string, isOriginal: boolean) => {
    navigator.clipboard.writeText(text);
    if (isOriginal) {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedTransformed(true);
      setTimeout(() => setCopiedTransformed(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-[#454950] bg-[#32353A]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#A5A9B0] mt-3 font-medium">
          Executing Sharp physical image transform & YOLO geometric alignment...
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-[#454950] bg-[#32353A] p-10 text-center flex flex-col items-center justify-center">
        <Sparkles size={24} className="text-blue-400 opacity-60 mb-2" />
        <p className="text-sm font-semibold text-[#E5E7EB]">
          Ready to verify geometry
        </p>
        <p className="text-xs text-[#A5A9B0] mt-1 max-w-sm">
          Select a test scenario or customize rotation and click &quot;Verify
          Transformation&quot; to inspect synchronized pixels and bounding boxes.
        </p>
      </div>
    );
  }

  const {
    dimensions,
    originalBoxes,
    transformedBoxes,
    originalImageBase64,
    transformedImageBase64,
    originalAnnotationText,
    transformedAnnotationText,
    operation,
    summary,
  } = data;

  const isDimensionChanged =
    dimensions.actualTarget.width !== dimensions.source.width ||
    dimensions.actualTarget.height !== dimensions.source.height;

  return (
    <div className="flex flex-col gap-3">
      {/* Header with layout toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#E5E7EB]">
            Visual Bounding-Box Overlay Comparison
          </span>
          <span className="text-[11px] text-[#A5A9B0]">
            ({originalBoxes.length} source → {transformedBoxes.length} retained)
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setLayoutMode((m) =>
              m === "side-by-side" ? "stacked" : "side-by-side",
            )
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#32353A] hover:bg-[#3C4046] border border-[#454950] text-xs font-medium text-[#E5E7EB] transition-colors cursor-pointer"
        >
          {layoutMode === "side-by-side" ? (
            <>
              <Rows2 size={13} className="text-blue-400" />
              <span>Stacked View</span>
            </>
          ) : (
            <>
              <Columns2 size={13} className="text-blue-400" />
              <span>Side-by-Side</span>
            </>
          )}
        </button>
      </div>

      {/* Main Preview Container */}
      <div
        className={`w-full ${
          layoutMode === "side-by-side"
            ? "grid grid-cols-1 lg:grid-cols-2 gap-3.5"
            : "flex flex-col gap-3.5"
        }`}
      >
        {/* CARD 1: Original Image & Annotations */}
        <div className="flex flex-col rounded-xl border border-[#454950] bg-[#32353A] overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#2C2F34] border-b border-[#454950]">
            <span className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Original Source
            </span>
            <span className="text-[11px] font-mono text-[#A5A9B0]">
              {dimensions.source.width} × {dimensions.source.height}px
            </span>
          </div>

          {/* Image with SVG Overlay */}
          <div className="relative bg-[#1E2024] p-1 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden">
            <div className="relative inline-block max-w-full max-h-[350px]">
              <img
                src={originalImageBase64}
                alt="Original"
                className="max-w-full max-h-[350px] object-contain block select-none"
              />
              {/* Scaled SVG Bounding Box Overlay */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${dimensions.source.width} ${dimensions.source.height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {originalBoxes.map((box, idx) => {
                  const x1 = (box.cx - box.w / 2) * dimensions.source.width;
                  const y1 = (box.cy - box.h / 2) * dimensions.source.height;
                  const w = box.w * dimensions.source.width;
                  const h = box.h * dimensions.source.height;
                  const color =
                    CLASS_COLORS[box.classId % CLASS_COLORS.length] ?? "#3B82F6";

                  return (
                    <g key={idx}>
                      <rect
                        x={x1}
                        y={y1}
                        width={w}
                        height={h}
                        fill={color}
                        fillOpacity="0.15"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray="4,2"
                        rx="3"
                      />
                      <rect
                        x={x1}
                        y={Math.max(0, y1 - 16)}
                        width={Math.min(w, 55)}
                        height="16"
                        fill={color}
                        rx="2"
                      />
                      <text
                        x={x1 + 4}
                        y={Math.max(11, y1 - 4)}
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        cls:{box.classId}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* YOLO Annotation Text */}
          <div className="p-3 border-t border-[#454950] bg-[#2C2F34]/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-[#A5A9B0] uppercase tracking-wider">
                YOLO Annotations ({originalBoxes.length} boxes)
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(originalAnnotationText, true)
                }
                className="flex items-center gap-1 text-[10px] text-[#A5A9B0] hover:text-[#E5E7EB] cursor-pointer"
              >
                {copiedOriginal ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} />
                )}
                <span>{copiedOriginal ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-[#232529] border border-[#454950] rounded p-2 text-[#E5E7EB] overflow-x-auto max-h-20 select-all">
              {originalAnnotationText || "(empty)"}
            </pre>
          </div>
        </div>

        {/* CARD 2: Transformed Image & Annotations */}
        <div className="flex flex-col rounded-xl border border-blue-500/60 bg-[#32353A] overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#273248] border-b border-blue-500/40">
            <span className="text-xs font-semibold text-blue-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-400" />
              Transformed (Sharp Physical + Geometry Engine)
            </span>
            <span className="text-[11px] font-mono text-blue-300">
              {dimensions.actualTarget.width} ×{" "}
              {dimensions.actualTarget.height}px
            </span>
          </div>

          {/* Transformed Image with Transformed SVG Overlay */}
          <div className="relative bg-[#1E2024] p-1 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden">
            <div className="relative inline-block max-w-full max-h-[350px]">
              <img
                src={transformedImageBase64}
                alt="Transformed"
                className="max-w-full max-h-[350px] object-contain block select-none"
              />
              {/* Scaled SVG Bounding Box Overlay for Transformed Image */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${dimensions.actualTarget.width} ${dimensions.actualTarget.height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {transformedBoxes.map((box, idx) => {
                  const x1 =
                    (box.cx - box.w / 2) * dimensions.actualTarget.width;
                  const y1 =
                    (box.cy - box.h / 2) * dimensions.actualTarget.height;
                  const w = box.w * dimensions.actualTarget.width;
                  const h = box.h * dimensions.actualTarget.height;
                  const color =
                    CLASS_COLORS[box.classId % CLASS_COLORS.length] ?? "#3B82F6";

                  return (
                    <g key={idx}>
                      <rect
                        x={x1}
                        y={y1}
                        width={w}
                        height={h}
                        fill={color}
                        fillOpacity="0.2"
                        stroke={color}
                        strokeWidth="2.5"
                        rx="3"
                      />
                      <rect
                        x={x1}
                        y={Math.max(0, y1 - 16)}
                        width={Math.min(w, 55)}
                        height="16"
                        fill={color}
                        rx="2"
                      />
                      <text
                        x={x1 + 4}
                        y={Math.max(11, y1 - 4)}
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        cls:{box.classId}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Transformed YOLO Annotation Text */}
          <div className="p-3 border-t border-[#454950] bg-[#2C2F34]/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider">
                Transformed YOLO ({transformedBoxes.length} retained)
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(transformedAnnotationText, false)
                }
                className="flex items-center gap-1 text-[10px] text-[#A5A9B0] hover:text-[#E5E7EB] cursor-pointer"
              >
                {copiedTransformed ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} />
                )}
                <span>{copiedTransformed ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-[#232529] border border-blue-900/60 rounded p-2 text-blue-200 overflow-x-auto max-h-20 select-all">
              {transformedAnnotationText || "(no bounding boxes retained)"}
            </pre>
          </div>
        </div>
      </div>

      {/* Dimension Expansion Alert */}
      {isDimensionChanged && (
        <Alert type="info">
          <Info size={14} className="shrink-0" />
          <span>
            Canvas expanded from {dimensions.source.width}×{dimensions.source.height}px to{" "}
            <strong className="text-white font-mono">
              {dimensions.actualTarget.width}×{dimensions.actualTarget.height}px
            </strong>{" "}
            to enclose the rotated geometry. All transformed bounding boxes are normalized to the expanded canvas.
          </span>
        </Alert>
      )}
    </div>
  );
};
