"use client";

import React, { useState } from "react";
import {
  Layers,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RefreshCw,
  Scissors,
  ZoomIn,
  Square,
  Grid2x2,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Compass,
  Check,
  Plus,
  Minus,
  Sparkles,
  Info,
} from "lucide-react";
import { SectionCard, Toggle, Badge } from "./ui";
import type { AugmentationConfig } from "../../api/augmentation.api";

// ---- Types -----------------------------------------------------------------

interface SettingDef {
  key: string;
  label: string;
  type: "number" | "range";
  min?: number;
  max?: number;
  step?: number;
  default: number;
}

interface AugCardDef {
  id: string;
  label: string;
  description: string;
  category: "orientation" | "geometry" | "occlusion";
  icon: React.ReactNode;
  defaultParams: Record<string, unknown>;
  settings?: SettingDef[];
}

// ---- Augmentation definitions (Exactly 8 visible cards in 2-column x 4-row grid) -----

const AUG_CARDS: AugCardDef[] = [
  {
    id: "flip_h",
    label: "Horizontal Flip",
    description:
      "Mirror image and bounding boxes horizontally across the vertical axis",
    category: "orientation",
    icon: <FlipHorizontal size={20} />,
    defaultParams: {},
    settings: [],
  },
  {
    id: "flip_v",
    label: "Vertical Flip",
    description:
      "Invert image and bounding boxes vertically across the horizontal axis",
    category: "orientation",
    icon: <FlipVertical size={20} />,
    defaultParams: {},
    settings: [],
  },
  {
    id: "rotate",
    label: "Rotation",
    description:
      "Rotate between -180° and +180° with recalculated bounding envelope",
    category: "orientation",
    icon: <RotateCcw size={20} />,
    defaultParams: { angle: 30 },
    settings: [
      {
        key: "angle",
        label: "Angle (°)",
        type: "range",
        min: -180,
        max: 180,
        step: 1,
        default: 30,
      },
    ],
  },
  {
    id: "rotate360",
    label: "360° Rotation",
    description:
      "Generates X-1 evenly spaced rotations across the circle (excluding 360° duplicate)",
    category: "orientation",
    icon: <RefreshCw size={20} />,
    defaultParams: { count: 4 },
    settings: [
      {
        key: "count",
        label: "Interval count (X)",
        type: "number",
        min: 2,
        max: 36,
        step: 1,
        default: 4,
      },
    ],
  },
  {
    id: "shear",
    label: "Shear",
    description:
      "Affine directional shear skewing along horizontal and vertical axes",
    category: "geometry",
    icon: <Scissors size={20} />,
    defaultParams: { shear_x: 0.2, shear_y: 0.0 },
    settings: [
      {
        key: "shear_x",
        label: "Shear X",
        type: "range",
        min: -0.5,
        max: 0.5,
        step: 0.05,
        default: 0.2,
      },
      {
        key: "shear_y",
        label: "Shear Y",
        type: "range",
        min: -0.5,
        max: 0.5,
        step: 0.05,
        default: 0.0,
      },
    ],
  },
  {
    id: "zoom",
    label: "Zoom",
    description:
      "Center-crop magnification with scaled and clipped bounding boxes",
    category: "geometry",
    icon: <ZoomIn size={20} />,
    defaultParams: { scale: 1.3 },
    settings: [
      {
        key: "scale",
        label: "Scale level",
        type: "range",
        min: 1.3,
        max: 1.9,
        step: 0.3,
        default: 1.3,
      },
    ],
  },
  {
    id: "cutout",
    label: "Cutout",
    description:
      "Random gray-filled rectangular occlusion patches for occlusion robustness",
    category: "occlusion",
    icon: <Square size={20} />,
    defaultParams: { num_holes: 3, hole_size: 0.1 },
    settings: [
      {
        key: "num_holes",
        label: "Number of holes",
        type: "number",
        min: 1,
        max: 8,
        step: 1,
        default: 3,
      },
      {
        key: "hole_size",
        label: "Hole size fraction",
        type: "range",
        min: 0.05,
        max: 0.3,
        step: 0.01,
        default: 0.1,
      },
    ],
  },
  {
    id: "mosaic",
    label: "Mosaic",
    description:
      "Synthesizes 4 image quadrants into a composite multi-scale view",
    category: "occlusion",
    icon: <Grid2x2 size={20} />,
    defaultParams: {},
    settings: [],
  },
];

// ---- Stepped Ruler Zoom Control (30%, 60%, 90%) ----------------------------

interface ZoomStep {
  percent: number;
  scale: number;
  label: string;
  subtext: string;
}

const ZOOM_STEPS: ZoomStep[] = [
  {
    percent: 30,
    scale: 1.3,
    label: "30% Zoom",
    subtext: "1.3× scale (crops center 77%)",
  },
  {
    percent: 60,
    scale: 1.6,
    label: "60% Zoom",
    subtext: "1.6× scale (crops center 62.5%)",
  },
  {
    percent: 90,
    scale: 1.9,
    label: "90% Zoom",
    subtext: "1.9× scale (crops center 52.6%)",
  },
];

interface ZoomRulerControlProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const ZoomRulerControl: React.FC<ZoomRulerControlProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const currentStep = ZOOM_STEPS.reduce((prev, curr) =>
    Math.abs(curr.scale - value) < Math.abs(prev.scale - value) ? curr : prev,
    ZOOM_STEPS[0],
  );

  const activeIndex = ZOOM_STEPS.findIndex(
    (s) => s.percent === currentStep.percent,
  );

  return (
    <div className="flex flex-col gap-3 pt-1 select-none">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles size={13} className="text-blue-400" />
          Stepped Zoom Ruler
        </label>
        <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950/40 border border-blue-700/60 px-2 py-0.5 rounded shadow-xs">
          +{currentStep.percent}% ({currentStep.scale.toFixed(1)}×)
        </span>
      </div>

      <div className="bg-[#27292D] border border-[#454950] rounded-xl p-3 sm:p-3.5">
        <div className="relative mx-3 my-2">
          {/* Base ruler track */}
          <div className="h-2 bg-[#3C4046] rounded-full w-full relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-200"
              style={{
                width: `${(activeIndex / (ZOOM_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Stepped Ruler Tick Marks */}
          <div className="absolute inset-0 -top-1.5 flex justify-between items-center pointer-events-none">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full ${
                  i % 4 === 0 ? "h-4 bg-[#6B7280]" : "h-2.5 bg-[#454950]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 3 Step Selector Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-1">
          {ZOOM_STEPS.map((step) => {
            const isSelected = step.percent === currentStep.percent;
            return (
              <button
                key={step.percent}
                type="button"
                disabled={disabled}
                onClick={() => onChange(step.scale)}
                className={`group flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                  disabled
                    ? "opacity-40 cursor-not-allowed border-[#454950] bg-[#27292D]"
                    : isSelected
                    ? "bg-blue-600 text-white border-blue-500 shadow-xs ring-2 ring-blue-500/30"
                    : "bg-[#32353A] text-[#E5E7EB] border-[#454950] hover:border-blue-500 hover:bg-[#383C42]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-1 transition-all ${
                    isSelected
                      ? "border-white bg-white text-blue-600"
                      : "border-[#454950] bg-[#27292D] group-hover:border-blue-400"
                  }`}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </div>

                <span
                  className={`text-xs font-bold leading-tight ${
                    isSelected ? "text-white" : "text-[#E5E7EB]"
                  }`}
                >
                  {step.percent}%
                </span>
                <span
                  className={`text-[10px] font-mono leading-tight mt-0.5 ${
                    isSelected ? "text-blue-100" : "text-[#A5A9B0]"
                  }`}
                >
                  {step.scale.toFixed(1)}×
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 pt-2 border-t border-[#454950] flex items-center gap-1.5 text-[11px] text-[#A5A9B0] justify-center">
          <Info size={12} className="text-blue-400 shrink-0" />
          <span>
            <strong className="text-[#E5E7EB]">{currentStep.label}:</strong>{" "}
            {currentStep.subtext}
          </span>
        </div>
      </div>
    </div>
  );
};

// ---- Rotation Controls -----------------------------------------------------

const ROTATION_PRESETS = [
  { deg: -90, label: "-90°" },
  { deg: -45, label: "-45°" },
  { deg: 0, label: "0°" },
  { deg: 45, label: "+45°" },
  { deg: 90, label: "+90°" },
  { deg: 180, label: "180°" },
];

interface RotationControlProps {
  angle: number;
  onChange: (angle: number) => void;
  disabled?: boolean;
}

const RotationControl: React.FC<RotationControlProps> = ({
  angle,
  onChange,
  disabled,
}) => {
  const handleStep = (delta: number) => {
    let next = angle + delta;
    if (next > 180) next = -180 + (next - 180);
    if (next < -180) next = 180 + (next + 180);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-wide">
          Rotation Angle
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={-180}
            max={180}
            value={angle}
            disabled={disabled}
            onChange={(e) =>
              onChange(Math.max(-180, Math.min(180, Number(e.target.value))))
            }
            className="w-16 border border-[#454950] rounded-md px-1.5 py-0.5 text-xs text-right font-mono bg-[#27292D] font-bold text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs font-bold text-[#A5A9B0]">°</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleStep(-15)}
          className="p-1 rounded bg-[#3C4046] hover:bg-[#454950] text-[#E5E7EB] font-semibold text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-40"
          title="-15 degrees"
        >
          <Minus size={13} />
        </button>

        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={angle}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-blue-600 h-2 cursor-pointer bg-[#3C4046]"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleStep(15)}
          className="p-1 rounded bg-[#3C4046] hover:bg-[#454950] text-[#E5E7EB] font-semibold text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-40"
          title="+15 degrees"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1 pt-0.5">
        {ROTATION_PRESETS.map((p) => (
          <button
            key={p.deg}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.deg)}
            className={`text-[11px] py-1 rounded border font-medium transition-all cursor-pointer ${
              angle === p.deg
                ? "bg-blue-600 text-white border-blue-500 font-bold shadow-xs"
                : "bg-[#27292D] text-[#A5A9B0] border-[#454950] hover:bg-[#3C4046] hover:text-[#E5E7EB]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ---- 360° Rotation Control -------------------------------------------------

const INTERVAL_PRESETS = [
  { count: 4, label: "4 Slices (90° steps)" },
  { count: 6, label: "6 Slices (60° steps)" },
  { count: 8, label: "8 Slices (45° steps)" },
  { count: 12, label: "12 Slices (30° steps)" },
];

interface Rotate360ControlProps {
  count: number;
  onChange: (count: number) => void;
  disabled?: boolean;
}

const Rotate360Control: React.FC<Rotate360ControlProps> = ({
  count,
  onChange,
  disabled,
}) => {
  const generatedCount = Math.max(1, count - 1);
  const angles = Array.from({ length: generatedCount }).map((_, i) =>
    Math.round(((i + 1) * 360) / count),
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-wide">
          Circle Slices (Interval Count X)
        </label>
        <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950/40 border border-blue-700/60 px-2 py-0.5 rounded shadow-xs">
          {count} slices &rarr; {generatedCount} images
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {INTERVAL_PRESETS.map((p) => (
          <button
            key={p.count}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.count)}
            className={`text-[10px] sm:text-[11px] py-1 px-1 rounded border font-medium transition-all truncate cursor-pointer ${
              count === p.count
                ? "bg-blue-600 text-white border-blue-500 font-bold shadow-xs"
                : "bg-[#27292D] text-[#A5A9B0] border-[#454950] hover:bg-[#3C4046]"
            }`}
          >
            {p.count} slices
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="range"
          min={2}
          max={24}
          step={1}
          value={count}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-blue-600 h-2 cursor-pointer bg-[#3C4046]"
        />
        <input
          type="number"
          min={2}
          max={36}
          value={count}
          disabled={disabled}
          onChange={(e) =>
            onChange(Math.max(2, Math.min(36, Number(e.target.value))))
          }
          className="w-14 border border-[#454950] rounded px-1.5 py-0.5 text-xs text-center font-mono bg-[#27292D] font-bold text-[#E5E7EB]"
        />
      </div>

      <div className="bg-[#27292D] border border-[#454950] rounded-lg p-2 text-[11px] text-[#A5A9B0] flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#E5E7EB]">Generated Angles:</span>
          <span className="text-[10px] text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-700/60">
            360° duplicate excluded
          </span>
        </div>
        <p className="font-mono text-[10px] text-blue-400 truncate">
          {angles
            .slice(0, 8)
            .map((a) => `${a}°`)
            .join(", ")}
          {angles.length > 8 ? ` +${angles.length - 8} more` : ""}
        </p>
      </div>
    </div>
  );
};

// ---- Augmentation Card Component -------------------------------------------

interface AugCardProps {
  card: AugCardDef;
  selected: boolean;
  params: Record<string, unknown>;
  onToggle: () => void;
  onParamChange: (key: string, val: number) => void;
  disabled?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}

const AugCard: React.FC<AugCardProps> = ({
  card,
  selected,
  params,
  onToggle,
  onParamChange,
  disabled = false,
  expanded,
  onToggleExpand,
}) => {
  const hasSettings = Boolean(card.settings && card.settings.length > 0);
  const isOrientation = card.category === "orientation";

  return (
    <div
      className={`border rounded-xl p-4 sm:p-4.5 transition-all select-none flex flex-col justify-between min-h-[128px] ${
        disabled
          ? "opacity-50 bg-[#2C2F34]/50 border-[#454950] cursor-not-allowed"
          : selected
          ? "border-blue-500 bg-blue-950/30 shadow-sm ring-2 ring-blue-500/20"
          : "border-[#454950] bg-[#2C2F34] hover:border-[#585E67] hover:bg-[#32353A]"
      }`}
    >
      <div>
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="pt-0.5">
            <button
              type="button"
              disabled={disabled}
              onClick={onToggle}
              aria-label={`Toggle ${card.label}`}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                disabled
                  ? "border-[#454950] bg-[#27292D] cursor-not-allowed"
                  : selected
                  ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                  : "bg-[#27292D] border-[#454950] hover:border-blue-400"
              }`}
            >
              {selected && <Check size={14} className="stroke-[3]" />}
            </button>
          </div>

          {/* Large Icon Container */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selected
                ? "bg-blue-600 text-white shadow-xs"
                : isOrientation
                ? "bg-blue-950/40 text-blue-400 border border-blue-800/60"
                : "bg-[#27292D] text-[#A5A9B0]"
            }`}
          >
            {card.icon}
          </div>

          {/* Title & Description */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => !disabled && onToggle()}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-bold text-[#E5E7EB] leading-tight">
                {card.label}
              </h4>
              {isOrientation && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-950/50 text-blue-300 border border-blue-800/60">
                  <Compass size={10} />
                  Orientation
                </span>
              )}
            </div>
            <p className="text-xs text-[#A5A9B0] leading-relaxed mt-1">
              {card.description}
            </p>
          </div>

          {/* Settings Expander Toggle */}
          {selected && hasSettings && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              title={expanded ? "Collapse settings" : "Expand settings"}
              className="p-1.5 rounded-lg text-blue-300 hover:bg-blue-950/60 transition-colors shrink-0 cursor-pointer"
            >
              {expanded ? (
                <ChevronUp size={16} />
              ) : (
                <SlidersHorizontal size={16} />
              )}
            </button>
          )}
        </div>

        {/* Collapsed summary badge */}
        {selected && hasSettings && !expanded && (
          <div className="mt-3 pt-2 border-t border-blue-800/40 flex items-center justify-between text-xs text-blue-300">
            <span className="truncate font-medium">
              {card.id === "zoom"
                ? `Zoom Stop: ${Math.round((Number(params.scale ?? 1.3) - 1.0) * 100)}% (${Number(params.scale ?? 1.3).toFixed(1)}×)`
                : card.id === "rotate"
                ? `Angle: ${Number(params.angle ?? 30)}°`
                : card.id === "rotate360"
                ? `Intervals: ${Number(params.count ?? 4)} slices (${Math.round(360 / Number(params.count ?? 4))}° steps)`
                : card.settings
                    ?.map(
                      (s) =>
                        `${s.label.split(" ")[0]}: ${Number(params[s.key] ?? s.default)}`,
                    )
                    .join(", ")}
            </span>
            <button
              type="button"
              onClick={onToggleExpand}
              className="font-semibold text-blue-200 hover:underline ml-1 shrink-0 cursor-pointer"
            >
              Adjust
            </button>
          </div>
        )}
      </div>

      {/* Expanded Settings Section */}
      {selected && hasSettings && expanded && (
        <div className="mt-3.5 pt-3 border-t border-blue-800/40 flex flex-col gap-2.5">
          {card.id === "zoom" ? (
            <ZoomRulerControl
              value={Number(params.scale ?? 1.3)}
              onChange={(val) => onParamChange("scale", val)}
              disabled={disabled}
            />
          ) : card.id === "rotate" ? (
            <RotationControl
              angle={Number(params.angle ?? 30)}
              onChange={(val) => onParamChange("angle", val)}
              disabled={disabled}
            />
          ) : card.id === "rotate360" ? (
            <Rotate360Control
              count={Number(params.count ?? 4)}
              onChange={(val) => onParamChange("count", val)}
              disabled={disabled}
            />
          ) : (
            card.settings!.map((setting) => (
              <div key={setting.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[#A5A9B0] font-medium truncate">
                    {setting.label}
                  </label>
                  <span className="text-xs font-mono text-blue-300 bg-[#27292D] border border-blue-800/60 px-1.5 py-0.5 rounded shrink-0">
                    {Number(params[setting.key] ?? setting.default).toFixed(
                      setting.step && setting.step < 1 ? 2 : 0,
                    )}
                  </span>
                </div>
                {setting.type === "range" ? (
                  <input
                    type="range"
                    min={setting.min}
                    max={setting.max}
                    step={setting.step}
                    value={Number(params[setting.key] ?? setting.default)}
                    onChange={(e) =>
                      onParamChange(setting.key, Number(e.target.value))
                    }
                    className="w-full accent-blue-600 h-2 cursor-pointer bg-[#3C4046]"
                  />
                ) : (
                  <input
                    type="number"
                    min={setting.min}
                    max={setting.max}
                    step={setting.step}
                    value={Number(params[setting.key] ?? setting.default)}
                    onChange={(e) =>
                      onParamChange(setting.key, Number(e.target.value))
                    }
                    className="w-full border border-[#454950] rounded-md px-2 py-1 text-xs bg-[#27292D] text-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ---- Main Augmentation Panel -----------------------------------------------

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  selectedAugs: AugmentationConfig[];
  onAugsChange: (augs: AugmentationConfig[]) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AugmentationPanel: React.FC<Props> = ({
  enabled,
  onEnabledChange,
  selectedAugs,
  onAugsChange,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [paramsCache, setParamsCache] = useState<
    Record<string, Record<string, unknown>>
  >(() => {
    const initial: Record<string, Record<string, unknown>> = {};
    for (const card of AUG_CARDS) {
      initial[card.id] = { ...card.defaultParams };
    }
    return initial;
  });

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const getConfig = (id: string): AugmentationConfig | undefined =>
    selectedAugs.find((a) => a.type === id);

  const isSelected = (id: string) => Boolean(getConfig(id));

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCard = (card: AugCardDef) => {
    if (isSelected(card.id)) {
      onAugsChange(selectedAugs.filter((a) => a.type !== card.id));
    } else {
      const restoredParams = paramsCache[card.id] || { ...card.defaultParams };
      onAugsChange([
        ...selectedAugs,
        { type: card.id, params: { ...restoredParams } },
      ]);
    }
  };

  const updateParam = (id: string, key: string, val: number) => {
    setParamsCache((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: val,
      },
    }));

    onAugsChange(
      selectedAugs.map((a) =>
        a.type === id ? { ...a, params: { ...a.params, [key]: val } } : a,
      ),
    );
  };

  const handleSelectAll = () => {
    const allConfigs: AugmentationConfig[] = AUG_CARDS.map((card) => ({
      type: card.id,
      params: { ...(paramsCache[card.id] || card.defaultParams) },
    }));
    onAugsChange(allConfigs);
  };

  const handleClearAll = () => {
    onAugsChange([]);
  };

  // Collapsed narrow vertical strip
  if (collapsed) {
    return (
      <div className="bg-[#32353A] border border-[#454950] rounded-xl shadow-xs p-2 flex flex-col items-center justify-between h-full select-none min-h-[480px]">
        {/* Top: Expand Chevron Button & Active Count Indicator */}
        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand Augmentation Panel"
            className="w-10 h-10 rounded-lg bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 flex items-center justify-center transition-colors shadow-xs cursor-pointer mb-2 border border-blue-800/60"
            title="Expand Augmentation Panel"
          >
            <ChevronRight size={20} className="stroke-[2.5]" />
          </button>

          {enabled && selectedAugs.length > 0 ? (
            <span
              className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs mb-2"
              title={`${selectedAugs.length} active transformation(s)`}
            >
              {selectedAugs.length}
            </span>
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#454950] mb-2"
              title={
                enabled ? "No augmentations selected" : "Augmentation disabled"
              }
            />
          )}

          <div className="w-8 h-[1px] bg-[#454950] mb-2" />
        </div>

        {/* Middle: 8 Compact Icon Buttons */}
        <div className="flex flex-col gap-2 w-full items-center my-auto">
          {AUG_CARDS.map((card) => {
            const isSel = enabled && isSelected(card.id);
            return (
              <button
                key={card.id}
                type="button"
                disabled={!enabled}
                onClick={() => toggleCard(card)}
                title={`${card.label}: ${
                  isSel
                    ? "Active (click to disable)"
                    : "Inactive (click to enable)"
                }`}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer relative group ${
                  !enabled
                    ? "opacity-30 cursor-not-allowed bg-[#27292D] text-[#6B7280]"
                    : isSel
                    ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/25"
                    : "bg-[#27292D] text-[#A5A9B0] hover:bg-blue-950/40 hover:text-blue-300"
                }`}
              >
                {card.icon}
                {isSel && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#2C2F34] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom: Expand label */}
        <div className="flex flex-col items-center w-full pt-2 border-t border-[#454950] mt-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-[10px] font-bold uppercase tracking-wider text-[#A5A9B0] hover:text-blue-400 flex flex-col items-center gap-1 cursor-pointer transition-colors p-1"
            title="Expand Augmentation Controls"
          >
            <ChevronRight size={16} />
            <span className="text-[9px] [writing-mode:vertical-lr] rotate-180 font-bold">
              Expand
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Header action: Toggle switch + Active badge + Collapse button
  const headerAction = (
    <div className="flex items-center gap-2">
      {enabled && selectedAugs.length > 0 && (
        <Badge color="blue" className="font-semibold">
          {selectedAugs.length} active
        </Badge>
      )}
      <Toggle
        checked={enabled}
        onChange={onEnabledChange}
        id="toggle-augmentation-enable"
        label={enabled ? "Enabled" : "Disabled"}
      />
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md text-[#A5A9B0] hover:text-[#E5E7EB] hover:bg-[#3C4046] border border-[#454950] transition-colors shadow-xs cursor-pointer ml-1"
          title="Collapse augmentation sidebar to expand preview workspace"
          aria-label="Collapse augmentation sidebar"
        >
          <ChevronLeft size={15} />
          <span className="hidden sm:inline">Collapse</span>
        </button>
      )}
    </div>
  );

  return (
    <SectionCard
      number={3}
      title="Image Augmentation"
      subtitle="Select & configure geometric transformations"
      icon={<Layers size={18} />}
      color="#10B981"
      headerAction={headerAction}
      className="h-full"
    >
      <div className="flex flex-col gap-3.5">
        {/* Sub-header controls when enabled */}
        {enabled && (
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#454950]">
            <span className="text-[#A5A9B0] font-medium">
              Transformations ({selectedAugs.length} of {AUG_CARDS.length}{" "}
              selected)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-[#454950]">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-medium text-[#A5A9B0] hover:text-[#E5E7EB] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Exactly 8 Transformation Cards in a 2-Column × 4-Row Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AUG_CARDS.map((card) => (
            <AugCard
              key={card.id}
              card={card}
              selected={enabled && isSelected(card.id)}
              params={
                getConfig(card.id)?.params ??
                paramsCache[card.id] ??
                card.defaultParams
              }
              onToggle={() => toggleCard(card)}
              onParamChange={(key, val) => updateParam(card.id, key, val)}
              disabled={!enabled}
              expanded={expandedCards.has(card.id)}
              onToggleExpand={() => toggleExpand(card.id)}
            />
          ))}
        </div>

        {/* Guidance when disabled */}
        {!enabled && (
          <div className="rounded-lg border border-dashed border-[#454950] bg-[#27292D]/60 p-3 text-center">
            <p className="text-xs text-[#E5E7EB] font-semibold">
              Augmentation is currently disabled
            </p>
            <p className="text-[11px] text-[#A5A9B0] mt-0.5">
              Turn on the switch in the card header above to enable and customize
              transformations.
            </p>
          </div>
        )}

        {enabled && selectedAugs.length === 0 && (
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-2.5 text-center text-xs text-amber-200">
            Select at least one transformation card above to preview or generate
            augmentations.
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default AugmentationPanel;
