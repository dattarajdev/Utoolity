"use client";

import React from "react";
import {
  Sparkles,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  CheckCircle2,
  XCircle,
  Layers,
  Crop,
  Maximize2,
} from "lucide-react";

export interface PresetScenario {
  id: string;
  label: string;
  category: "rotation" | "flip" | "threshold" | "geometry";
  scenarioId: string;
  operation: {
    type: "rotate" | "rotate360" | "flip_h" | "flip_v";
    params: {
      angle?: number;
      expandCanvas?: boolean;
      intervals?: number;
      activeInterval?: number;
    };
  };
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: "blue" | "green" | "red" | "yellow" | "purple";
  description: string;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "rot-30",
    label: "30° Rotation",
    category: "rotation",
    scenarioId: "single-centered",
    operation: { type: "rotate", params: { angle: 30, expandCanvas: false } },
    icon: <RotateCcw size={13} />,
    description: "30° rotation verifying trigonometric envelope expansion.",
  },
  {
    id: "rot-45-exp",
    label: "45° + Expand Canvas",
    category: "rotation",
    scenarioId: "single-centered",
    operation: { type: "rotate", params: { angle: 45, expandCanvas: true } },
    icon: <Maximize2 size={13} />,
    badge: "Expanded",
    badgeColor: "blue",
    description: "45° rotation with expanded canvas (600x600 -> 849x849).",
  },
  {
    id: "rot-45-noexp",
    label: "45° (Fixed Canvas)",
    category: "rotation",
    scenarioId: "single-centered",
    operation: { type: "rotate", params: { angle: 45, expandCanvas: false } },
    icon: <RotateCcw size={13} />,
    description: "45° rotation maintaining original 600x600 canvas.",
  },
  {
    id: "rot-90",
    label: "90° Clockwise",
    category: "rotation",
    scenarioId: "single-centered",
    operation: { type: "rotate", params: { angle: 90, expandCanvas: false } },
    icon: <RotateCcw size={13} />,
    badge: "Cardinal",
    badgeColor: "purple",
    description: "90° rotation swapping box width and height.",
  },
  {
    id: "rot-180",
    label: "180° Inversion",
    category: "rotation",
    scenarioId: "single-centered",
    operation: { type: "rotate", params: { angle: 180, expandCanvas: false } },
    icon: <RotateCcw size={13} />,
    description: "180° inversion mirroring box center around image center.",
  },
  {
    id: "rot-360-step",
    label: "360° Sweep (4 intervals)",
    category: "rotation",
    scenarioId: "single-centered",
    operation: {
      type: "rotate360",
      params: { intervals: 4, activeInterval: 1, expandCanvas: false },
    },
    icon: <RotateCcw size={13} />,
    badge: "Sweep",
    badgeColor: "blue",
    description: "Interval 1 of 4 (90° step) in a 360° rotation sweep.",
  },
  {
    id: "flip-h",
    label: "Horizontal Flip",
    category: "flip",
    scenarioId: "border-object",
    operation: { type: "flip_h", params: {} },
    icon: <FlipHorizontal size={13} />,
    description: "Mirrors cx across vertical axis (cx' = 1 - cx).",
  },
  {
    id: "flip-v",
    label: "Vertical Flip",
    category: "flip",
    scenarioId: "corner-object",
    operation: { type: "flip_v", params: {} },
    icon: <FlipVertical size={13} />,
    description: "Mirrors cy across horizontal axis (cy' = 1 - cy).",
  },
  {
    id: "multi-class",
    label: "Multi-Class (4 Objects)",
    category: "geometry",
    scenarioId: "multi-class",
    operation: { type: "rotate", params: { angle: 45, expandCanvas: true } },
    icon: <Layers size={13} />,
    badge: "Classes 0..3",
    badgeColor: "purple",
    description: "4 objects with distinct class IDs to verify preservation.",
  },
  {
    id: "border-clip",
    label: "Border Object (Partial Clip)",
    category: "geometry",
    scenarioId: "border-object",
    operation: { type: "rotate", params: { angle: 30, expandCanvas: false } },
    icon: <Crop size={13} />,
    badge: "Clipped",
    badgeColor: "yellow",
    description: "Box extending past image edge to verify clipping math.",
  },
  {
    id: "thresh-exact-5",
    label: "Visibility: Exactly 5.00%",
    category: "threshold",
    scenarioId: "threshold-exact-5",
    operation: { type: "rotate", params: { angle: 0, expandCanvas: false } },
    icon: <CheckCircle2 size={13} className="text-emerald-400" />,
    badge: "5.00% PASS",
    badgeColor: "green",
    description: "Exactly 5.000% remaining area -> RETAINED.",
  },
  {
    id: "thresh-above-5",
    label: "Visibility: 5.01%",
    category: "threshold",
    scenarioId: "threshold-above-5",
    operation: { type: "rotate", params: { angle: 0, expandCanvas: false } },
    icon: <CheckCircle2 size={13} className="text-emerald-400" />,
    badge: "5.01% PASS",
    badgeColor: "green",
    description: "5.010% remaining area (> 5%) -> RETAINED.",
  },
  {
    id: "thresh-below-5",
    label: "Visibility: 4.99%",
    category: "threshold",
    scenarioId: "threshold-below-5",
    operation: { type: "rotate", params: { angle: 0, expandCanvas: false } },
    icon: <XCircle size={13} className="text-red-400" />,
    badge: "4.99% DROP",
    badgeColor: "red",
    description: "4.990% remaining area (< 5%) -> DISCARDED.",
  },
];

interface Props {
  activePresetId: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
  disabled?: boolean;
}

export const PresetScenariosBar: React.FC<Props> = ({
  activePresetId,
  onSelectPreset,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#A5A9B0] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-blue-400" />
          Test Scenarios & Edge Cases
        </label>
        <span className="text-[11px] text-[#A5A9B0]">
          Click to load preset verification configuration
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_SCENARIOS.map((preset) => {
          const isActive = preset.id === activePresetId;

          const badgeClasses = {
            blue: "bg-blue-900/60 text-blue-200 border-blue-700/60",
            green: "bg-emerald-900/60 text-emerald-200 border-emerald-700/60",
            red: "bg-red-900/60 text-red-200 border-red-700/60",
            yellow: "bg-amber-900/60 text-amber-200 border-amber-700/60",
            purple: "bg-purple-900/60 text-purple-200 border-purple-700/60",
          }[preset.badgeColor ?? "blue"];

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPreset(preset)}
              title={preset.description}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600/30 border-blue-500 text-white shadow-xs ring-1 ring-blue-500"
                  : "bg-[#27292D] border-[#454950] text-[#E5E7EB] hover:bg-[#3C4046] hover:border-[#585E68]"
              }`}
            >
              <span className="text-blue-400">{preset.icon}</span>
              <span>{preset.label}</span>
              {preset.badge && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded border font-mono ${badgeClasses}`}
                >
                  {preset.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
