"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { StatCard, Badge } from "./ui";
import type { VerifyGeometryResponseDto } from "../../api/augmentation.api";

interface Props {
  data: VerifyGeometryResponseDto | null;
}

export const GeometryDebugPanel: React.FC<Props> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!data) return null;

  const { dimensions, operation, summary, retentionDetails } = data;

  return (
    <div className="rounded-xl border border-[#454950] bg-[#32353A] overflow-hidden shadow-xs">
      {/* Header with collapse toggle */}
      <div
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#2C2F34] border-b border-[#454950] cursor-pointer select-none hover:bg-[#34373E] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown size={15} className="text-[#A5A9B0]" />
          ) : (
            <ChevronRight size={15} className="text-[#A5A9B0]" />
          )}
          <span className="text-xs font-semibold text-[#E5E7EB]">
            Geometry Verification & Synchronization Diagnostics
          </span>
          {dimensions.isConsistent ? (
            <Badge color="green" className="flex items-center gap-1">
              <CheckCircle2 size={11} /> Sharp & Geometry Consistent
            </Badge>
          ) : (
            <Badge color="red" className="flex items-center gap-1">
              <AlertTriangle size={11} /> Dimension Discrepancy
            </Badge>
          )}
        </div>

        <span className="text-[11px] text-[#A5A9B0]">
          {summary.retainedCount} of {summary.totalOriginal} boxes retained ({summary.thresholdPercentage}% rule)
        </span>
      </div>

      {isOpen && (
        <div className="p-3.5 flex flex-col gap-3.5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard
              label="Source Canvas"
              value={`${dimensions.source.width} × ${dimensions.source.height}`}
              subtext="pixels"
            />
            <StatCard
              label="Sharp Output Canvas"
              value={`${dimensions.actualTarget.width} × ${dimensions.actualTarget.height}`}
              subtext={dimensions.isConsistent ? "100% matched" : "diff detected"}
              color={dimensions.isConsistent ? "#10B981" : "#EF4444"}
            />
            <StatCard
              label="Effective Angle"
              value={
                operation.effectiveAngle > 0
                  ? `+${operation.effectiveAngle}°`
                  : `${operation.effectiveAngle}°`
              }
              subtext={operation.expandCanvas ? "expanded" : "fixed"}
              color="#3B82F6"
            />
            <StatCard
              label="Retention Status"
              value={`${summary.retainedCount} / ${summary.totalOriginal}`}
              subtext={
                summary.discardedCount > 0
                  ? `${summary.discardedCount} discarded (<5%)`
                  : "all retained"
              }
              alert={summary.discardedCount > 0}
              color="#10B981"
            />
          </div>

          {/* Detailed Bounding Box Retention & Clipping Table */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#A5A9B0] uppercase tracking-wider">
                Per-Box Visibility & Clipping Table
              </label>
              <span className="text-[10px] text-[#A5A9B0]">
                Retention ratio = Clipped Area / Pre-Clip Area (enforcing ≥ 5.0%)
              </span>
            </div>

            <div className="border border-[#454950] rounded-lg overflow-x-auto bg-[#27292D]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#454950] bg-[#32353A] text-[#A5A9B0] text-[10px] uppercase font-mono">
                    <th className="p-2">#</th>
                    <th className="p-2">Class</th>
                    <th className="p-2">Original (cx, cy, w, h)</th>
                    <th className="p-2">Transformed (cx, cy, w, h)</th>
                    <th className="p-2">Pre-Clip Area</th>
                    <th className="p-2">Clipped Area</th>
                    <th className="p-2">Retained %</th>
                    <th className="p-2">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3C4046] font-mono text-[11px]">
                  {retentionDetails.map((item) => {
                    const ratioPercent = (item.retentionRatio * 100).toFixed(2);
                    const orig = item.originalBox;
                    const trans = item.transformedBox;

                    return (
                      <tr
                        key={item.index}
                        className={`hover:bg-[#32353A]/60 transition-colors ${
                          !item.retained ? "bg-red-950/20 text-red-300" : ""
                        }`}
                      >
                        <td className="p-2 text-[#A5A9B0]">{item.index + 1}</td>
                        <td className="p-2">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-[#3C4046] text-[#E5E7EB]">
                            cls:{item.classId}
                          </span>
                        </td>
                        <td className="p-2 text-[#A5A9B0]">
                          ({orig.cx.toFixed(3)}, {orig.cy.toFixed(3)},{" "}
                          {orig.w.toFixed(3)}, {orig.h.toFixed(3)})
                        </td>
                        <td className="p-2">
                          {trans ? (
                            <span className="text-blue-300">
                              ({trans.cx.toFixed(3)}, {trans.cy.toFixed(3)},{" "}
                              {trans.w.toFixed(3)}, {trans.h.toFixed(3)})
                            </span>
                          ) : (
                            <span className="text-red-400 italic">null (discarded)</span>
                          )}
                        </td>
                        <td className="p-2 text-[#A5A9B0]">
                          {item.preClipAreaPx.toLocaleString()} px²
                        </td>
                        <td className="p-2 text-[#A5A9B0]">
                          {item.clippedAreaPx.toLocaleString()} px²
                        </td>
                        <td className="p-2 font-bold">
                          <span
                            className={
                              item.retained
                                ? item.retentionRatio < 0.999
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {ratioPercent}%
                          </span>
                        </td>
                        <td className="p-2">
                          {item.status === "retained" && (
                            <Badge color="green">RETAINED (100%)</Badge>
                          )}
                          {item.status === "clipped" && (
                            <Badge color="yellow">CLIPPED ({ratioPercent}%)</Badge>
                          )}
                          {item.status === "discarded" && (
                            <Badge color="red">DROP (&lt;5%)</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
