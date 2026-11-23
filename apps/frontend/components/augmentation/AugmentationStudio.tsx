"use client";

import React, { useState, useEffect } from "react";
import { Activity, Layers } from "lucide-react";
import DatasetSelection from "./DatasetSelection";
import DatasetInspector from "./DatasetInspector";
import AugmentationPanel from "./AugmentationPanel";
import PreviewPanel from "./PreviewPanel";
import OutputPanel from "./OutputPanel";
import {
  checkHealth,
  type ScanResponse,
  type AugmentationConfig,
} from "../../api/augmentation.api";

export default function AugmentationStudio() {
  const [datasetPath, setDatasetPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [augEnabled, setAugEnabled] = useState(false);
  const [augmentations, setAugmentations] = useState<AugmentationConfig[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check backend health on mount and periodically
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    const interval = setInterval(() => {
      checkHealth()
        .then(() => setBackendOnline(true))
        .catch(() => setBackendOnline(false));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#27292D] text-[#E5E7EB] flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Top navigation header */}
      <header className="sticky top-0 z-40 bg-[#2C2F34]/95 backdrop-blur-xs border-b border-[#454950] shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-xs">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#E5E7EB] leading-tight tracking-tight">
                AugmentStudio
              </h1>
              <p className="text-[11px] text-[#A5A9B0] leading-tight">
                Dataset Augmentation Studio
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-[#A5A9B0] bg-[#27292D] px-3 py-1 rounded-full border border-[#454950]">
            <span>Local YOLO Image Augmentation &amp; Annotation Transformation</span>
          </div>

          {/* Backend connectivity status badge */}
          <div className="flex items-center gap-2">
            {backendOnline === null && (
              <span className="flex items-center gap-1.5 text-xs text-[#A5A9B0] font-medium bg-[#32353A] px-2.5 py-1 rounded-full border border-[#454950]">
                <Activity size={12} className="animate-pulse text-blue-400" />
                Connecting…
              </span>
            )}
            {backendOnline === true && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Backend online
              </span>
            )}
            {backendOnline === false && (
              <span className="flex items-center gap-1.5 text-xs text-red-300 font-medium bg-red-950/40 px-2.5 py-1 rounded-full border border-red-800/60">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Backend offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Backend offline alert banner */}
      {backendOnline === false && (
        <div className="bg-red-950/40 border-b border-red-800/60 px-4 py-2 text-center text-xs sm:text-sm text-red-200 font-medium">
          ⚠️ Backend service is not reachable. Start it with:{" "}
          <code className="bg-red-900/60 px-1.5 py-0.5 rounded font-mono text-xs text-red-100">
            cd Augmentation/backend &amp;&amp; python main.py
          </code>
        </div>
      )}

      {/* Main Combined Workspace Container (3 Rows) */}
      <main className="w-full max-w-none mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5 flex-1">
        {/* ROW 1: Two Columns (Left: Dataset Selection, Right: Dataset Preview & Validation) */}
        <section aria-label="Dataset Configuration and Inspection">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            {/* Row 1 Left: Dataset Selection */}
            <div className="lg:col-span-5 flex flex-col">
              <DatasetSelection
                datasetPath={datasetPath}
                outputPath={outputPath}
                onDatasetPathChange={setDatasetPath}
                onOutputPathChange={setOutputPath}
                onScanComplete={(result) => {
                  setScanResult(result);
                }}
                scanResult={scanResult}
              />
            </div>

            {/* Row 1 Right: Dataset Preview & Validation */}
            <div className="lg:col-span-7 flex flex-col">
              <DatasetInspector
                datasetPath={datasetPath}
                scanResult={scanResult}
                onScanUpdate={setScanResult}
              />
            </div>
          </div>
        </section>

        {/* ROW 2: Two Columns / Collapsible Sidebar & Live Preview Workspace */}
        <section aria-label="Augmentation Configuration and Live Preview">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-stretch">
            {/* Row 2 Left: Image Augmentation (Collapsible to narrow strip) */}
            <div
              className={`w-full transition-all duration-300 flex flex-col ${
                sidebarCollapsed
                  ? "lg:w-16 shrink-0"
                  : "lg:w-[42%] lg:max-w-[580px] shrink-0"
              }`}
            >
              <AugmentationPanel
                enabled={augEnabled}
                onEnabledChange={setAugEnabled}
                selectedAugs={augmentations}
                onAugsChange={setAugmentations}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              />
            </div>

            {/* Row 2 Right: Preview Transformation (Expands into remaining space) */}
            <div className="flex-1 min-w-0 flex flex-col">
              <PreviewPanel
                datasetPath={datasetPath}
                scanResult={scanResult}
                augmentations={augEnabled ? augmentations : []}
                layoutMode={sidebarCollapsed ? "side-by-side" : "stacked"}
                onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
                isSidebarCollapsed={sidebarCollapsed}
              />
            </div>
          </div>
        </section>

        {/* ROW 3: Full Width (Output & Generation) */}
        <section aria-label="Output Destination and Dataset Generation">
          <div className="w-full">
            <OutputPanel
              datasetPath={datasetPath}
              outputPath={outputPath}
              scanResult={scanResult}
              augmentations={augmentations}
              augEnabled={augEnabled}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#8F949D] py-3 border-t border-[#454950] bg-[#2C2F34]/50">
        Dataset Augmentation Studio • All processing is strictly local • No images or annotations leave your machine.
      </footer>
    </div>
  );
}
