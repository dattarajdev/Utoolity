"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
  FileOutput,
  Calculator,
  Target,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { SectionCard, Button, Alert, Badge } from "./ui";
import {
  estimateOutput,
  generateDataset,
  getJobStatus,
  type AugmentationConfig,
  type EstimateResponse,
  type JobStatusResponse,
  type ScanResponse,
} from "../../api/augmentation.api";

interface Props {
  datasetPath: string;
  outputPath: string;
  scanResult: ScanResponse | null;
  augmentations: AugmentationConfig[];
  augEnabled: boolean;
}

export const OutputPanel: React.FC<Props> = ({
  datasetPath,
  outputPath,
  scanResult,
  augmentations,
  augEnabled,
}) => {
  // Common Generation Options
  const [preserveOriginals, setPreserveOriginals] = useState(true);
  const [createClassesFile, setCreateClassesFile] = useState(true);
  const [validateOutput, setValidateOutput] = useState(true);

  // Standard Output Estimation & Job State
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeMode, setActiveMode] = useState<"standard" | "target" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Right Panel States: Own Image Set Generation (Target-based)
  const [targetTotal, setTargetTotal] = useState<string>("1000");
  const [includeOriginalsTarget, setIncludeOriginalsTarget] =
    useState<boolean>(true);

  // Synchronize original inclusion setting between panels to avoid contradictory options
  const handleToggleOriginals = (val: boolean) => {
    setPreserveOriginals(val);
    setIncludeOriginalsTarget(val);
  };

  // Fetch estimate whenever inputs change for left panel
  useEffect(() => {
    if (
      !datasetPath ||
      !scanResult ||
      !augEnabled ||
      augmentations.length === 0
    ) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const est = await estimateOutput(
          datasetPath,
          augmentations,
          preserveOriginals,
        );
        setEstimate(est);
      } catch {
        setEstimate(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [datasetPath, augmentations, preserveOriginals, augEnabled, scanResult]);

  // Poll job status for running generation
  const startPolling = (id: string, mode: "standard" | "target") => {
    setActiveMode(mode);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const status = await getJobStatus(id);
        setJobStatus(status);
        if (status.status !== "running") {
          if (pollRef.current) clearInterval(pollRef.current);
          setGenerating(false);
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
        setGenerating(false);
      }
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const canGenerate =
    Boolean(datasetPath) &&
    Boolean(outputPath) &&
    Boolean(scanResult) &&
    augEnabled &&
    augmentations.length > 0 &&
    !generating;

  // Standard generation handler
  const handleGenerate = async () => {
    if (!datasetPath || !outputPath) {
      setError("Please set both input dataset and output destination paths.");
      return;
    }
    if (!augEnabled || augmentations.length === 0) {
      setError("Enable augmentation and select at least one transformation.");
      return;
    }
    setError(null);
    setTargetError(null);
    setJobStatus(null);
    setGenerating(true);
    setActiveMode("standard");

    try {
      const res = await generateDataset({
        dataset_path: datasetPath,
        output_path: outputPath,
        augmentations,
        preserve_originals: preserveOriginals,
        create_classes_file: createClassesFile,
        validate_output: validateOutput,
      });
      startPolling(res.job_id, "standard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Generation failed";
      setError(msg);
      setGenerating(false);
    }
  };

  // Target-based calculations (Right Panel)
  const originalCount = scanResult?.image_count ?? 0;
  const parsedTarget = parseInt(targetTotal.trim(), 10);
  const isTargetValidNumber = !isNaN(parsedTarget) && parsedTarget > 0;

  let additionalRequired = 0;
  let targetValidationError: string | null = null;

  if (!targetTotal.trim()) {
    targetValidationError = "Enter a target total number of images.";
  } else if (!isTargetValidNumber) {
    targetValidationError =
      "Target total must be a positive integer greater than 0.";
  } else if (
    scanResult &&
    includeOriginalsTarget &&
    parsedTarget < originalCount
  ) {
    targetValidationError = `Target total (${parsedTarget.toLocaleString()}) cannot be less than original images (${originalCount.toLocaleString()}) when originals are included.`;
  } else if (scanResult) {
    additionalRequired = includeOriginalsTarget
      ? Math.max(0, parsedTarget - originalCount)
      : parsedTarget;
  }

  const canTriggerTarget =
    Boolean(datasetPath) &&
    Boolean(outputPath) &&
    Boolean(scanResult) &&
    augEnabled &&
    augmentations.length > 0 &&
    isTargetValidNumber &&
    !targetValidationError &&
    !generating;

  // Target generation handler
  const handleTargetGenerate = async () => {
    if (!datasetPath || !outputPath) {
      setTargetError(
        "Please set both input dataset and output destination paths.",
      );
      return;
    }
    if (!scanResult) {
      setTargetError("Please scan the dataset first.");
      return;
    }
    if (!augEnabled || augmentations.length === 0) {
      setTargetError(
        "Enable augmentation and select at least one transformation.",
      );
      return;
    }
    if (!isTargetValidNumber) {
      setTargetError("Enter a valid positive target image count.");
      return;
    }
    if (targetValidationError) {
      setTargetError(targetValidationError);
      return;
    }

    setTargetError(null);
    setError(null);
    setJobStatus(null);
    setGenerating(true);
    setActiveMode("target");

    try {
      const res = await generateDataset({
        dataset_path: datasetPath,
        output_path: outputPath,
        augmentations,
        preserve_originals: includeOriginalsTarget,
        create_classes_file: createClassesFile,
        validate_output: validateOutput,
        target_total_count: parsedTarget,
      });
      startPolling(res.job_id, "target");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Target generation failed";
      setTargetError(msg);
      setGenerating(false);
    }
  };

  const getExplanation = () => {
    if (!isTargetValidNumber) return null;
    if (!scanResult) {
      return `Target total: ${parsedTarget.toLocaleString()} images. Scan a dataset to calculate required augmentations.`;
    }
    if (includeOriginalsTarget) {
      if (parsedTarget < originalCount) return null;
      return `Targeting ${parsedTarget.toLocaleString()} total images: preserving ${originalCount.toLocaleString()} original images and synthesizing ${additionalRequired.toLocaleString()} additional augmented images.`;
    }
    return `Targeting ${parsedTarget.toLocaleString()} total images: originals are excluded from the output quota, so all ${additionalRequired.toLocaleString()} images will be synthesized from augmentations.`;
  };

  return (
    <SectionCard
      number={5}
      title="Output & Generation"
      subtitle="Batch generation and target-based dataset size synthesis"
      icon={<FileOutput size={18} />}
      color="#059669"
      className="w-full"
    >
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* ========================================================================= */}
        {/* LEFT PANEL: Output Generation (Standard batch workflow)                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col bg-[#27292D] rounded-xl border border-[#454950] shadow-xs overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-[#232529] border-b border-[#454950] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-emerald-950/50 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-700/50">
                <FileOutput size={14} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#E5E7EB] truncate">
                  Output Generation
                </h3>
                <p className="text-[11px] text-[#A5A9B0] truncate">
                  Batch augmentation options &amp; standard generation
                </p>
              </div>
            </div>
            {generating && activeMode === "standard" ? (
              <Badge color="blue">Processing...</Badge>
            ) : jobStatus?.status === "done" && activeMode === "standard" ? (
              <Badge color="green">Complete</Badge>
            ) : (
              <Badge color="green">Standard</Badge>
            )}
          </div>

          <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
            {/* Paths Overview */}
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#1E2023] border border-[#454950] text-xs">
              <div className="flex items-start gap-2">
                <FolderOpen
                  size={14}
                  className="text-[#A5A9B0] shrink-0 mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-[#A5A9B0] uppercase tracking-tight block">
                    Source Dataset
                  </span>
                  <span className="font-mono text-[#E5E7EB] truncate block text-[11px]">
                    {datasetPath || (
                      <span className="italic text-[#6B7280]">
                        Not set (select in Row 1)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#454950] pt-2 flex items-start gap-2">
                <FileOutput
                  size={14}
                  className="text-emerald-400 shrink-0 mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-[#A5A9B0] uppercase tracking-tight block">
                    Destination Folder
                  </span>
                  <span className="font-mono text-[#E5E7EB] truncate block text-[11px]">
                    {outputPath || (
                      <span className="italic text-[#6B7280]">
                        Not set (select in Row 1)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Generation Options */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5E7EB] uppercase tracking-wider pb-1 border-b border-[#454950]">
                <Settings size={13} className="text-[#A5A9B0]" />
                Generation Settings
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#E5E7EB] hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={preserveOriginals}
                    onChange={(e) => handleToggleOriginals(e.target.checked)}
                    disabled={generating}
                    className="w-4 h-4 rounded accent-emerald-600 bg-[#32353A] border-[#454950]"
                  />
                  <span>Preserve original images in output</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#E5E7EB] hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={createClassesFile}
                    onChange={(e) => setCreateClassesFile(e.target.checked)}
                    disabled={generating}
                    className="w-4 h-4 rounded accent-emerald-600 bg-[#32353A] border-[#454950]"
                  />
                  <span>Generate classes.txt / obj.names file in output</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#E5E7EB] hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={validateOutput}
                    onChange={(e) => setValidateOutput(e.target.checked)}
                    disabled={generating}
                    className="w-4 h-4 rounded accent-emerald-600 bg-[#32353A] border-[#454950]"
                  />
                  <span>
                    Validate transformed annotations (coordinates &amp; bounds)
                  </span>
                </label>
              </div>
            </div>

            {/* Output Estimation Cards */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5E7EB] uppercase tracking-wider pb-1 border-b border-[#454950]">
                <Calculator size={13} className="text-[#A5A9B0]" />
                Standard Estimation
              </div>

              {estimate ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#1E2023] rounded-lg p-2.5 border border-[#454950]">
                    <p className="text-base font-bold text-[#E5E7EB]">
                      {estimate.original_count.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#A5A9B0] uppercase tracking-tight">
                      Originals
                    </p>
                  </div>
                  <div className="bg-[#1E2023] rounded-lg p-2.5 border border-[#454950]">
                    <p className="text-base font-bold text-[#E5E7EB]">
                      +{estimate.augmented_count.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#A5A9B0] uppercase tracking-tight">
                      Augmented
                    </p>
                  </div>
                  <div className="bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-700/60">
                    <p className="text-base font-bold text-emerald-300">
                      ={estimate.total_count.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-tight font-semibold">
                      Total Output
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[#1E2023] border border-[#454950] text-center">
                  <p className="text-xs text-[#E5E7EB] font-medium">
                    Estimate Pending
                  </p>
                  <p className="text-[11px] text-[#A5A9B0] mt-0.5">
                    Select input dataset and at least one augmentation in Row 2.
                  </p>
                </div>
              )}
            </div>

            {/* Validation / Config Warnings */}
            {!augEnabled && (
              <Alert type="warning">
                Augmentations are currently toggled off in Row 2. Enable them to
                generate augmented data.
              </Alert>
            )}

            {augEnabled && augmentations.length === 0 && (
              <Alert type="info">
                No transformations selected. Enable at least one transformation
                in Row 2.
              </Alert>
            )}

            {error && (
              <Alert type="error">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </Alert>
            )}

            {/* Generation Action Button & Progress */}
            <div className="flex flex-col gap-2.5 pt-1 mt-auto">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                variant="primary"
                size="lg"
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md py-2.5 text-sm border-emerald-500"
              >
                <Play size={16} />
                {generating && activeMode === "standard"
                  ? "Generating Augmented Dataset..."
                  : "Generate Augmented Dataset"}
              </Button>

              {/* Progress / Status display for Standard Generation */}
              {activeMode === "standard" && jobStatus && (
                <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#1E2023] border border-[#454950]">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#E5E7EB] truncate mr-2">
                        {jobStatus.message}
                      </span>
                      <span className="font-mono text-[#A5A9B0] whitespace-nowrap">
                        {jobStatus.processed}/{jobStatus.total}
                      </span>
                    </div>
                    <div className="h-2 bg-[#3C4046] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          jobStatus.status === "done"
                            ? "bg-emerald-500"
                            : jobStatus.status === "error"
                            ? "bg-red-500"
                            : "bg-emerald-600"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, jobStatus.progress))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#A5A9B0] mt-1">
                      <span>{Math.round(jobStatus.progress)}%</span>
                      <span>{jobStatus.output_count} written</span>
                    </div>
                  </div>

                  {jobStatus.status === "done" && (
                    <Alert type="success">
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                      <span>
                        Generation complete! {jobStatus.output_count} files
                        saved to output.
                      </span>
                    </Alert>
                  )}

                  {jobStatus.status === "error" && (
                    <Alert type="error">
                      <XCircle size={15} className="shrink-0 mt-0.5" />
                      <span>Generation failed: {jobStatus.message}</span>
                    </Alert>
                  )}

                  {jobStatus.errors && jobStatus.errors.length > 0 && (
                    <div className="border border-amber-700/50 rounded-md overflow-hidden bg-[#27292D]">
                      <div className="bg-amber-950/40 px-2 py-1 flex items-center gap-1.5 text-xs text-amber-200 font-medium border-b border-amber-700/40">
                        <AlertCircle size={12} className="text-amber-400" />
                        <span>
                          {jobStatus.errors.length} warning(s) during processing:
                        </span>
                      </div>
                      <div className="max-h-24 overflow-y-auto p-2 flex flex-col gap-1 text-[11px] font-mono text-amber-300">
                        {jobStatus.errors.map((e, idx) => (
                          <p key={idx} className="truncate">
                            {e}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Own Image Set Generation (Target-based size synthesis)       */}
        {/* ========================================================================= */}
        <div className="flex flex-col bg-[#27292D] rounded-xl border border-[#454950] shadow-xs overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-[#232529] border-b border-[#454950] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-blue-950/50 text-blue-300 flex items-center justify-center shrink-0 border border-blue-700/50">
                <Target size={14} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#E5E7EB] truncate">
                  Own Image Set Generation
                </h3>
                <p className="text-[11px] text-[#A5A9B0] truncate">
                  Target-based dataset size synthesis &amp; quota calculation
                </p>
              </div>
            </div>
            {generating && activeMode === "target" ? (
              <Badge color="blue">Synthesizing...</Badge>
            ) : jobStatus?.status === "done" && activeMode === "target" ? (
              <Badge color="green">Target Reached</Badge>
            ) : jobStatus?.status === "error" && activeMode === "target" ? (
              <Badge color="red">Failed</Badge>
            ) : (
              <Badge color="blue">Target Mode</Badge>
            )}
          </div>

          <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
            {/* Target Settings */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5E7EB] uppercase tracking-wider pb-1 border-b border-[#454950]">
                <Settings size={13} className="text-[#A5A9B0]" />
                Target Dataset Size Configuration
              </div>

              {/* Target Image Count Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#E5E7EB] flex items-center justify-between">
                  <span>Target Total Image Count</span>
                  <span className="text-[11px] text-[#A5A9B0]">
                    Final dataset size desired
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={targetTotal}
                    onChange={(e) => setTargetTotal(e.target.value)}
                    disabled={generating}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-2 text-sm bg-[#1E2023] border border-[#454950] rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono shadow-xs disabled:bg-[#27292D] disabled:text-[#6B7280]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#A5A9B0] pointer-events-none font-medium">
                    images
                  </span>
                </div>
              </div>

              {/* Include Originals Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#E5E7EB] hover:text-white select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={includeOriginalsTarget}
                  onChange={(e) => handleToggleOriginals(e.target.checked)}
                  disabled={generating}
                  className="w-4 h-4 rounded accent-blue-600 bg-[#32353A] border-[#454950] mt-0.5"
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-medium text-[#E5E7EB]">
                    Include original images in final dataset
                  </span>
                  <span className="text-[11px] text-[#A5A9B0] mt-0.5">
                    Originals count towards target: Additional = Target - Originals
                    (otherwise Additional = Target).
                  </span>
                </div>
              </label>
            </div>

            {/* Calculations & Summary Cards */}
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5E7EB] uppercase tracking-wider pb-1 border-b border-[#454950]">
                <Calculator size={13} className="text-[#A5A9B0]" />
                Quota &amp; Additional Augmentations
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#1E2023] rounded-lg p-2.5 border border-[#454950]">
                  <p className="text-base font-bold text-[#E5E7EB]">
                    {isTargetValidNumber ? parsedTarget.toLocaleString() : "—"}
                  </p>
                  <p className="text-[10px] text-[#A5A9B0] uppercase tracking-tight">
                    Target Total
                  </p>
                </div>
                <div className="bg-[#1E2023] rounded-lg p-2.5 border border-[#454950]">
                  <p className="text-base font-bold text-[#E5E7EB]">
                    {scanResult ? originalCount.toLocaleString() : "—"}
                  </p>
                  <p className="text-[10px] text-[#A5A9B0] uppercase tracking-tight">
                    {scanResult
                      ? includeOriginalsTarget
                        ? "Originals (Incl)"
                        : "Originals (Excl)"
                      : "Scanned Count"}
                  </p>
                </div>
                <div className="bg-blue-950/40 rounded-lg p-2.5 border border-blue-700/60">
                  <p className="text-base font-bold text-blue-300">
                    {scanResult && isTargetValidNumber && !targetValidationError
                      ? `+${additionalRequired.toLocaleString()}`
                      : "—"}
                  </p>
                  <p className="text-[10px] text-blue-400 uppercase tracking-tight font-semibold">
                    Required New
                  </p>
                </div>
              </div>

              {/* Dynamic Explanation Text */}
              {getExplanation() && (
                <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-800/50 flex items-start gap-2 text-xs text-blue-200">
                  <Sparkles
                    size={14}
                    className="text-blue-400 shrink-0 mt-0.5"
                  />
                  <span className="leading-relaxed">{getExplanation()}</span>
                </div>
              )}

              {/* Validation Alert */}
              {targetValidationError && (
                <Alert type="error">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{targetValidationError}</span>
                </Alert>
              )}

              {!scanResult && (
                <Alert type="info">
                  <Info size={14} className="shrink-0 mt-0.5 text-blue-400" />
                  <span>
                    Scan a dataset in Row 1 to detect original images and
                    calculate required augmentations.
                  </span>
                </Alert>
              )}
            </div>

            {/* Target Generation Action & Real Progress Status */}
            <div className="flex flex-col gap-2.5 pt-1 mt-auto">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5E7EB] uppercase tracking-wider pb-1 border-b border-[#454950]">
                <Play size={13} className="text-[#A5A9B0]" />
                Target Quota Execution
              </div>

              {targetError && (
                <Alert type="error">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{targetError}</span>
                </Alert>
              )}

              <Button
                onClick={handleTargetGenerate}
                disabled={!canTriggerTarget}
                variant="primary"
                size="lg"
                className="w-full justify-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md py-2.5 text-sm border-blue-500"
              >
                <Target size={16} />
                {generating && activeMode === "target"
                  ? "Generating Target Dataset..."
                  : "Generate Target Dataset"}
              </Button>

              {/* Progress & Results Layout */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#1E2023] border border-[#454950] text-xs">
                {activeMode === "target" && jobStatus ? (
                  <>
                    <div className="flex items-center justify-between text-[#E5E7EB] font-medium">
                      <span className="flex items-center gap-1.5 truncate mr-2 font-semibold">
                        <Clock size={13} className="text-blue-400 shrink-0" />
                        <span className="truncate">{jobStatus.message}</span>
                      </span>
                      <span className="font-mono text-[#A5A9B0] whitespace-nowrap">
                        {jobStatus.processed} / {jobStatus.total}
                      </span>
                    </div>
                    <div className="h-2 bg-[#3C4046] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          jobStatus.status === "done"
                            ? "bg-emerald-500"
                            : jobStatus.status === "error"
                            ? "bg-red-500"
                            : "bg-blue-600"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, jobStatus.progress))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#A5A9B0] mt-0.5">
                      <span>{Math.round(jobStatus.progress)}% complete</span>
                      <span>
                        {jobStatus.output_count} written (
                        {jobStatus.errors ? jobStatus.errors.length : 0} warnings/failures)
                      </span>
                    </div>

                    {jobStatus.round !== undefined && (
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#A5A9B0] bg-[#27292D] px-2 py-1 rounded border border-[#454950] font-mono mt-0.5">
                        <span>Round: {jobStatus.round}</span>
                        <span>
                          Attempts: {jobStatus.attempts ?? jobStatus.processed}
                        </span>
                        <span>
                          Duplicates filtered:{" "}
                          {jobStatus.exact_duplicates ?? 0}
                        </span>
                        <span>Borderline: {jobStatus.borderline ?? 0}</span>
                      </div>
                    )}

                    {jobStatus.status === "done" && !jobStatus.shortfall && (
                      <Alert type="success">
                        <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                        <span>
                          Target dataset generation complete! Successfully
                          generated {jobStatus.output_count} valid image-label pairs.
                        </span>
                      </Alert>
                    )}

                    {jobStatus.status === "done" &&
                      Boolean(jobStatus.shortfall && jobStatus.shortfall > 0) && (
                        <Alert type="warning">
                          <AlertCircle size={15} className="shrink-0 mt-0.5" />
                          <span>
                            Target quota incomplete: reached{" "}
                            {jobStatus.output_count} / {jobStatus.total} (
                            {jobStatus.shortfall} shortfall). Attempt budget reached.
                          </span>
                        </Alert>
                      )}

                    {jobStatus.status === "error" && (
                      <Alert type="error">
                        <XCircle size={15} className="shrink-0 mt-0.5" />
                        <span>Target generation failed: {jobStatus.message}</span>
                      </Alert>
                    )}

                    {jobStatus.errors && jobStatus.errors.length > 0 && (
                      <div className="border border-amber-700/50 rounded-md overflow-hidden bg-[#27292D] mt-1">
                        <div className="bg-amber-950/40 px-2 py-1 flex items-center gap-1.5 text-xs text-amber-200 font-medium border-b border-amber-700/40">
                          <AlertCircle size={12} className="text-amber-400" />
                          <span>
                            {jobStatus.errors.length} issue(s) during generation:
                          </span>
                        </div>
                        <div className="max-h-24 overflow-y-auto p-2 flex flex-col gap-1 text-[11px] font-mono text-amber-300">
                          {jobStatus.errors.map((e, idx) => (
                            <p key={idx} className="truncate">
                              {e}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[#A5A9B0] font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#6B7280]" />
                        Target Generation Progress:
                      </span>
                      <span className="font-mono text-[#E5E7EB]">
                        0 /{" "}
                        {scanResult &&
                        isTargetValidNumber &&
                        !targetValidationError
                          ? parsedTarget.toLocaleString()
                          : "0"}
                      </span>
                    </div>
                    <div className="h-2 bg-[#3C4046] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-0 transition-all duration-300" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#A5A9B0]">
                      <span>
                        Status:{" "}
                        {canTriggerTarget
                          ? "Ready to synthesize target dataset"
                          : "Awaiting configuration"}
                      </span>
                      <span>0 failures</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default OutputPanel;
