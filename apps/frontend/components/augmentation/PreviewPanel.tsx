"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Eye,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Columns2,
  Rows2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SectionCard, Button, Alert, Spinner, Badge } from "./ui";
import {
  previewAugmentation,
  augmentationApi,
  type ScanResponse,
  type AugmentationConfig,
  type AugPreviewResponse,
  type VerifyGeometryResponseDto,
} from "../../api/augmentation.api";

interface Props {
  datasetPath: string;
  scanResult: ScanResponse | null;
  augmentations: AugmentationConfig[];
  layoutMode?: "stacked" | "side-by-side";
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

interface PreviewOption {
  label: string;
  type: string;
  params: Record<string, unknown>;
}

const MAX_PREVIEW_IMAGES = 10;

const buildPreviewOptions = (
  augmentations: AugmentationConfig[],
): PreviewOption[] => {
  const labels: Record<string, string> = {
    flip_h: "Horizontal Flip",
    flip_v: "Vertical Flip",
    rotate: "Rotation",
    rotate360: "360° Rotation",
    shear: "Shear",
    zoom: "Zoom",
    cutout: "Cutout",
    mosaic: "Mosaic",
  };

  const opts: PreviewOption[] = [];
  for (const aug of augmentations) {
    if (aug.type === "rotate360") {
      const count = Number(aug.params.count ?? 4);
      for (let i = 0; i < count; i++) {
        const angle = Math.round(((i + 1) * 360) / count);
        if (angle < 360) {
          opts.push({
            label: `360° Rotation (${angle}°)`,
            type: "rotate360",
            params: { ...aug.params, angle },
          });
        }
      }
    } else if (aug.type === "zoom") {
      const scale = Number(aug.params.scale ?? 1.3);
      const percent = Math.round((scale - 1.0) * 100);
      opts.push({
        label: `Zoom (+${percent}%, ${scale.toFixed(1)}x)`,
        type: "zoom",
        params: aug.params,
      });
    } else if (aug.type === "rotate") {
      const angle = Number(aug.params.angle ?? 30);
      opts.push({
        label: `Rotation (${angle > 0 ? `+${angle}` : angle}°)`,
        type: "rotate",
        params: aug.params,
      });
    } else {
      opts.push({
        label: labels[aug.type] ?? aug.type,
        type: aug.type,
        params: aug.params,
      });
    }
  }
  return opts;
};

export const PreviewPanel: React.FC<Props> = ({
  datasetPath,
  scanResult,
  augmentations,
  layoutMode = "stacked",
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedAugIdx, setSelectedAugIdx] = useState(0);
  const [preview, setPreview] = useState<AugPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional geometry verification diagnostics
  const [geoDiagnostics, setGeoDiagnostics] =
    useState<VerifyGeometryResponseDto | null>(null);
  const [showGeoDetails, setShowGeoDetails] = useState(false);

  // Maximum of first 10 dataset images for responsive, high-performance previewing
  const previewImages = useMemo(() => {
    return (scanResult?.image_files ?? []).slice(0, MAX_PREVIEW_IMAGES);
  }, [scanResult?.image_files]);

  const totalDatasetImages = scanResult?.image_files?.length ?? 0;
  const previewOptions = useMemo(
    () => buildPreviewOptions(augmentations),
    [augmentations],
  );

  // Select initial image from the 10-image subset
  useEffect(() => {
    if (
      previewImages.length > 0 &&
      (!selectedImage || !previewImages.includes(selectedImage))
    ) {
      setSelectedImage(previewImages[0]);
    }
  }, [previewImages, selectedImage]);

  // Reset active preview when augmentations or image changes
  useEffect(() => {
    setPreview(null);
    setGeoDiagnostics(null);
  }, [augmentations, selectedImage]);

  // Ensure selectedAugIdx remains in bounds
  useEffect(() => {
    if (selectedAugIdx >= previewOptions.length) {
      setSelectedAugIdx(0);
    }
  }, [previewOptions.length, selectedAugIdx]);

  const handlePreview = async () => {
    if (!selectedImage || previewOptions.length === 0) return;
    const opt = previewOptions[selectedAugIdx];
    if (!opt) return;

    setLoading(true);
    setError(null);
    setGeoDiagnostics(null);
    try {
      // 1. Fetch transformed preview from FastAPI augmentation engine
      const result = await previewAugmentation(
        datasetPath,
        selectedImage,
        opt.type,
        opt.params,
      );
      setPreview(result);

      // 2. Seamlessly trigger geometry verification diagnostics for geometric ops
      if (
        opt.type === "rotate" ||
        opt.type === "rotate360" ||
        opt.type === "flip_h" ||
        opt.type === "flip_v"
      ) {
        try {
          const angle =
            opt.type === "rotate" || opt.type === "rotate360"
              ? Number(opt.params.angle ?? 30)
              : 0;
          const geoRes = await augmentationApi.verifyGeometry({
            operation: {
              type: opt.type as "rotate" | "rotate360" | "flip_h" | "flip_v",
              params: {
                angle,
                expandCanvas: true,
              },
            },
            imageSource: {
              type: "upload",
              imageBase64: result.original_b64,
            },
            customAnnotations: result.original_annotation,
            minAreaRatio: 0.05,
          });
          setGeoDiagnostics(geoRes);
        } catch {
          // Geometry verification service is secondary; do not block preview
        }
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Preview failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Empty state if not scanned
  if (!scanResult) {
    return (
      <SectionCard
        number={4}
        title="Preview Transformation"
        subtitle="Original vs augmented verification"
        icon={<Eye size={18} />}
        color="#F59E0B"
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-[#454950] bg-[#27292D]/50">
          <div className="w-10 h-10 rounded-full bg-amber-950/40 text-amber-400 flex items-center justify-center mb-2.5">
            <Eye size={20} className="opacity-80" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#E5E7EB]">
            Preview Unavailable
          </p>
          <p className="text-xs text-[#A5A9B0] mt-1 max-w-sm">
            Scan a dataset in Section 1 to select an image and inspect bounding
            box transformations.
          </p>
        </div>
      </SectionCard>
    );
  }

  // Empty state if no augmentations are selected
  if (previewOptions.length === 0) {
    return (
      <SectionCard
        number={4}
        title="Preview Transformation"
        subtitle="Original vs augmented verification"
        icon={<Eye size={18} />}
        color="#F59E0B"
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-[#454950] bg-[#27292D]/50">
          <div className="w-10 h-10 rounded-full bg-blue-950/40 text-blue-400 flex items-center justify-center mb-2.5">
            <Layers size={20} className="opacity-80" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#E5E7EB]">
            No Augmentations Selected
          </p>
          <p className="text-xs text-[#A5A9B0] mt-1 max-w-sm">
            Turn on Image Augmentation in Section 3 and select at least one
            transformation card to preview its effect.
          </p>
        </div>
      </SectionCard>
    );
  }

  const headerAction = onToggleSidebar ? (
    <button
      type="button"
      onClick={onToggleSidebar}
      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md text-[#E5E7EB] bg-[#3C4046] hover:bg-[#454950] border border-[#454950] transition-colors shadow-xs cursor-pointer"
      title={
        isSidebarCollapsed
          ? "Show Augmentation sidebar"
          : "Collapse sidebar for wide side-by-side preview"
      }
      aria-label="Toggle preview workspace width"
    >
      {isSidebarCollapsed ? (
        <>
          <Rows2 size={13} className="text-blue-400" />
          <span className="hidden sm:inline">Show Sidebar</span>
        </>
      ) : (
        <>
          <Columns2 size={13} className="text-blue-400" />
          <span className="hidden sm:inline">Wide View</span>
        </>
      )}
    </button>
  ) : undefined;

  return (
    <SectionCard
      number={4}
      title="Preview Transformation"
      subtitle={
        layoutMode === "stacked"
          ? "Original above augmented verification"
          : "Side-by-side wide verification"
      }
      icon={<Eye size={18} />}
      color="#F59E0B"
      headerAction={headerAction}
      className="h-full"
    >
      <div className="flex flex-col gap-3">
        {/* Controls row */}
        <div className="flex flex-wrap sm:flex-nowrap items-end gap-2.5 p-2 bg-[#27292D] border border-[#454950] rounded-lg">
          {/* Image select */}
          <div className="flex-1 min-w-[130px]">
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-[11px] font-semibold text-[#A5A9B0]">
                Source Image
              </label>
              {totalDatasetImages > MAX_PREVIEW_IMAGES && (
                <span className="text-[10px] text-[#6B7280] font-medium">
                  First 10 of {totalDatasetImages}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={selectedImage}
                onChange={(e) => {
                  setSelectedImage(e.target.value);
                  setPreview(null);
                }}
                className="w-full appearance-none border border-[#454950] rounded-md px-2.5 py-1.5 text-xs pr-7 bg-[#32353A] text-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-blue-500 truncate cursor-pointer"
              >
                {previewImages.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A5A9B0] pointer-events-none"
              />
            </div>
          </div>

          {/* Transformation select */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-semibold text-[#A5A9B0] mb-0.5">
              Transformation
            </label>
            <div className="relative">
              <select
                value={selectedAugIdx}
                onChange={(e) => {
                  setSelectedAugIdx(Number(e.target.value));
                  setPreview(null);
                }}
                className="w-full appearance-none border border-[#454950] rounded-md px-2.5 py-1.5 text-xs pr-7 bg-[#32353A] text-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-blue-500 truncate cursor-pointer"
              >
                {previewOptions.map((opt, i) => (
                  <option key={i} value={i}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A5A9B0] pointer-events-none"
              />
            </div>
          </div>

          {/* Preview action button */}
          <Button
            onClick={handlePreview}
            loading={loading}
            disabled={!selectedImage || previewOptions.length === 0}
            variant="primary"
            size="md"
            className="whitespace-nowrap shrink-0 shadow-xs font-semibold"
          >
            <RefreshCw size={14} />
            Preview
          </Button>
        </div>

        {/* Error notification */}
        {error && (
          <Alert type="error">
            <span>{error}</span>
          </Alert>
        )}

        {/* Loading placeholder */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg bg-[#27292D] border border-[#454950]">
            <Spinner size="md" />
            <span className="text-xs text-[#A5A9B0] mt-2">
              Computing augmented geometry & bounding boxes...
            </span>
          </div>
        )}

        {/* Transformed Preview Results */}
        {preview && !loading && (
          <div className="flex flex-col gap-2.5">
            <div
              className={`w-full min-w-0 ${
                layoutMode === "stacked"
                  ? "flex flex-col gap-3.5"
                  : "grid grid-cols-1 md:grid-cols-2 gap-4"
              }`}
            >
              {/* Original preview card */}
              <div className="flex flex-col border border-[#454950] rounded-lg overflow-hidden bg-[#27292D] shadow-xs">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#232529] border-b border-[#454950]">
                  <span className="text-xs font-semibold text-[#E5E7EB]">
                    Original
                  </span>
                  <span className="text-[10px] font-mono text-[#A5A9B0]">
                    {preview.original_width} × {preview.original_height}px
                  </span>
                </div>
                <div
                  className={`bg-[#1E2023] p-1 flex items-center justify-center ${
                    layoutMode === "stacked"
                      ? "min-h-[170px] max-h-[220px]"
                      : "min-h-[230px] max-h-[340px]"
                  }`}
                >
                  <img
                    src={`data:image/jpeg;base64,${preview.original_b64}`}
                    alt="Original"
                    className={`w-full h-full object-contain ${
                      layoutMode === "stacked"
                        ? "max-h-[210px]"
                        : "max-h-[330px]"
                    }`}
                  />
                </div>
                <div className="p-2 border-t border-[#454950]">
                  <p className="text-[10px] font-semibold text-[#A5A9B0] uppercase tracking-wider mb-0.5">
                    Original Annotation (YOLO)
                  </p>
                  <pre className="text-[10px] font-mono bg-[#1E2023] border border-[#454950] rounded p-1.5 overflow-auto max-h-16 text-[#A5A9B0]">
                    {preview.original_annotation || "(empty)"}
                  </pre>
                </div>
              </div>

              {/* Augmented preview card */}
              <div className="flex flex-col border border-blue-700/60 rounded-lg overflow-hidden bg-[#27292D] shadow-xs">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-950/40 border-b border-blue-800/60">
                  <span className="text-xs font-semibold text-blue-200 flex items-center gap-1 truncate">
                    <Sparkles size={12} className="text-blue-400 shrink-0" />
                    <span className="truncate">
                      {previewOptions[selectedAugIdx]?.label}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-blue-300 shrink-0">
                    {preview.augmented_width} × {preview.augmented_height}px
                  </span>
                </div>
                <div
                  className={`bg-[#1E2023] p-1 flex items-center justify-center ${
                    layoutMode === "stacked"
                      ? "min-h-[170px] max-h-[220px]"
                      : "min-h-[230px] max-h-[340px]"
                  }`}
                >
                  <img
                    src={`data:image/jpeg;base64,${preview.augmented_b64}`}
                    alt="Augmented"
                    className={`w-full h-full object-contain ${
                      layoutMode === "stacked"
                        ? "max-h-[210px]"
                        : "max-h-[330px]"
                    }`}
                  />
                </div>
                <div className="p-2 border-t border-[#454950]">
                  <p className="text-[10px] font-semibold text-[#A5A9B0] uppercase tracking-wider mb-0.5">
                    Transformed Annotation (YOLO)
                  </p>
                  <pre className="text-[10px] font-mono bg-blue-950/30 border border-blue-800/50 rounded p-1.5 overflow-auto max-h-16 text-blue-200">
                    {preview.augmented_annotation || "(empty)"}
                  </pre>
                </div>
              </div>
            </div>

            {/* Canvas size expansion note if applicable */}
            {(preview.augmented_width !== preview.original_width ||
              preview.augmented_height !== preview.original_height) && (
              <Alert type="info">
                <Info size={13} className="shrink-0 mt-0.5 text-blue-400" />
                <span>
                  Canvas adjusted from {preview.original_width}×
                  {preview.original_height} to {preview.augmented_width}×
                  {preview.augmented_height}px to contain transformed content.
                </span>
              </Alert>
            )}

            {/* Integrated Geometry Verification Diagnostics Accordion */}
            {geoDiagnostics && (
              <div className="border border-[#454950] rounded-lg overflow-hidden bg-[#27292D]">
                <div
                  onClick={() => setShowGeoDetails((v) => !v)}
                  className="px-3 py-2 bg-[#232529] flex items-center justify-between cursor-pointer hover:bg-[#32353A] transition-colors select-none text-xs"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span className="font-semibold text-[#E5E7EB]">
                      Geometry Verification Diagnostics
                    </span>
                    {geoDiagnostics.dimensions.isConsistent ? (
                      <Badge color="green" className="flex items-center gap-1">
                        <CheckCircle2 size={10} /> Sharp Dimensions 100% Consistent
                      </Badge>
                    ) : (
                      <Badge color="red" className="flex items-center gap-1">
                        <AlertTriangle size={10} /> Dimension Discrepancy
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#A5A9B0]">
                    <span>
                      {geoDiagnostics.summary.retainedCount} of{" "}
                      {geoDiagnostics.summary.totalOriginal} boxes retained (
                      {geoDiagnostics.summary.thresholdPercentage}% rule)
                    </span>
                    {showGeoDetails ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </div>
                </div>

                {showGeoDetails && (
                  <div className="p-3 border-t border-[#454950] flex flex-col gap-2.5 text-xs text-[#A5A9B0]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded bg-[#1E2023] border border-[#454950]">
                        <span className="text-[10px] block text-[#6B7280]">
                          Source Canvas
                        </span>
                        <span className="font-mono font-bold text-[#E5E7EB]">
                          {geoDiagnostics.dimensions.source.width}×
                          {geoDiagnostics.dimensions.source.height}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#1E2023] border border-[#454950]">
                        <span className="text-[10px] block text-[#6B7280]">
                          Transformed Canvas
                        </span>
                        <span className="font-mono font-bold text-[#E5E7EB]">
                          {geoDiagnostics.dimensions.actualTarget.width}×
                          {geoDiagnostics.dimensions.actualTarget.height}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#1E2023] border border-[#454950]">
                        <span className="text-[10px] block text-[#6B7280]">
                          Effective Angle
                        </span>
                        <span className="font-mono font-bold text-blue-400">
                          {geoDiagnostics.operation.effectiveAngle > 0
                            ? `+${geoDiagnostics.operation.effectiveAngle}°`
                            : `${geoDiagnostics.operation.effectiveAngle}°`}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#1E2023] border border-[#454950]">
                        <span className="text-[10px] block text-[#6B7280]">
                          Clipping Policy
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {geoDiagnostics.summary.thresholdPercentage}% min area
                        </span>
                      </div>
                    </div>

                    {geoDiagnostics.retentionDetails.length > 0 && (
                      <div className="border border-[#454950] rounded-md overflow-hidden bg-[#1E2023]">
                        <div className="px-2.5 py-1 bg-[#232529] font-semibold text-[11px] text-[#E5E7EB] border-b border-[#454950]">
                          Box Retention Details
                        </div>
                        <div className="divide-y divide-[#3C4046] max-h-32 overflow-y-auto font-mono text-[10px]">
                          {geoDiagnostics.retentionDetails.map((b) => (
                            <div
                              key={b.index}
                              className="px-2.5 py-1.5 flex items-center justify-between"
                            >
                              <span>
                                Box #{b.index + 1} (Class {b.classId})
                              </span>
                              <div className="flex items-center gap-2">
                                <span>
                                  {(b.retentionRatio * 100).toFixed(1)}% area
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                                    b.status === "retained"
                                      ? "bg-emerald-950/60 text-emerald-300"
                                      : b.status === "clipped"
                                      ? "bg-amber-950/60 text-amber-300"
                                      : "bg-red-950/60 text-red-300"
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state when ready to preview */}
        {!preview && !loading && !error && (
          <div className="rounded-lg border border-dashed border-[#454950] bg-[#27292D]/50 p-4 text-center">
            <p className="text-xs text-[#E5E7EB] font-medium">
              Ready to preview transformation
            </p>
            <p className="text-[11px] text-[#A5A9B0] mt-0.5">
              Select an image and transformation above, then click Preview to
              inspect bounding box mapping.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default PreviewPanel;
