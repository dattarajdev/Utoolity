"use client";

import React from "react";
import {
  Layers,
  Sliders,
  Crop,
  ImagePlus,
  ShieldCheck,
  FolderTree,
} from "lucide-react";
import TaskCard from "./TaskCard";
import type { AugmentationTask } from "../types/hub.types";

const AUGMENTATION_TASKS: AugmentationTask[] = [
  {
    id: "task-1",
    taskNumber: "Task 1",
    title: "Image Filtering Augmentations",
    subtitle: "Pixel-Level & Photometric Filtering",
    description:
      "Pixel-level color transformations, noise injection, gaussian blur, brightness, contrast, and histogram adjustments for sensor variability.",
    route: "/tools/augmentation/task-1",
    isAssignedToUs: false,
    status: "external",
    statusLabel: "Assigned to Team",
    color: "#8B5CF6",
    icon: <Sliders size={22} />,
    capabilities: [
      "Color Jitter",
      "Gaussian Blur",
      "Noise Injection",
      "Brightness & Contrast",
    ],
  },
  {
    id: "task-2",
    taskNumber: "Task 2",
    title: "Geometric Image + Annotation Augmentation",
    subtitle: "Spatial Transforms & YOLO Bounding-Box Recalculation",
    description:
      "Affine spatial transformations including rotation, 360° circle slices, horizontal/vertical flips, shear skewing, stepped zoom (30%, 60%, 90%), and occlusion with strict YOLO bounding-box coordinate recalculation and 5% area clipping.",
    route: "/tools/augmentation/task-2",
    isAssignedToUs: true,
    status: "active",
    statusLabel: "Active Workspace",
    color: "#3B82F6",
    icon: <Layers size={22} />,
    capabilities: [
      "YOLO Bbox Envelope",
      "360° Rotation",
      "Stepped Zoom Ruler",
      "Target Dataset Quota",
    ],
  },
  {
    id: "task-3",
    taskNumber: "Task 3",
    title: "YOLO Object Cropping & Background Pasting",
    subtitle: "Foreground Isolation & Scene Composition",
    description:
      "Extract annotated foreground objects using bounding box coordinates and composite them onto diverse background scenes with automated synthetic annotation generation and placement controls.",
    route: "/tools/augmentation/task-3",
    isAssignedToUs: true,
    status: "ready",
    statusLabel: "Workspace Ready",
    color: "#10B981",
    icon: <Crop size={22} />,
    capabilities: [
      "Object Extraction",
      "Foreground Masking",
      "Scene Composition",
      "Synthetic YOLO Generation",
    ],
  },
  {
    id: "task-4",
    taskNumber: "Task 4",
    title: "Class-Based PNG Object Pasting",
    subtitle: "Transparent Asset Synthesis",
    description:
      "Class-specific transparent PNG asset placement, multi-layer blending, scale jitter, and automated YOLO annotation generation for synthetic dataset expansion.",
    route: "/tools/augmentation/task-4",
    isAssignedToUs: false,
    status: "external",
    statusLabel: "Assigned to Team",
    color: "#F59E0B",
    icon: <ImagePlus size={22} />,
    capabilities: [
      "PNG Transparency",
      "Multi-Layer Blending",
      "Class Distribution",
      "Asset Stacking",
    ],
  },
];

export const AugmentationHub: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#27292D] text-[#E5E7EB] flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#2C2F34]/95 backdrop-blur-xs border-b border-[#454950] shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-xs">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[#E5E7EB] leading-tight tracking-tight">
                  Augmentation Studio
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/60">
                  Task Hub
                </span>
              </div>
              <p className="text-[11px] text-[#A5A9B0] leading-tight mt-0.5">
                Task-Based Augmentation Navigation &amp; Workspace Hub
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-[#A5A9B0] bg-[#27292D] px-3 py-1 rounded-full border border-[#454950]">
            <FolderTree size={13} className="text-blue-400" />
            <span>Select an isolated task container to open its workspace</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Hub Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Hub Body */}
      <main className="max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6 flex-1">
        {/* Scope Notice Banner */}
        <div className="bg-[#32353A] border border-[#454950] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-950/50 text-blue-400 flex items-center justify-center shrink-0 border border-blue-800/60 mt-0.5 sm:mt-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E5E7EB] leading-snug">
                Assigned Team Boundaries (Tasks 2 &amp; 3)
              </h2>
              <p className="text-xs text-[#A5A9B0] leading-relaxed mt-0.5">
                Our assignment owns <strong>Task 2</strong> (Geometric Augmentation) and <strong>Task 3</strong> (YOLO Object Cropping &amp; Pasting). Tasks 1 &amp; 4 are owned by other team members and remain untouched.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-[#8F949D] bg-[#27292D] px-2.5 py-1 rounded-md border border-[#454950]">
              Phase 0 Architecture
            </span>
          </div>
        </div>

        {/* Task Selection Section */}
        <div>
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-bold text-[#E5E7EB] tracking-tight">
              Augmentation Workspaces
            </h2>
            <p className="text-xs text-[#A5A9B0] mt-0.5">
              Click a task card below to enter its dedicated, isolated pipeline workspace.
            </p>
          </div>

          {/* 2 × 2 Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
            {AUGMENTATION_TASKS.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#8F949D] py-3.5 border-t border-[#454950] bg-[#2C2F34]/50">
        Utoolity Augmentation Hub • Local YOLO Dataset Processing • Modular Workspace Separation
      </footer>
    </div>
  );
};

export default AugmentationHub;
