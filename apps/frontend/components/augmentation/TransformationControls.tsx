"use client";

import React from "react";
import {
  RotateCcw,
  RefreshCw,
  FlipHorizontal,
  FlipVertical,
  SlidersHorizontal,
  Layers,
  Upload,
  Play,
  Maximize2,
} from "lucide-react";
import { Toggle, Button } from "./ui";
import type { VerifyGeometryRequestDto } from "../../api/augmentation.api";

interface Props {
  config: VerifyGeometryRequestDto;
  onChangeConfig: (newConfig: VerifyGeometryRequestDto) => void;
  onRunVerification: () => void;
  loading: boolean;
}

export const TransformationControls: React.FC<Props> = ({
  config,
  onChangeConfig,
  onRunVerification,
  loading,
}) => {
  const opType = config.operation.type;
  const opParams = config.operation.params ?? {};
  const angle = Number(opParams.angle ?? 45);
  const expandCanvas = Boolean(opParams.expandCanvas ?? false);
  const intervals = Number(opParams.intervals ?? 4);
  const activeInterval = Number(opParams.activeInterval ?? 1);
  const minAreaRatio = config.minAreaRatio ?? 0.05;

  const setOperationType = (type: "rotate" | "rotate360" | "flip_h" | "flip_v") => {
    onChangeConfig({
      ...config,
      operation: {
        type,
        params: {
          ...opParams,
          angle: opParams.angle ?? 45,
          expandCanvas: opParams.expandCanvas ?? false,
          intervals: opParams.intervals ?? 4,
          activeInterval: opParams.activeInterval ?? 1,
        },
      },
    });
  };

  const setAngle = (newAngle: number) => {
    onChangeConfig({
      ...config,
      operation: {
        ...config.operation,
        params: {
          ...opParams,
          angle: newAngle,
        },
      },
    });
  };

  const setExpandCanvas = (enabled: boolean) => {
    onChangeConfig({
      ...config,
      operation: {
        ...config.operation,
        params: {
          ...opParams,
          expandCanvas: enabled,
        },
      },
    });
  };

  const setIntervals = (newIntervals: number) => {
    onChangeConfig({
      ...config,
      operation: {
        ...config.operation,
        params: {
          ...opParams,
          intervals: newIntervals,
          activeInterval: Math.min(activeInterval, newIntervals),
        },
      },
    });
  };

  const setActiveInterval = (interval: number) => {
    onChangeConfig({
      ...config,
      operation: {
        ...config.operation,
        params: {
          ...opParams,
          activeInterval: interval,
        },
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onChangeConfig({
        ...config,
        imageSource: {
          type: "upload",
          imageBase64: base64,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Row 1: Source Selection (Synthetic vs Upload) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-lg border border-[#454950] bg-[#27292D]">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#E5E7EB] flex items-center gap-1.5">
            <Layers size={14} className="text-blue-400" />
            Input Source:
          </label>
          <div className="inline-flex rounded-md p-0.5 bg-[#32353A] border border-[#454950]">
            <button
              type="button"
              onClick={() =>
                onChangeConfig({
                  ...config,
                  imageSource: {
                    type: "synthetic",
                    scenarioId: config.imageSource.scenarioId ?? "single-centered",
                  },
                })
              }
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                config.imageSource.type === "synthetic"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-[#A5A9B0] hover:text-[#E5E7EB]"
              }`}
            >
              Synthetic Canvas
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeConfig({
                  ...config,
                  imageSource: {
                    type: "upload",
                    imageBase64: config.imageSource.imageBase64,
                  },
                })
              }
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                config.imageSource.type === "upload"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-[#A5A9B0] hover:text-[#E5E7EB]"
              }`}
            >
              Upload Image
            </button>
          </div>
        </div>

        {/* Synthetic Scenario Selector */}
        {config.imageSource.type === "synthetic" && (
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-[11px] text-[#A5A9B0]">Scenario:</span>
            <select
              value={config.imageSource.scenarioId ?? "single-centered"}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  imageSource: {
                    type: "synthetic",
                    scenarioId: e.target.value,
                  },
                })
              }
              className="bg-[#32353A] text-xs text-[#E5E7EB] border border-[#454950] rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="single-centered">Single Centered (600x600)</option>
              <option value="multi-class">Multi-Class (4 Objects, 800x600)</option>
              <option value="border-object">Border Object (Partial Clip, 600x600)</option>
              <option value="corner-object">Corner Object (600x600)</option>
              <option value="aspect-ratio-2to1">Wide Image (2:1, 800x400)</option>
              <option value="threshold-exact-5">5.00% Visibility (Retained)</option>
              <option value="threshold-above-5">5.01% Visibility (Retained)</option>
              <option value="threshold-below-5">4.99% Visibility (Discarded)</option>
            </select>
          </div>
        )}

        {/* Custom Image Upload */}
        {config.imageSource.type === "upload" && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#32353A] hover:bg-[#3C4046] border border-[#454950] text-xs font-medium text-[#E5E7EB] cursor-pointer transition-colors">
              <Upload size={13} className="text-blue-400" />
              Choose File
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {config.imageSource.imageBase64 && (
              <span className="text-[11px] text-emerald-400">✓ Image loaded</span>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Operation Selector Tabs */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-[#A5A9B0] uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-blue-400" />
          Transformation Geometry
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setOperationType("rotate")}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              opType === "rotate"
                ? "bg-blue-600 text-white border-blue-500 shadow-xs ring-1 ring-blue-500"
                : "bg-[#27292D] border-[#454950] text-[#E5E7EB] hover:bg-[#3C4046]"
            }`}
          >
            <RotateCcw size={15} />
            Rotation
          </button>
          <button
            type="button"
            onClick={() => setOperationType("rotate360")}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              opType === "rotate360"
                ? "bg-blue-600 text-white border-blue-500 shadow-xs ring-1 ring-blue-500"
                : "bg-[#27292D] border-[#454950] text-[#E5E7EB] hover:bg-[#3C4046]"
            }`}
          >
            <RefreshCw size={15} />
            360° Sweep
          </button>
          <button
            type="button"
            onClick={() => setOperationType("flip_h")}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              opType === "flip_h"
                ? "bg-blue-600 text-white border-blue-500 shadow-xs ring-1 ring-blue-500"
                : "bg-[#27292D] border-[#454950] text-[#E5E7EB] hover:bg-[#3C4046]"
            }`}
          >
            <FlipHorizontal size={15} />
            Horizontal Flip
          </button>
          <button
            type="button"
            onClick={() => setOperationType("flip_v")}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              opType === "flip_v"
                ? "bg-blue-600 text-white border-blue-500 shadow-xs ring-1 ring-blue-500"
                : "bg-[#27292D] border-[#454950] text-[#E5E7EB] hover:bg-[#3C4046]"
            }`}
          >
            <FlipVertical size={15} />
            Vertical Flip
          </button>
        </div>
      </div>

      {/* Row 3: Operation-Specific Settings */}
      <div className="p-3 rounded-lg border border-[#454950] bg-[#27292D] flex flex-col gap-3">
        {opType === "rotate" && (
          <>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#E5E7EB]">
                Rotation Angle (Degrees Clockwise)
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/60">
                  {angle > 0 ? `+${angle}°` : `${angle}°`}
                </span>
                <span className="text-[10px] text-[#A5A9B0]">
                  ({angle >= 0 ? "Clockwise" : "Counter-Clockwise"})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full h-1.5 bg-[#454950] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Quick Angle Preset Buttons */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[-180, -90, -45, 0, 30, 45, 90, 180].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setAngle(deg)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                    angle === deg
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-[#32353A] border-[#454950] text-[#A5A9B0] hover:text-[#E5E7EB]"
                  }`}
                >
                  {deg > 0 ? `+${deg}°` : `${deg}°`}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[#3C4046]">
              <Toggle
                checked={expandCanvas}
                onChange={setExpandCanvas}
                label="Expand Canvas to Fit Rotated Envelope"
                description="When enabled, output canvas dimensions expand to enclose the rotated bounding envelope."
              />
            </div>
          </>
        )}

        {opType === "rotate360" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-medium text-[#E5E7EB]">
                  360° Rotation Intervals
                </label>
                <p className="text-[10px] text-[#A5A9B0]">
                  Multiples of (360 / X). Active step angle:{" "}
                  <span className="font-mono text-blue-400 font-bold">
                    {Math.round((activeInterval * 360) / intervals)}°
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A5A9B0]">Total Steps:</span>
                <select
                  value={intervals}
                  onChange={(e) => setIntervals(Number(e.target.value))}
                  className="bg-[#32353A] text-xs text-[#E5E7EB] border border-[#454950] rounded px-2 py-1"
                >
                  {[2, 3, 4, 6, 8, 12, 16, 24, 36].map((cnt) => (
                    <option key={cnt} value={cnt}>
                      {cnt} intervals (every {(360 / cnt).toFixed(0)}°)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stepper for individual interval inspection */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Array.from({ length: intervals }).map((_, idx) => {
                const stepNum = idx + 1;
                const stepAngle = Math.round((stepNum * 360) / intervals);
                const isSelected = activeInterval === stepNum;

                return (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => setActiveInterval(stepNum)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-500 shadow-2xs"
                        : "bg-[#32353A] border-[#454950] text-[#A5A9B0] hover:text-[#E5E7EB]"
                    }`}
                  >
                    Step {stepNum}: {stepAngle}°
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#3C4046]">
              <Toggle
                checked={expandCanvas}
                onChange={setExpandCanvas}
                label="Expand Canvas for Sweep Steps"
                description="Expand output canvas dimensions to contain rotated envelope at each step."
              />
            </div>
          </>
        )}

        {opType === "flip_h" && (
          <div className="flex items-center gap-2 text-xs text-[#A5A9B0]">
            <FlipHorizontal size={16} className="text-blue-400 shrink-0" />
            <span>
              Mirrors image pixels and YOLO boxes horizontally across vertical centerline:{" "}
              <code className="text-blue-300 font-mono">cx&apos; = 1.0 - cx</code>. Dimensions remain unchanged.
            </span>
          </div>
        )}

        {opType === "flip_v" && (
          <div className="flex items-center gap-2 text-xs text-[#A5A9B0]">
            <FlipVertical size={16} className="text-blue-400 shrink-0" />
            <span>
              Inverts image pixels and YOLO boxes vertically across horizontal centerline:{" "}
              <code className="text-blue-300 font-mono">cy&apos; = 1.0 - cy</code>. Dimensions remain unchanged.
            </span>
          </div>
        )}
      </div>

      {/* Row 4: Action Button & Visibility Policy Indicator */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-[#A5A9B0]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>5% Visibility Threshold Enforced</span>
        </div>

        <Button
          onClick={onRunVerification}
          loading={loading}
          variant="primary"
          size="md"
          className="px-5 font-semibold shadow-xs"
        >
          <Play size={14} className="fill-current" />
          Verify Transformation
        </Button>
      </div>
    </div>
  );
};
