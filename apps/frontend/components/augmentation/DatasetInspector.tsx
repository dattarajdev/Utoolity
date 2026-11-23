"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  BarChart2,
  ShieldAlert,
  Archive,
  Check,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { SectionCard, Badge, Spinner, Alert, Button } from "./ui";
import ClassDistribution, { CLASS_COLORS } from "./ClassDistribution";
import {
  previewImage,
  quarantineFiles,
  scanDataset,
  type ScanResponse,
  type ImagePreviewResponse,
  type QuarantineItem,
} from "../../api/augmentation.api";

interface Props {
  datasetPath: string;
  scanResult: ScanResponse | null;
  onScanUpdate?: (result: ScanResponse) => void;
}

type ActiveTab = "annotation" | "validation" | "imageinfo";

interface SelectableQuarantineItem {
  id: string;
  item_type:
    | "missing_label"
    | "orphan_label"
    | "corrupted_image"
    | "invalid_annotation";
  filename: string;
  description: string;
  category: string;
}

export const DatasetInspector: React.FC<Props> = ({
  datasetPath,
  scanResult,
  onScanUpdate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preview, setPreview] = useState<ImagePreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("annotation");
  const abortRef = useRef<AbortController | null>(null);

  // Quarantine Modal State
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [quarantineLoading, setQuarantineLoading] = useState(false);
  const [quarantineError, setQuarantineError] = useState<string | null>(null);
  const [quarantineSuccess, setQuarantineSuccess] = useState<string | null>(null);

  const imageFiles = scanResult?.image_files ?? [];
  const total = imageFiles.length;

  const loadPreview = useCallback(
    async (index: number) => {
      if (!scanResult || imageFiles.length === 0) return;
      const imageName = imageFiles[index];
      if (!imageName) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);
      try {
        const result = await previewImage(datasetPath, imageName);
        setPreview(result);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "CanceledError") return;
        const msg =
          (err as { response?: { data?: { detail?: string; message?: string } } })
            ?.response?.data?.detail ||
          (err as { response?: { data?: { detail?: string; message?: string } } })
            ?.response?.data?.message ||
          (err as Error)?.message ||
          "Preview failed";
        setError(msg);
        setPreview(null);
      } finally {
        setLoading(false);
      }
    },
    [datasetPath, imageFiles, scanResult],
  );

  useEffect(() => {
    setCurrentIndex(0);
    setPreview(null);
  }, [scanResult]);

  useEffect(() => {
    if (scanResult && imageFiles.length > 0) {
      loadPreview(currentIndex);
    }
  }, [currentIndex, loadPreview, scanResult, imageFiles.length]);

  // Aggregate quarantine items
  const quarantineItems: SelectableQuarantineItem[] = React.useMemo(() => {
    if (!scanResult) return [];
    const items: SelectableQuarantineItem[] = [];

    // 1. Missing labels (unpaired images)
    if (
      scanResult.missing_label_files &&
      scanResult.missing_label_files.length > 0
    ) {
      for (const img of scanResult.missing_label_files) {
        items.push({
          id: `missing_${img}`,
          item_type: "missing_label",
          filename: img,
          description: `Unpaired image missing label file: images/${img}`,
          category: "Missing Labels",
        });
      }
    }

    // 2. Orphan labels (labels with no corresponding image)
    if (scanResult.orphan_labels && scanResult.orphan_labels.length > 0) {
      for (const lbl of scanResult.orphan_labels) {
        items.push({
          id: `orphan_${lbl}`,
          item_type: "orphan_label",
          filename: lbl,
          description: `Unpaired label file without image: labels/${lbl}`,
          category: "Orphan Labels",
        });
      }
    }

    // 3. Corrupted / unreadable images
    if (scanResult.corrupted_images && scanResult.corrupted_images.length > 0) {
      for (const img of scanResult.corrupted_images) {
        items.push({
          id: `corrupt_${img}`,
          item_type: "corrupted_image",
          filename: img,
          description: `Corrupted or unreadable image file: images/${img}`,
          category: "Corrupted Images",
        });
      }
    }

    // 4. Invalid annotations
    if (
      scanResult.validation_errors &&
      scanResult.validation_errors.length > 0
    ) {
      for (const val of scanResult.validation_errors) {
        // Skip if this image was already flagged as corrupted
        if (scanResult.corrupted_images?.includes(val.image_name)) continue;
        items.push({
          id: `invalid_${val.image_name}`,
          item_type: "invalid_annotation",
          filename: val.image_name,
          description: `${val.image_name} has invalid annotations (${val.errors.join("; ")})`,
          category: "Invalid Annotations",
        });
      }
    }

    return items;
  }, [scanResult]);

  const totalIssuesCount = quarantineItems.length;

  // Select all items when opening modal
  useEffect(() => {
    if (showQuarantineModal) {
      setSelectedItemIds(new Set(quarantineItems.map((i) => i.id)));
      setQuarantineError(null);
      setQuarantineSuccess(null);
    }
  }, [showQuarantineModal, quarantineItems]);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    const catItems = quarantineItems.filter((i) => i.category === cat);
    const allSelected = catItems.every((i) => selectedItemIds.has(i.id));
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      for (const item of catItems) {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedItemIds.size === quarantineItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(quarantineItems.map((i) => i.id)));
    }
  };

  const handleExecuteQuarantine = async () => {
    const itemsToQuarantine: QuarantineItem[] = quarantineItems
      .filter((i) => selectedItemIds.has(i.id))
      .map((i) => ({ item_type: i.item_type, filename: i.filename }));

    if (itemsToQuarantine.length === 0) return;

    setQuarantineLoading(true);
    setQuarantineError(null);
    try {
      const res = await quarantineFiles({
        dataset_path: datasetPath,
        items: itemsToQuarantine,
      });
      setQuarantineSuccess(res.message);

      // Automatically refresh dataset scan
      if (onScanUpdate) {
        const refreshed = await scanDataset(datasetPath);
        onScanUpdate(refreshed);
      }

      setTimeout(() => {
        setShowQuarantineModal(false);
        setQuarantineSuccess(null);
      }, 1400);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Quarantine operation failed.";
      setQuarantineError(msg);
    } finally {
      setQuarantineLoading(false);
    }
  };

  const prev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const next = () => setCurrentIndex((i) => Math.min(total - 1, i + 1));

  const currentImageName = imageFiles[currentIndex] ?? "";
  const validationErrorsForCurrent = scanResult?.validation_errors.find(
    (v) => v.image_name === currentImageName,
  );

  // Empty state before scan
  if (!scanResult) {
    return (
      <SectionCard
        number={2}
        title="Dataset Preview & Validation"
        subtitle="Visual inspector & bounding-box validation"
        icon={<Eye size={18} />}
        color="#8B5CF6"
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-[#454950] bg-[#27292D]/50">
          <div className="w-10 h-10 rounded-full bg-purple-950/40 text-purple-400 flex items-center justify-center mb-2.5">
            <Eye size={20} className="opacity-80" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#E5E7EB]">
            No Dataset Scanned Yet
          </p>
          <p className="text-xs text-[#A5A9B0] mt-1 max-w-sm">
            Scan a dataset in Section 1 to inspect images, verify YOLO bounding
            boxes, and check annotation validity.
          </p>
        </div>
      </SectionCard>
    );
  }

  // Scanned but 0 images
  if (total === 0) {
    return (
      <SectionCard
        number={2}
        title="Dataset Preview & Validation"
        icon={<Eye size={18} />}
        color="#8B5CF6"
        className="h-full"
      >
        <Alert type="warning">
          <AlertTriangle size={16} />
          <span>No images found in the dataset images/ directory.</span>
        </Alert>
      </SectionCard>
    );
  }

  // Header status badge and optional quarantine button
  const headerAction = (
    <div className="flex items-center gap-2">
      {totalIssuesCount > 0 && (
        <button
          type="button"
          onClick={() => setShowQuarantineModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-700/60 transition-colors shadow-xs cursor-pointer"
          title="Safely move problematic files into removed_files/"
        >
          <ShieldAlert size={13} className="text-amber-400" />
          <span>Quarantine Issues ({totalIssuesCount})</span>
        </button>
      )}

      {validationErrorsForCurrent ? (
        <Badge color="red" className="flex items-center gap-1">
          <AlertTriangle size={11} />
          {validationErrorsForCurrent.errors.length} issue
          {validationErrorsForCurrent.errors.length > 1 ? "s" : ""}
        </Badge>
      ) : (
        <Badge color="green" className="flex items-center gap-1">
          <CheckCircle2 size={11} /> Valid
        </Badge>
      )}
    </div>
  );

  const categories = Array.from(
    new Set(quarantineItems.map((i) => i.category)),
  );

  return (
    <>
      <SectionCard
        number={2}
        title="Dataset Preview & Validation"
        subtitle={`${total} images scanned`}
        icon={<Eye size={18} />}
        color="#8B5CF6"
        headerAction={headerAction}
        className="h-full"
      >
        <div className="flex flex-col gap-3">
          {/* Navigation & Image selector bar */}
          <div className="flex items-center justify-between gap-2 p-1.5 bg-[#27292D] border border-[#454950] rounded-lg">
            <button
              type="button"
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Previous image"
              className="p-1 rounded-md text-[#A5A9B0] hover:bg-[#3C4046] hover:text-[#E5E7EB] border border-transparent hover:border-[#454950] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Image dropdown selector */}
            <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-[#A5A9B0] whitespace-nowrap">
                {currentIndex + 1} / {total}
              </span>
              <select
                value={currentIndex}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                aria-label="Select image to preview"
                className="text-xs font-mono font-medium text-[#E5E7EB] bg-[#32353A] border border-[#454950] rounded-md px-2 py-1 max-w-[200px] sm:max-w-[260px] truncate focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {imageFiles.map((name, idx) => {
                  const hasErr = scanResult.validation_errors.some(
                    (v) => v.image_name === name,
                  );
                  return (
                    <option key={name} value={idx}>
                      {hasErr ? "⚠️ " : ""}
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={next}
              disabled={currentIndex === total - 1}
              aria-label="Next image"
              className="p-1 rounded-md text-[#A5A9B0] hover:bg-[#3C4046] hover:text-[#E5E7EB] border border-transparent hover:border-[#454950] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Image Preview Canvas */}
          <div className="relative rounded-lg overflow-hidden bg-[#1E2023] border border-[#454950] flex items-center justify-center min-h-[220px] max-h-[280px]">
            {loading && (
              <div className="absolute inset-0 bg-[#1E2023]/80 backdrop-blur-xs flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-2 text-[#E5E7EB]">
                  <Spinner size="md" />
                  <span className="text-xs text-[#A5A9B0]">
                    Rendering preview...
                  </span>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 text-center text-[#A5A9B0]">
                <ImageIcon
                  size={28}
                  className="mx-auto mb-1.5 opacity-40 text-red-400"
                />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {preview && !loading && (
              <img
                src={`data:image/jpeg;base64,${preview.image_b64}`}
                alt={currentImageName}
                className="w-full h-full object-contain max-h-[280px]"
              />
            )}

            {/* Quick info chip overlaid bottom-left */}
            {preview && !loading && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-slate-300 font-mono">
                {preview.width} × {preview.height}px | {preview.boxes.length} box
                {preview.boxes.length !== 1 ? "es" : ""}
              </div>
            )}
          </div>

          {/* Tabbed Inspection Details */}
          <div className="border border-[#454950] rounded-lg overflow-hidden flex flex-col">
            <div className="flex border-b border-[#454950] bg-[#27292D]">
              <button
                type="button"
                onClick={() => setActiveTab("annotation")}
                className={`flex-1 py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "annotation"
                    ? "bg-[#32353A] text-blue-400 border-b-2 border-blue-500 font-semibold"
                    : "text-[#A5A9B0] hover:text-[#E5E7EB] hover:bg-[#2C2F34]"
                }`}
              >
                <FileText size={12} />
                Annotation (YOLO)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("validation")}
                className={`flex-1 py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "validation"
                    ? "bg-[#32353A] text-blue-400 border-b-2 border-blue-500 font-semibold"
                    : "text-[#A5A9B0] hover:text-[#E5E7EB] hover:bg-[#2C2F34]"
                }`}
              >
                <AlertTriangle size={12} />
                Validation
                {validationErrorsForCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("imageinfo")}
                className={`flex-1 py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "imageinfo"
                    ? "bg-[#32353A] text-blue-400 border-b-2 border-blue-500 font-semibold"
                    : "text-[#A5A9B0] hover:text-[#E5E7EB] hover:bg-[#2C2F34]"
                }`}
              >
                <BarChart2 size={12} />
                Details & Classes
              </button>
            </div>

            <div className="p-2.5 bg-[#27292D] min-h-[90px] max-h-[140px] overflow-auto">
              {activeTab === "annotation" && (
                <pre className="text-[11px] font-mono text-[#E5E7EB] whitespace-pre-wrap leading-relaxed">
                  {preview?.annotation_text ? (
                    preview.annotation_text
                  ) : (
                    <span className="text-[#6B7280] italic">
                      No annotations recorded for this image
                    </span>
                  )}
                </pre>
              )}

              {activeTab === "validation" && (
                <div className="flex flex-col gap-2 text-xs">
                  {preview?.validation_errors &&
                  preview.validation_errors.length > 0 ? (
                    preview.validation_errors.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-1.5 text-[11px] text-red-300 bg-red-950/30 rounded px-2 py-1 border border-red-700/50"
                      >
                        <AlertTriangle
                          size={12}
                          className="shrink-0 mt-0.5 text-red-400"
                        />
                        <span>{e}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-300 py-1">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>
                        This image&apos;s annotations and bounding boxes are completely valid.
                      </span>
                    </div>
                  )}

                  {totalIssuesCount > 0 && (
                    <div className="mt-1 pt-2 border-t border-[#454950] flex items-center justify-between bg-amber-950/20 p-2 rounded border border-amber-700/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-200">
                        <ShieldAlert
                          size={14}
                          className="text-amber-400 shrink-0"
                        />
                        <span>
                          {totalIssuesCount} total issue(s) detected across dataset.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQuarantineModal(true)}
                        className="text-[11px] font-semibold text-amber-300 underline hover:text-amber-100 cursor-pointer"
                      >
                        Clean & Quarantine
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "imageinfo" && preview && (
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#A5A9B0] font-medium">
                      Classes present:
                    </span>
                    {[...new Set(preview.boxes.map((b) => b[0]))].map((cls) => {
                      const classIdx = Number(cls);
                      const name =
                        scanResult.classes_file?.[classIdx] ??
                        `class_${classIdx}`;
                      return (
                        <span
                          key={cls}
                          className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium shadow-xs"
                          style={{
                            backgroundColor:
                              CLASS_COLORS[classIdx % CLASS_COLORS.length],
                          }}
                        >
                          {name} ({classIdx})
                        </span>
                      );
                    })}
                    {preview.boxes.length === 0 && (
                      <span className="text-[11px] text-[#6B7280] italic">
                        No objects
                      </span>
                    )}
                  </div>

                  {Object.keys(scanResult.class_distribution).length > 0 && (
                    <ClassDistribution
                      distribution={scanResult.class_distribution}
                      maxHeight="max-h-44"
                      className="mt-1"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Safe Quarantine Modal */}
      {showQuarantineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#2C2F34] rounded-xl shadow-2xl border border-[#454950] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-[#E5E7EB]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#454950] flex items-center justify-between bg-[#232529]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-950/40 text-amber-300 flex items-center justify-center border border-amber-700/60">
                  <Archive size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#E5E7EB] leading-tight">
                    Safe Dataset Quarantine
                  </h3>
                  <p className="text-xs text-[#A5A9B0] leading-tight">
                    Relocate problematic files to{" "}
                    <span className="font-mono text-[#E5E7EB]">
                      removed_files/
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuarantineModal(false)}
                className="text-[#A5A9B0] hover:text-[#E5E7EB] p-1 rounded-md hover:bg-[#3C4046] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Safety notice banner */}
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg p-3 text-blue-200 leading-relaxed">
                <div className="font-semibold text-blue-100 mb-0.5 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                  Non-Destructive Quarantine Guarantee
                </div>
                Original dataset files are never permanently deleted. Files are
                safely moved to your local{" "}
                <span className="font-mono font-medium text-white">
                  dataset/removed_files/
                </span>{" "}
                directory. Any naming collisions are assigned safe suffixes (
                <span className="font-mono">_v1</span>,{" "}
                <span className="font-mono">_v2</span>), and an audit log is
                recorded in <span className="font-mono">report.json</span>.
              </div>

              {quarantineError && (
                <Alert type="error">
                  <AlertTriangle size={15} />
                  <span>{quarantineError}</span>
                </Alert>
              )}

              {quarantineSuccess && (
                <Alert type="success">
                  <Check size={15} />
                  <span>{quarantineSuccess}</span>
                </Alert>
              )}

              {/* Selection Bar */}
              <div className="flex items-center justify-between text-xs text-[#A5A9B0] border-b border-[#454950] pb-2">
                <span className="font-semibold text-[#E5E7EB]">
                  {selectedItemIds.size} of {quarantineItems.length} items
                  selected
                </span>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  {selectedItemIds.size === quarantineItems.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {/* Categorized Items List */}
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const itemsInCat = quarantineItems.filter(
                    (i) => i.category === cat,
                  );
                  const catSelected = itemsInCat.every((i) =>
                    selectedItemIds.has(i.id),
                  );
                  const someSelected = itemsInCat.some((i) =>
                    selectedItemIds.has(i.id),
                  );

                  return (
                    <div
                      key={cat}
                      className="border border-[#454950] rounded-lg overflow-hidden bg-[#27292D]"
                    >
                      {/* Category Header */}
                      <div
                        onClick={() => toggleCategory(cat)}
                        className="bg-[#232529] px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#32353A] transition-colors select-none"
                      >
                        <div className="flex items-center gap-2 font-semibold text-[#E5E7EB]">
                          {catSelected ? (
                            <CheckSquare size={15} className="text-blue-400" />
                          ) : someSelected ? (
                            <div className="w-3.5 h-3.5 bg-blue-600 rounded-xs flex items-center justify-center text-white text-[10px]">
                              -
                            </div>
                          ) : (
                            <Square size={15} className="text-[#6B7280]" />
                          )}
                          <span>{cat}</span>
                          <span className="text-[11px] font-normal text-[#A5A9B0]">
                            ({itemsInCat.length} file
                            {itemsInCat.length !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </div>

                      {/* Item list */}
                      <div className="divide-y divide-[#3C4046] bg-[#27292D]">
                        {itemsInCat.map((item) => {
                          const isChecked = selectedItemIds.has(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleItem(item.id)}
                              className="px-3 py-2 flex items-start gap-2 hover:bg-[#32353A] cursor-pointer transition-colors"
                            >
                              <div className="pt-0.5">
                                {isChecked ? (
                                  <CheckSquare
                                    size={14}
                                    className="text-blue-400"
                                  />
                                ) : (
                                  <Square
                                    size={14}
                                    className="text-[#6B7280]"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-[11px] text-[#E5E7EB] truncate font-medium">
                                  {item.filename}
                                </div>
                                <div className="text-[10px] text-[#A5A9B0] leading-tight">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#454950] bg-[#232529] flex items-center justify-between">
              <span className="text-xs text-[#A5A9B0]">
                Action is reversible via{" "}
                <span className="font-mono text-[#E5E7EB]">removed_files/</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowQuarantineModal(false)}
                  disabled={quarantineLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteQuarantine}
                  loading={quarantineLoading}
                  disabled={selectedItemIds.size === 0 || quarantineLoading}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold border-amber-500"
                >
                  <Archive size={14} />
                  <span>Quarantine ({selectedItemIds.size})</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatasetInspector;
