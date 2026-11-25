"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Sliders, Lock, ArrowLeft } from "lucide-react";

export default function AugmentationTask1Page() {
  return (
    <div className="min-h-screen bg-[#27292D] text-[#E5E7EB] flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
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

            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-600 text-white shadow-xs">
              <Sliders size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[#E5E7EB] leading-tight tracking-tight">
                  AugmentStudio
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-700/60">
                  Task 1 — External Scope
                </span>
              </div>
              <p className="text-[11px] text-[#A5A9B0] leading-tight">
                Image Filtering Augmentations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#27292D] text-[#A5A9B0] px-2.5 py-1 rounded-full border border-[#454950]">
              <Lock size={12} className="text-[#6B7280]" />
              Assigned to other team members
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1000px] w-full mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center text-center gap-4 flex-1">
        <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-purple-400 flex items-center justify-center shadow-md">
          <Sliders size={28} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#E5E7EB]">
            Task 1 — Image Filtering Augmentations
          </h2>
          <p className="text-xs sm:text-sm text-[#A5A9B0] max-w-lg mt-1.5 leading-relaxed">
            This module is assigned to another team. Per project ownership boundaries, our implementation scope is restricted exclusively to Tasks 2 &amp; 3. This workspace container is preserved for the assigned team.
          </p>
        </div>

        <Link
          href="/tools/augmentation"
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#3C4046] hover:bg-[#454950] text-[#E5E7EB] border border-[#454950] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Augmentation Task Hub</span>
        </Link>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#8F949D] py-3.5 border-t border-[#454950] bg-[#2C2F34]/50">
        Utoolity Augmentation Hub • Task 1 Container (External Scope)
      </footer>
    </div>
  );
}
