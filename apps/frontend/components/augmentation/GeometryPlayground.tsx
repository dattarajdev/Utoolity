"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Layers, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { PresetScenariosBar, type PresetScenario } from "./PresetScenariosBar";
import { TransformationControls } from "./TransformationControls";
import { GeometryPreviewPanel } from "./GeometryPreviewPanel";
import { GeometryDebugPanel } from "./GeometryDebugPanel";
import { Alert } from "./ui";
import {
  augmentationApi,
  type VerifyGeometryRequestDto,
  type VerifyGeometryResponseDto,
} from "../../api/augmentation.api";

export default function GeometryPlayground() {
  const [activePresetId, setActivePresetId] = useState<string | null>("rot-45-exp");
  const [config, setConfig] = useState<VerifyGeometryRequestDto>({
    operation: {
      type: "rotate",
      params: {
        angle: 45,
        expandCanvas: true,
      },
    },
    imageSource: {
      type: "synthetic",
      scenarioId: "single-centered",
    },
    minAreaRatio: 0.05,
  });

  const [verificationResult, setVerificationResult] =
    useState<VerifyGeometryResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runVerification = useCallback(
    async (overrideConfig?: VerifyGeometryRequestDto) => {
      const cfg = overrideConfig ?? config;
      setLoading(true);
      setError(null);
      try {
        const result = await augmentationApi.verifyGeometry(cfg);
        setVerificationResult(result);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string; error?: string } } })
            ?.response?.data?.message ||
          (err as Error)?.message ||
          "Failed to execute geometry verification.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [config],
  );

  // Automatically execute initial verification on mount
  useEffect(() => {
    runVerification();
  }, []);

  const handleSelectPreset = (preset: PresetScenario) => {
    setActivePresetId(preset.id);
    const newConfig: VerifyGeometryRequestDto = {
      operation: {
        type: preset.operation.type,
        params: {
          ...preset.operation.params,
        },
      },
      imageSource: {
        type: "synthetic",
        scenarioId: preset.scenarioId,
      },
      minAreaRatio: 0.05,
    };
    setConfig(newConfig);
    runVerification(newConfig);
  };

  const handleConfigChange = (newConfig: VerifyGeometryRequestDto) => {
    setActivePresetId(null); // User customized settings
    setConfig(newConfig);
  };

  return (
    <div className="min-h-screen bg-[#27292D] text-[#E5E7EB] flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Workspace Header */}
      <header className="sticky top-0 z-30 bg-[#2C2F34] border-b border-[#454950] px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight leading-snug">
                  Augmentation Studio
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/60">
                  Phase 1.2 Verification Playground
                </span>
              </div>
              <p className="text-xs text-[#A5A9B0] leading-none mt-0.5">
                Physical Sharp Image Transformations &amp; YOLO Annotation Alignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Engine Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 flex-1">
        {/* Error notification */}
        {error && (
          <Alert type="error">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Section 1: Quick Preset Scenarios */}
        <div className="p-3.5 rounded-xl border border-[#454950] bg-[#32353A] shadow-xs">
          <PresetScenariosBar
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            disabled={loading}
          />
        </div>

        {/* Section 2: Interactive Controls */}
        <div className="p-3.5 rounded-xl border border-[#454950] bg-[#32353A] shadow-xs">
          <TransformationControls
            config={config}
            onChangeConfig={handleConfigChange}
            onRunVerification={() => runVerification()}
            loading={loading}
          />
        </div>

        {/* Section 3: Dual Image & Bounding-Box Comparison Panel */}
        <GeometryPreviewPanel data={verificationResult} loading={loading} />

        {/* Section 4: Detailed Geometry & Synchronization Diagnostics */}
        <GeometryDebugPanel data={verificationResult} />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#454950] bg-[#2C2F34] px-4 py-3 text-center text-xs text-[#A5A9B0]">
        Utoolity Augmentation Engine • All processing strictly local via Sharp &amp; Fastify • Zero data leaves machine.
      </footer>
    </div>
  );
}
