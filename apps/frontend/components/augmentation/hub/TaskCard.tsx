"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import type { AugmentationTask } from "../types/hub.types";

interface TaskCardProps {
  task: AugmentationTask;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 select-none group relative overflow-hidden ${
        task.isAssignedToUs
          ? "bg-[#32353A] border-[#454950] hover:border-blue-500/80 hover:bg-[#36393F] shadow-sm hover:shadow-md hover:-translate-y-0.5"
          : "bg-[#2C2F34]/80 border-[#454950]/80 opacity-80 hover:opacity-100 hover:border-[#585E67]"
      }`}
    >
      {/* Top Header Row: Task Number & Status Tag */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-md tracking-wider uppercase shadow-xs"
              style={{
                backgroundColor: `${task.color}20`,
                color: task.color,
                border: `1px solid ${task.color}40`,
              }}
            >
              {task.taskNumber}
            </span>

            {task.isAssignedToUs ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-700/60">
                <CheckCircle2 size={11} className="text-emerald-400" />
                Our Assigned Scope
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#A5A9B0] bg-[#27292D] px-2 py-0.5 rounded-full border border-[#454950]">
                <Lock size={11} className="text-[#6B7280]" />
                External Team Scope
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-[#8F949D] uppercase tracking-wide">
            {task.statusLabel}
          </span>
        </div>

        {/* Icon & Title Row */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 shadow-xs"
            style={{
              backgroundColor: `${task.color}25`,
              color: task.color,
              border: `1px solid ${task.color}40`,
            }}
          >
            {task.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-[#E5E7EB] leading-tight group-hover:text-white transition-colors">
              {task.title}
            </h3>
            <p className="text-xs text-[#8F949D] font-medium mt-0.5 leading-tight">
              {task.subtitle}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-[#A5A9B0] leading-relaxed mb-4">
          {task.description}
        </p>

        {/* Capabilities Badges */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {task.capabilities.map((cap, i) => (
            <span
              key={i}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#27292D] text-[#A5A9B0] border border-[#454950]"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="pt-3 border-t border-[#454950] flex items-center justify-between">
        <span className="text-[11px] text-[#8F949D]">
          {task.isAssignedToUs
            ? "Dedicated Workspace Container"
            : "Reserved for assigned interns"}
        </span>

        <Link
          href={task.route}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
            task.isAssignedToUs
              ? "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-500 group-hover:shadow-blue-500/20"
              : "bg-[#3C4046] hover:bg-[#454950] text-[#E5E7EB] border border-[#454950]"
          }`}
        >
          <span>{task.isAssignedToUs ? "Open Workspace" : "View Container"}</span>
          <ArrowRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  );
};

export default TaskCard;
