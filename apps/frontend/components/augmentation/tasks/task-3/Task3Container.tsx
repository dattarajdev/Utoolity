"use client";

import React from "react";
import Link from "next/link";
import {
  Crop,
  ChevronLeft,
  FolderInput,
  Scissors,
  Layers,
  FileOutput,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { SectionCard, Badge } from "../../ui";

export const Task3Container: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#27292D] text-[#E5E7EB] flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Top navigation header */}
      <header className="sticky top-0 z-40 bg-[#2C2F34]/95 backdrop-blur-xs border-b border-[#454950] shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/tools/augmentation"
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-[#A5A9B0] hover:text-[#E5E7EB] bg-[#27292D] hover:bg-[#3C4046] border border-[#454950] transition-colors shadow-xs mr-1 cursor-pointer"
              title="Return to Augmentation Tasks Hub"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Back to Tasks</span>
            </Link>

            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Crop size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[#E5E7EB] leading-tight tracking-tight">
                  AugmentStudio
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/60">
                  Task 3 — Object Cropping &amp; Pasting
                </span>
              </div>
              <p className="text-[11px] text-[#A5A9B0] leading-tight">
                YOLO Annotated Object Extraction &amp; Background Scene Compositing
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-[#A5A9B0] bg-[#27292D] px-3 py-1 rounded-full border border-[#454950]">
            <span>Dedicated Workspace Container • Phase 0 Architecture</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-medium bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/60">
              <CheckCircle2 size={12} className="text-emerald-400" />
              Workspace Isolated
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col gap-5 flex-1">
        {/* Isolation Notice Banner */}
        <div className="bg-[#32353A] border border-[#454950] rounded-xl p-4 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/50 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/60 mt-0.5">
            <Info size={17} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[#E5E7EB]">
                Task 3 Workspace Isolation &amp; Implementation Readiness
              </h2>
              <Badge color="green">Phase 0 Architectural Separation Complete</Badge>
            </div>
            <p className="text-xs text-[#A5A9B0] leading-relaxed mt-1">
              This container is dedicated exclusively to <strong>Task 3</strong>. It is completely isolated from Task 2&apos;s geometric processing pipeline. In the upcoming phase, its object extraction algorithms, foreground masking, placement configuration, and synthetic annotation engine will be built here independently.
            </p>
          </div>
        </div>

        {/* Structured Pipeline Container Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Section 1: Source & Background Dataset Configuration */}
          <SectionCard
            number={1}
            title="Source & Background Datasets"
            subtitle="Dual-dataset input and pairing specification"
            icon={<FolderInput size={18} />}
            color="#10B981"
            headerAction={
              <span className="text-[10px] font-mono text-[#8F949D] bg-[#27292D] px-2 py-0.5 rounded border border-[#454950]">
                Pipeline Stage 1
              </span>
            }
          >
            <div className="flex flex-col gap-3 py-4 text-center items-center justify-center min-h-[160px] border border-dashed border-[#454950] rounded-lg bg-[#27292D]/40 p-4">
              <div className="w-9 h-9 rounded-full bg-emerald-950/50 text-emerald-400 flex items-center justify-center">
                <FolderInput size={18} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#E5E7EB]">
                  Dual-Dataset Input Channels
                </h4>
                <p className="text-[11px] text-[#A5A9B0] max-w-sm mt-0.5">
                  Folder selector for foreground annotated images (source) and background scene images (destination).
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#8F949D] font-mono">
                <Clock size={11} /> Ready for Stage 1 hooks
              </span>
            </div>
          </SectionCard>

          {/* Section 2: Object Extraction & Class Filtering */}
          <SectionCard
            number={2}
            title="Object Extraction & Masking"
            subtitle="YOLO bounding-box slicing & foreground isolation"
            icon={<Scissors size={18} />}
            color="#3B82F6"
            headerAction={
              <span className="text-[10px] font-mono text-[#8F949D] bg-[#27292D] px-2 py-0.5 rounded border border-[#454950]">
                Pipeline Stage 2
              </span>
            }
          >
            <div className="flex flex-col gap-3 py-4 text-center items-center justify-center min-h-[160px] border border-dashed border-[#454950] rounded-lg bg-[#27292D]/40 p-4">
              <div className="w-9 h-9 rounded-full bg-blue-950/50 text-blue-400 flex items-center justify-center">
                <Scissors size={18} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#E5E7EB]">
                  Cropping &amp; Class Selection Engine
                </h4>
                <p className="text-[11px] text-[#A5A9B0] max-w-sm mt-0.5">
                  Interactive class filtering, bbox crop extraction, alpha feathering, and edge masking controls.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#8F949D] font-mono">
                <Clock size={11} /> Ready for Stage 2 hooks
              </span>
            </div>
          </SectionCard>

          {/* Section 3: Placement & Synthesis Engine */}
          <SectionCard
            number={3}
            title="Placement & Synthesis Engine"
            subtitle="Spatial placement, scale, rotation & composite blending"
            icon={<Layers size={18} />}
            color="#8B5CF6"
            headerAction={
              <span className="text-[10px] font-mono text-[#8F949D] bg-[#27292D] px-2 py-0.5 rounded border border-[#454950]">
                Pipeline Stage 3
              </span>
            }
          >
            <div className="flex flex-col gap-3 py-4 text-center items-center justify-center min-h-[160px] border border-dashed border-[#454950] rounded-lg bg-[#27292D]/40 p-4">
              <div className="w-9 h-9 rounded-full bg-purple-950/50 text-purple-400 flex items-center justify-center">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#E5E7EB]">
                  Composite Scene Synthesizer
                </h4>
                <p className="text-[11px] text-[#A5A9B0] max-w-sm mt-0.5">
                  Object scale jitter, random rotation, perspective placement, occlusion limits, and background blending.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#8F949D] font-mono">
                <Clock size={11} /> Ready for Stage 3 hooks
              </span>
            </div>
          </SectionCard>

          {/* Section 4: Synthetic YOLO Output & Validation */}
          <SectionCard
            number={4}
            title="Synthetic Annotation & Output"
            subtitle="Recalculated YOLO bboxes & batch generation"
            icon={<FileOutput size={18} />}
            color="#F59E0B"
            headerAction={
              <span className="text-[10px] font-mono text-[#8F949D] bg-[#27292D] px-2 py-0.5 rounded border border-[#454950]">
                Pipeline Stage 4
              </span>
            }
          >
            <div className="flex flex-col gap-3 py-4 text-center items-center justify-center min-h-[160px] border border-dashed border-[#454950] rounded-lg bg-[#27292D]/40 p-4">
              <div className="w-9 h-9 rounded-full bg-amber-950/50 text-amber-400 flex items-center justify-center">
                <FileOutput size={18} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#E5E7EB]">
                  YOLO Bbox Recalculation &amp; Export
                </h4>
                <p className="text-[11px] text-[#A5A9B0] max-w-sm mt-0.5">
                  Automatic composite bounding box derivation, coordinate normalization, dataset quota export, and validation checks.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#8F949D] font-mono">
                <Clock size={11} /> Ready for Stage 4 hooks
              </span>
            </div>
          </SectionCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#8F949D] py-3.5 border-t border-[#454950] bg-[#2C2F34]/50">
        Dataset Augmentation Studio • Task 3 Workspace Container • Isolated Implementation Scope
      </footer>
    </div>
  );
};

export default Task3Container;
