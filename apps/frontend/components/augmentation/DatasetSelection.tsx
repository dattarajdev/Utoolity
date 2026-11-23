"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FolderOpen,
  FolderSearch,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import { SectionCard, StatCard, Button, Alert } from "./ui";
import ClassDistribution from "./ClassDistribution";
import { scanDataset, browseFolder, type ScanResponse } from "../../api/augmentation.api";

interface Props {
  datasetPath: string;
  outputPath: string;
  onDatasetPathChange: (p: string) => void;
  onOutputPathChange: (p: string) => void;
  onScanComplete: (result: ScanResponse) => void;
  scanResult: ScanResponse | null;
}

const COMMON_INPUT_SUGGESTIONS = ["dataset", "test-dataset", "data"];

const COMMON_OUTPUT_SUGGESTIONS = [
  "augmented_output",
  "outputs",
  "augmented_dataset",
];

const STORAGE_KEY_INPUT = "augmentstudio_recent_input_dirs";
const STORAGE_KEY_OUTPUT = "augmentstudio_recent_output_dirs";

const getRecentPaths = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveRecentPath = (key: string, path: string) => {
  if (!path || !path.trim()) return;
  try {
    const existing = getRecentPaths(key).filter((p) => p !== path);
    const updated = [path, ...existing].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
};

export const DatasetSelection: React.FC<Props> = ({
  datasetPath,
  outputPath,
  onDatasetPathChange,
  onOutputPathChange,
  onScanComplete,
  scanResult,
}) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browsingInput, setBrowsingInput] = useState(false);
  const [browsingOutput, setBrowsingOutput] = useState(false);
  const [showInputDropdown, setShowInputDropdown] = useState(false);
  const [showOutputDropdown, setShowOutputDropdown] = useState(false);

  const [recentInputs, setRecentInputs] = useState<string[]>([]);
  const [recentOutputs, setRecentOutputs] = useState<string[]>([]);

  const inputDropdownRef = useRef<HTMLDivElement>(null);
  const outputDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentInputs(getRecentPaths(STORAGE_KEY_INPUT));
    setRecentOutputs(getRecentPaths(STORAGE_KEY_OUTPUT));
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputDropdownRef.current &&
        !inputDropdownRef.current.contains(e.target as Node)
      ) {
        setShowInputDropdown(false);
      }
      if (
        outputDropdownRef.current &&
        !outputDropdownRef.current.contains(e.target as Node)
      ) {
        setShowOutputDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBrowseInput = async () => {
    setBrowsingInput(true);
    setError(null);
    try {
      const res = await browseFolder(datasetPath, "Select Input Dataset Folder");
      if (res.path) {
        onDatasetPathChange(res.path);
        saveRecentPath(STORAGE_KEY_INPUT, res.path);
        setRecentInputs(getRecentPaths(STORAGE_KEY_INPUT));
      }
    } catch {
      // User cancelled or dialog failed
    } finally {
      setBrowsingInput(false);
    }
  };

  const handleBrowseOutput = async () => {
    setBrowsingOutput(true);
    try {
      const res = await browseFolder(
        outputPath,
        "Select Output Destination Folder",
      );
      if (res.path) {
        onOutputPathChange(res.path);
        saveRecentPath(STORAGE_KEY_OUTPUT, res.path);
        setRecentOutputs(getRecentPaths(STORAGE_KEY_OUTPUT));
      }
    } catch {
      // User cancelled or dialog failed
    } finally {
      setBrowsingOutput(false);
    }
  };

  const handleScan = async () => {
    const cleaned = datasetPath.trim().replace(/^["']|["']$/g, "");
    if (!cleaned) {
      setError("Please enter an input dataset path.");
      return;
    }

    // Quick client-side check for accidental concatenated Windows paths
    if (/.+[a-zA-Z]:[\\/]/.test(cleaned)) {
      setError(
        "Malformed concatenated path detected (e.g. two paths joined together). Please provide a single directory path.",
      );
      return;
    }

    setScanning(true);
    setError(null);
    try {
      const result = await scanDataset(cleaned);
      onDatasetPathChange(cleaned);
      onScanComplete(result);
      saveRecentPath(STORAGE_KEY_INPUT, cleaned);
      setRecentInputs(getRecentPaths(STORAGE_KEY_INPUT));
      if (outputPath.trim()) {
        const cleanOut = outputPath.trim().replace(/^["']|["']$/g, "");
        saveRecentPath(STORAGE_KEY_OUTPUT, cleanOut);
        setRecentOutputs(getRecentPaths(STORAGE_KEY_OUTPUT));
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Scan failed";
      setError(msg);
    } finally {
      setScanning(false);
    }
  };

  return (
    <SectionCard
      number={1}
      title="Dataset Selection"
      subtitle="Configure input and destination folders"
      icon={<Folder size={18} />}
      color="#3B82F6"
      className="h-full"
    >
      <div className="flex flex-col gap-3.5">
        {/* Input folder */}
        <div className="relative" ref={inputDropdownRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[#E5E7EB] uppercase tracking-wider">
              Input Dataset Folder
            </label>
            <span className="text-[10px] text-[#A5A9B0] font-medium">
              images/ & labels/
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center gap-2 border border-[#454950] rounded-lg px-3 py-2 bg-[#27292D] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-xs">
              <FolderOpen size={16} className="text-[#A5A9B0] shrink-0" />
              <input
                type="text"
                value={datasetPath}
                onChange={(e) => onDatasetPathChange(e.target.value)}
                placeholder="e.g. D:\datasets\my_dataset"
                className="w-full text-xs sm:text-sm bg-transparent outline-none text-[#E5E7EB] placeholder-[#6B7280]"
              />
              {datasetPath && (
                <button
                  type="button"
                  onClick={() => onDatasetPathChange("")}
                  className="text-[#6B7280] hover:text-[#E5E7EB] p-0.5 rounded transition-colors cursor-pointer"
                  title="Clear input path"
                >
                  <X size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowInputDropdown((v) => !v)}
                className="text-[#A5A9B0] hover:text-[#E5E7EB] p-0.5 rounded transition-colors ml-0.5 border-l border-[#454950] pl-1.5 cursor-pointer"
                title="Select from recent or quick paths"
              >
                <ChevronDown
                  size={14}
                  className={
                    showInputDropdown
                      ? "rotate-180 transition-transform"
                      : "transition-transform"
                  }
                />
              </button>
            </div>

            {/* Browse Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleBrowseInput}
              loading={browsingInput}
              size="md"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 font-semibold shadow-xs"
              title="Open local Windows folder picker"
            >
              <FolderSearch size={15} className="text-blue-400" />
              <span>Browse</span>
            </Button>
          </div>

          {/* Input Path Dropdown Menu */}
          {showInputDropdown && (
            <div className="absolute left-0 right-20 top-full mt-1 z-30 bg-[#2C2F34] border border-[#454950] rounded-lg shadow-xl py-1.5 text-xs">
              {recentInputs.length > 0 && (
                <div className="mb-1">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-[#A5A9B0] uppercase tracking-wider flex items-center gap-1">
                    <Clock size={11} /> Recent Folders
                  </div>
                  {recentInputs.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        onDatasetPathChange(p);
                        setShowInputDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-blue-950/40 text-[#E5E7EB] flex items-center justify-between group truncate cursor-pointer"
                    >
                      <span className="truncate">{p}</span>
                      {datasetPath === p && (
                        <CheckCircle2
                          size={12}
                          className="text-blue-400 shrink-0 ml-1"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-[#A5A9B0] uppercase tracking-wider flex items-center gap-1 border-t border-[#454950]">
                  <Sparkles size={11} /> Quick Suggestions
                </div>
                {COMMON_INPUT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onDatasetPathChange(s);
                      setShowInputDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-[#32353A] text-[#A5A9B0] hover:text-[#E5E7EB] flex items-center gap-2 cursor-pointer"
                  >
                    <Folder size={12} className="text-[#6B7280]" />
                    <span className="font-mono text-[11px]">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#A5A9B0] mt-1">
            Requires images/ and labels/ subdirectories
          </p>
        </div>

        {/* Output folder */}
        <div className="relative" ref={outputDropdownRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[#E5E7EB] uppercase tracking-wider">
              Output Destination Folder
            </label>
            <span className="text-[10px] text-[#A5A9B0] font-medium">
              Separate target
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center gap-2 border border-[#454950] rounded-lg px-3 py-2 bg-[#27292D] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-xs">
              <FolderOpen size={16} className="text-[#A5A9B0] shrink-0" />
              <input
                type="text"
                value={outputPath}
                onChange={(e) => onOutputPathChange(e.target.value)}
                placeholder="e.g. D:\augmented_output"
                className="w-full text-xs sm:text-sm bg-transparent outline-none text-[#E5E7EB] placeholder-[#6B7280]"
              />
              {outputPath && (
                <button
                  type="button"
                  onClick={() => onOutputPathChange("")}
                  className="text-[#6B7280] hover:text-[#E5E7EB] p-0.5 rounded transition-colors cursor-pointer"
                  title="Clear output path"
                >
                  <X size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowOutputDropdown((v) => !v)}
                className="text-[#A5A9B0] hover:text-[#E5E7EB] p-0.5 rounded transition-colors ml-0.5 border-l border-[#454950] pl-1.5 cursor-pointer"
                title="Select from recent or quick paths"
              >
                <ChevronDown
                  size={14}
                  className={
                    showOutputDropdown
                      ? "rotate-180 transition-transform"
                      : "transition-transform"
                  }
                />
              </button>
            </div>

            {/* Browse Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleBrowseOutput}
              loading={browsingOutput}
              size="md"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 font-semibold shadow-xs"
              title="Open local Windows folder picker"
            >
              <FolderSearch size={15} className="text-blue-400" />
              <span>Browse</span>
            </Button>
          </div>

          {/* Output Path Dropdown Menu */}
          {showOutputDropdown && (
            <div className="absolute left-0 right-20 top-full mt-1 z-30 bg-[#2C2F34] border border-[#454950] rounded-lg shadow-xl py-1.5 text-xs">
              {recentOutputs.length > 0 && (
                <div className="mb-1">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-[#A5A9B0] uppercase tracking-wider flex items-center gap-1">
                    <Clock size={11} /> Recent Folders
                  </div>
                  {recentOutputs.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        onOutputPathChange(p);
                        setShowOutputDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-blue-950/40 text-[#E5E7EB] flex items-center justify-between group truncate cursor-pointer"
                    >
                      <span className="truncate">{p}</span>
                      {outputPath === p && (
                        <CheckCircle2
                          size={12}
                          className="text-blue-400 shrink-0 ml-1"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-[#A5A9B0] uppercase tracking-wider flex items-center gap-1 border-t border-[#454950]">
                  <Sparkles size={11} /> Quick Suggestions
                </div>
                {COMMON_OUTPUT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onOutputPathChange(s);
                      setShowOutputDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-[#32353A] text-[#A5A9B0] hover:text-[#E5E7EB] flex items-center gap-2 cursor-pointer"
                  >
                    <Folder size={12} className="text-[#6B7280]" />
                    <span className="font-mono text-[11px]">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#A5A9B0] mt-1">
            Augmented data and labels will be saved here
          </p>
        </div>

        {/* Scan Action */}
        <div className="pt-0.5">
          <Button
            onClick={handleScan}
            loading={scanning}
            disabled={!datasetPath.trim()}
            variant="primary"
            size="md"
            className="w-full justify-center shadow-xs font-semibold"
          >
            <ScanLine size={16} />
            Scan Dataset
          </Button>
        </div>

        {/* Error notification */}
        {error && (
          <Alert type="error">
            <XCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Scanned summary & compact stats */}
        {scanResult && (
          <div className="flex flex-col gap-2.5 pt-1 border-t border-[#454950]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#E5E7EB]">Scan Summary</span>
              {scanResult.classes_verified ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-700/60"
                  title="Class IDs verified against classes.txt or data.yaml"
                >
                  <CheckCircle2 size={12} /> Classes Verified
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-700/60"
                  title={
                    scanResult.classes_warning ||
                    "No data.yaml or classes.txt found; class IDs unverified"
                  }
                >
                  <AlertCircle size={12} /> Class IDs Unverified
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatCard
                label="Images"
                value={scanResult.image_count}
                icon={<ScanLine size={14} />}
                color="#3B82F6"
                compact
              />
              <StatCard
                label="Labels"
                value={scanResult.label_count}
                icon={<CheckCircle2 size={14} />}
                color="#22C55E"
                compact
              />
              <StatCard
                label="Classes"
                value={Object.keys(scanResult.class_distribution).length}
                icon={<Folder size={14} />}
                color="#8B5CF6"
                compact
              />
              <StatCard
                label="Missing"
                value={scanResult.missing_labels}
                icon={<AlertCircle size={14} />}
                color="#F59E0B"
                alert={scanResult.missing_labels > 0}
                compact
              />
              <StatCard
                label="Invalid"
                value={scanResult.invalid_annotations}
                icon={<XCircle size={14} />}
                color="#EF4444"
                alert={scanResult.invalid_annotations > 0}
                compact
              />
              {scanResult.orphan_labels &&
                scanResult.orphan_labels.length > 0 && (
                  <StatCard
                    label="Orphan Labels"
                    value={scanResult.orphan_labels.length}
                    icon={<AlertCircle size={14} />}
                    color="#A855F7"
                    alert
                    compact
                  />
                )}
              {scanResult.corrupted_images &&
                scanResult.corrupted_images.length > 0 && (
                  <StatCard
                    label="Corrupted"
                    value={scanResult.corrupted_images.length}
                    icon={<XCircle size={14} />}
                    color="#DC2626"
                    alert
                    compact
                  />
                )}
            </div>

            {scanResult.classes_warning && !scanResult.classes_verified && (
              <div className="text-[11px] text-amber-200 bg-amber-950/30 rounded-lg p-2 border border-amber-700/50 flex items-start gap-1.5">
                <AlertCircle
                  size={13}
                  className="shrink-0 mt-0.5 text-amber-400"
                />
                <span>{scanResult.classes_warning}</span>
              </div>
            )}

            {/* Class-wise annotation distribution */}
            <ClassDistribution
              distribution={scanResult.class_distribution}
              className="mt-1"
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default DatasetSelection;
